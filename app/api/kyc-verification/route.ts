import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// KYC Verification datasource.
//
// The underlying table (businessVerification.userBusinessVerification) has
// ~40k rows, so every read is filtered + paginated server-side. The status
// column is messy in production — VERIFIED / 'VERIFIED ' / RESUBMIT / FAILED /
// REJECTED / PENDING / IN-PROGRESS — so we normalise with TRIM(UPPER(...)) and
// fold it into four UI buckets: approved / rejected / pending / resubmit.
// ---------------------------------------------------------------------------

const NORM = `TRIM(UPPER(ub."status"))`;

// UI bucket -> set of normalised raw statuses
const STATUS_BUCKETS: Record<string, string[]> = {
  approved: ['VERIFIED'],
  rejected: ['FAILED', 'REJECTED'],
  pending: ['PENDING', 'IN-PROGRESS'],
  resubmit: ['RESUBMIT'],
};

type Filters = {
  from?: string;
  to?: string;
  phone?: string;
  name?: string;
  employee?: string;
  label?: string;
  search?: string;
};

// Resolve the "Today / Yesterday / Last 7 / Last 30 / Custom" presets into an
// explicit [from, to] window (IST-naive — created_at is timestamptz, the BETWEEN
// is inclusive of the day boundaries the user picked).
function resolveRange(range: string | null, from: string | null, to: string | null) {
  if (range === 'custom') return { from: from || undefined, to: to || undefined };
  if (!range || range === 'all') return {};
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const d = (offsetDays: number) => {
    const x = new Date(now);
    x.setDate(x.getDate() - offsetDays);
    return x.toISOString().slice(0, 10);
  };
  switch (range) {
    case 'today':
      return { from: end, to: end };
    case 'yesterday':
      return { from: d(1), to: d(1) };
    case '7d':
      return { from: d(6), to: end };
    case '30d':
      return { from: d(29), to: end };
    default:
      return {};
  }
}

// Build a parameterised WHERE clause from the active filters. Shared by the
// data query, the total count, and the KPI aggregate so they never drift.
function buildWhere(f: Filters, params: unknown[], opts: { includeStatusBucket?: string } = {}) {
  const where: string[] = [`ub."buyerId" IS NOT NULL`, `b."isTest" = false`];

  if (f.from) {
    params.push(f.from);
    where.push(`ub."created_at" >= ($${params.length})::date`);
  }
  if (f.to) {
    params.push(f.to);
    where.push(`ub."created_at" < (($${params.length})::date + INTERVAL '1 day')`);
  }
  if (f.phone) {
    params.push(`%${f.phone.trim()}%`);
    where.push(`b."phone" ILIKE $${params.length}`);
  }
  if (f.name) {
    params.push(`%${f.name.trim()}%`);
    where.push(`(b."name" ILIKE $${params.length} OR b."businessName" ILIKE $${params.length})`);
  }
  if (f.employee) {
    params.push(`%${f.employee.trim()}%`);
    where.push(`(e."name" ILIKE $${params.length} OR e."phoneNumber" ILIKE $${params.length})`);
  }
  if (f.label) {
    params.push(`%${f.label.trim()}%`);
    where.push(`bv."label" ILIKE $${params.length}`);
  }
  if (f.search) {
    params.push(`%${f.search.trim()}%`);
    const i = params.length;
    where.push(
      `(b."businessName" ILIKE $${i} OR b."name" ILIKE $${i} OR b."phone" ILIKE $${i} ` +
        `OR b.city ILIKE $${i} OR b.state ILIKE $${i} OR b.district ILIKE $${i} ` +
        `OR e."name" ILIKE $${i} OR bv."label" ILIKE $${i})`,
    );
  }
  if (opts.includeStatusBucket && STATUS_BUCKETS[opts.includeStatusBucket]) {
    const set = STATUS_BUCKETS[opts.includeStatusBucket].map((s) => {
      params.push(s);
      return `$${params.length}`;
    });
    where.push(`${NORM} IN (${set.join(', ')})`);
  }
  return where.join('\n      AND ');
}

const SORTABLE: Record<string, string> = {
  created_at: 'ub."created_at"',
  businessName: 'b."businessName"',
  name: 'b."name"',
  phone: 'b."phone"',
  city: 'b.city',
  state: 'b.state',
  district: 'b.district',
  pincode: 'b.pincode',
  employee: 'e."name"',
  label: 'bv."label"',
  status: 'ub."status"',
};

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const { from, to } = resolveRange(sp.get('range'), sp.get('from'), sp.get('to'));
    const filters: Filters = {
      from,
      to,
      phone: sp.get('phone') || undefined,
      name: sp.get('name') || undefined,
      employee: sp.get('employee') || undefined,
      label: sp.get('label') || undefined,
      search: sp.get('search') || undefined,
    };
    const statusBucket = sp.get('status') || undefined; // approved|rejected|pending|resubmit

    const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
    const pageSize = Math.min(200, Math.max(10, parseInt(sp.get('pageSize') || '25', 10)));
    const offset = (page - 1) * pageSize;

    const sortKey = sp.get('sortBy') || 'created_at';
    const sortCol = SORTABLE[sortKey] || SORTABLE.created_at;
    const sortDir = (sp.get('sortDir') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const FROM = `
      "businessVerification"."userBusinessVerification" AS ub
      JOIN "users"."buyer" AS b ON b."id" = ub."buyerId"
      JOIN "master"."businessVerification" AS bv ON bv."id" = ub."businessVerificationId"
      JOIN "employeeBase"."employee" AS e ON e."employeeId" = b."employeeId"`;

    // ---- data page -------------------------------------------------------
    const dataParams: unknown[] = [];
    const dataWhere = buildWhere(filters, dataParams, { includeStatusBucket: statusBucket });
    dataParams.push(pageSize, offset);
    const dataSql = `
      SELECT
        ub."id" AS "verificationId",
        to_char(ub."created_at", 'YYYY-MM-DD HH12:MI:SS AM') AS created_at,
        ub."buyerId",
        b."businessName",
        b."phone",
        b."name",
        b."addressLine1",
        b.city,
        b.state,
        b.district,
        b.pincode,
        e."name" AS "assignedEmployee",
        e."phoneNumber" AS "employeePhone",
        ub."formData"->'imageUrl'->>0 AS "imageUrl1",
        ub."formData"->'imageUrl'->>1 AS "imageUrl2",
        ub."formData"->'videoUrl'->>0 AS "videoUrl",
        ub."status",
        ub."response"->>'message' AS message,
        bv."label"
      FROM ${FROM}
      WHERE ${dataWhere}
      ORDER BY ${sortCol} ${sortDir} NULLS LAST
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};`;

    // ---- total (respects status bucket) ----------------------------------
    const countParams: unknown[] = [];
    const countWhere = buildWhere(filters, countParams, { includeStatusBucket: statusBucket });
    const countSql = `SELECT count(*)::int AS total FROM ${FROM} WHERE ${countWhere}`;

    // ---- KPIs (ignore the status bucket so the cards always show the full
    //      breakdown for the current date/text filters) ---------------------
    const kpiParams: unknown[] = [];
    const kpiWhere = buildWhere(filters, kpiParams);
    const kpiSql = `
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE ${NORM} = 'VERIFIED')::int AS approved,
        count(*) FILTER (WHERE ${NORM} IN ('FAILED','REJECTED'))::int AS rejected,
        count(*) FILTER (WHERE ${NORM} IN ('PENDING','IN-PROGRESS'))::int AS pending,
        count(*) FILTER (WHERE ${NORM} = 'RESUBMIT')::int AS resubmit
      FROM ${FROM}
      WHERE ${kpiWhere}`;

    const [rows, countRows, kpiRows] = await Promise.all([
      query(dataSql, dataParams),
      query<{ total: number }>(countSql, countParams),
      query<{ total: number; approved: number; rejected: number; pending: number; resubmit: number }>(
        kpiSql,
        kpiParams,
      ),
    ]);

    const total = countRows[0]?.total ?? 0;
    return NextResponse.json({
      rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      kpis: kpiRows[0] ?? { total: 0, approved: 0, rejected: 0, pending: 0, resubmit: 0 },
    });
  } catch (err) {
    console.error('KYC verification query error:', err);
    return NextResponse.json(
      { error: 'Failed to load KYC verifications', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
