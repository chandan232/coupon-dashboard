import { NextResponse, NextRequest } from 'next/server';
import { queryCached } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 300s cache — trend chart over the last 15+ days; rarely changes between
// page loads. Caching dramatically reduces DB pressure for this 5-way join.
const TTL_SECONDS = 300;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // No more ILIKE '%test%' on businessName — relies on isTest flag,
    // which is the canonical test-account marker. Indexed range comparison
    // instead of ::date cast so the markedPendingTime index can be used.
    let sql = `
      SELECT
        po."markedPendingTime"::date AS "Date",
        COUNT(DISTINCT po."poNumber")::text AS "total_orders",
        COUNT(DISTINCT CASE WHEN po."appliedOfferReservationId" IS NOT NULL AND o."isTest" = FALSE THEN po."poNumber" END)::text AS "coupon_driven_orders",
        COUNT(DISTINCT CASE WHEN po."appliedOfferReservationId" IS NULL THEN po."poNumber" END)::text AS "no_coupon_orders"
      FROM "purchaseOrder"."purchaseOrder" po
      JOIN "users"."buyer"  b ON po."buyerId" = b."id" AND b."isTest" = FALSE
      LEFT JOIN "users"."seller" s ON s."id" = po."sellerId" AND s."isTest" = FALSE
      LEFT JOIN "promotions"."offerReservation" cor ON cor."id" = po."appliedOfferReservationId"
      LEFT JOIN "promotions"."offer" o ON o."id" = cor."offerId"
      WHERE po."status" NOT IN ('DRAFT', 'CANCELLED', 'REJECTED')
        AND po."isTest" = FALSE
        AND po."isFalseOrder" = FALSE
        AND po."deliveryType" = 'INTERCITY'
        AND po."deliveryNetwork" = 'THIRD_PARTY'
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
