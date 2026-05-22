import { NextResponse, NextRequest } from 'next/server';
import { queryCached } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 300s cache — buyer trend chart, 15-day window.
const TTL_SECONDS = 300;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // ILIKE '%test%' dropped; isTest flag does the job and keeps indexes intact.
    let sql = `
      SELECT
        po."markedPendingTime"::date AS "date",
        COUNT(DISTINCT po."id")::text AS "orders_with_coupons",
        COUNT(DISTINCT CASE WHEN a."status" = 'APPLIED' THEN po."buyerId" END)::text AS "unique_buyers_applied_coupons"
      FROM "purchaseOrder"."purchaseOrder" po
      JOIN "promotions"."offerReservation" a ON po."id" = a."purchaseOrderId"
      JOIN "users"."buyer" b ON po."buyerId" = b."id" AND b."isTest" = FALSE
      WHERE a."status" = 'APPLIED'
        AND po."isTest" = FALSE
        AND po."isFalseOrder" = FALSE
        AND po."markedPendingTime" IS NOT NULL
    `;
    const params: unknown[] = [];

    if (startDate && endDate) {
      sql += `
        AND po."markedPendingTime" >= $1::timestamp
        AND po."markedPendingTime" <  ($2::timestamp + INTERVAL '1 day')
        GROUP BY 1
        ORDER BY 1 DESC;
      `;
      params.push(startDate, endDate);
    } else {
      sql += `
        AND po."markedPendingTime" >= CURRENT_DATE - INTERVAL '15 days'
        AND po."markedPendingTime" <  CURRENT_DATE + INTERVAL '1 day'
        GROUP BY 1
        ORDER BY 1 DESC;
      `;
    }

    const rows = await queryCached(sql, params, TTL_SECONDS);
    return NextResponse.json(
      { data: rows },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
