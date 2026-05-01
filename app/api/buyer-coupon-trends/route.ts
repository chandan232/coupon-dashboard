import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = `
      SELECT
        po."markedPendingTime"::date AS "date",
        COUNT(DISTINCT po."id")::text AS "orders_with_coupons",
        COUNT(DISTINCT CASE WHEN a."status" = 'APPLIED' THEN po."buyerId" END)::text AS "unique_buyers_applied_coupons"
      FROM "purchaseOrder"."purchaseOrder" po
      JOIN "promotions"."offerReservation" a ON po."id" = a."purchaseOrderId"
      JOIN "users"."buyer" b ON po."buyerId" = b."id"
      WHERE
        a."status" = 'APPLIED'
        AND po."isTest" = FALSE
        AND po."isFalseOrder" = FALSE
        AND b."isTest" = FALSE
        AND b."businessName" NOT ILIKE '%test%'
        AND po."markedPendingTime" IS NOT NULL
    `;

    // Add date filter if provided
    if (startDate && endDate) {
      sql += `
        AND po."markedPendingTime"::date >= $1
        AND po."markedPendingTime"::date <= $2
      `;
      sql += `
        GROUP BY 1
        ORDER BY 1 DESC;
      `;
      const rows = await query(sql, [startDate, endDate]);
      return NextResponse.json({ data: rows });
    }

    sql += `
      AND po."markedPendingTime" >= CURRENT_DATE - INTERVAL '15 days'
      AND po."markedPendingTime" < CURRENT_DATE + INTERVAL '1 day'
      GROUP BY 1
      ORDER BY 1 DESC;
    `;
    const rows = await query(sql);
    return NextResponse.json({ data: rows });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
