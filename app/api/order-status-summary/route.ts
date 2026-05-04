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
      SELECT
        b."status" AS status,
        COUNT(*) AS count,
        ROUND(
          COUNT(*) * 100.0 / NULLIF((
            SELECT COUNT(*)
            FROM "purchaseOrder"."purchaseOrder"
            WHERE "isTest" = FALSE
              AND "isFalseOrder" = FALSE
              AND "created_at"::date >= $1
              AND "created_at"::date <= $2
          ), 0),
        2) AS pct
      FROM "purchaseOrder"."purchaseOrder" b
      WHERE b."isTest" = FALSE
        AND b."isFalseOrder" = FALSE
        AND b."created_at"::date >= $1
        AND b."created_at"::date <= $2
      GROUP BY b."status"
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
