import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

interface OrderStatusRow {
  status: string;
  count: string;
  pct: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Default to current year (Jan 1 - Dec 31)
  const currentYear = new Date().getFullYear();
  const defaultStart = `${currentYear}-01-01`;
  const defaultEnd = `${currentYear}-12-31`;

  const startDate = searchParams.get('startDate') || defaultStart;
  const endDate = searchParams.get('endDate') || defaultEnd;

  try {
    const sql = `
      WITH filtered AS (
        SELECT po."status"
        FROM "purchaseOrder"."purchaseOrder" po
        JOIN "users"."buyer" b ON b."id" = po."buyerId"
        JOIN "users"."seller" s ON s."id" = po."sellerId"
        WHERE po."isTest" = FALSE
          AND po."isFalseOrder" = FALSE
          AND b."isTest" = FALSE
          AND b."businessName" NOT ILIKE '%test%'
          AND s."isTest" = FALSE
          AND s."businessName" NOT ILIKE '%test%'
          AND s."isD2RBrandSeller" = TRUE
          AND po."status" != 'DRAFT'
          AND po."created_at"::date >= $1
          AND po."created_at"::date <= $2
      )
      SELECT
        "status" AS status,
        COUNT(*) AS count,
        ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM filtered), 0), 2) AS pct
      FROM filtered
      GROUP BY "status"
      ORDER BY count DESC;
    `;

    const rows = await query<OrderStatusRow>(sql, [startDate, endDate]);

    const formatted = rows.map(r => ({
      status: r.status,
      count: parseInt(r.count),
      percentage: parseFloat(r.pct),
    }));

    return NextResponse.json({
      data: formatted,
      total: formatted.reduce((sum, row) => sum + row.count, 0),
      dateRange: { startDate, endDate },
      year: currentYear,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
