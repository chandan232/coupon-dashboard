import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

interface OrderStatusRow {
  status: string;
  count: string;
  pct: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    let sql = `
      SELECT
        b."status" AS status,
        COUNT(*) AS count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "purchaseOrder"."purchaseOrder" ${startDate && endDate ? `WHERE "created_at"::date >= $1 AND "created_at"::date <= $2` : 'WHERE "isTest" = FALSE AND "isFalseOrder" = FALSE'}), 2) AS pct
      FROM "purchaseOrder"."purchaseOrder" b
      WHERE b."isTest" = FALSE
        AND b."isFalseOrder" = FALSE
        ${startDate && endDate ? `AND b."created_at"::date >= $1 AND b."created_at"::date <= $2` : ''}
      GROUP BY b."status"
      ORDER BY count DESC;
    `;

    const params: (string | number)[] = [];
    if (startDate && endDate) {
      params.push(startDate, endDate);
    }

    const rows = await query<OrderStatusRow>(sql, params);

    const formatted = rows.map(r => ({
      status: r.status,
      count: parseInt(r.count),
      percentage: parseFloat(r.pct),
    }));

    return NextResponse.json({
      data: formatted,
      total: formatted.reduce((sum, row) => sum + row.count, 0),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
