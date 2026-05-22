import { NextResponse, NextRequest } from 'next/server';
import { queryCached } from '@/lib/db';
import { COUPON_PERFORMANCE_SQL } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 120s cache — coupon performance is an expensive 5-way aggregate over
// the order history. 2-minute freshness is fine for dashboard display and
// is a major DB-load reduction under heavy traffic.
const TTL_SECONDS = 120;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = COUPON_PERFORMANCE_SQL;
    const params: unknown[] = [];

    if (startDate && endDate) {
      // Use indexed range comparison (no ::date cast) so the index on
      // purchaseOrder.markedPendingTime can be used. Test-account filtering
      // is done via the isTest boolean (not ILIKE '%test%') for index safety.
      sql = `
        SELECT
          o."code"                               AS coupon_name,
          o."code",
          COUNT(DISTINCT po."poNumber")::text   AS usage_count,
          ROUND(
            COUNT(DISTINCT po."poNumber") * 100.0
              / NULLIF(SUM(COUNT(DISTINCT po."poNumber")) OVER (), 0),
            2
          )::text                                AS usage_share_pct,
          ROUND(COALESCE(SUM(po."appliedOfferDiscount"), 0)
                / NULLIF(COUNT(DISTINCT po."poNumber"), 0), 2)::text AS avg_coupon_pct,
          ROUND(COALESCE(SUM(po."appliedOfferDiscount"), 0), 2)::text  AS total_discount_burn,
          ROUND(COALESCE(SUM(po."amount"), 0), 2)::text                AS total_revenue,
          ROUND(COALESCE(AVG(po."amount"), 0), 2)::text                AS avg_order_value,
          ROUND((SUM(COALESCE(po."appliedOfferDiscount", 0)) * 100.0)
                / NULLIF(SUM(po."amount"), 0), 2)::text                AS discount_pct_of_revenue
        FROM "promotions"."offer" o
        JOIN "promotions"."offerReservation" cor
             ON cor."offerId" = o."id" AND cor."status" = 'APPLIED'
        JOIN "purchaseOrder"."purchaseOrder" po
             ON po."id" = cor."purchaseOrderId"
            AND po."isTest" = FALSE
            AND po."isFalseOrder" = FALSE
            AND po."markedPendingTime" >= $1::timestamp
            AND po."markedPendingTime" <  ($2::timestamp + INTERVAL '1 day')
        JOIN "users"."buyer"  b ON b."id" = po."buyerId"  AND b."isTest" = FALSE
        LEFT JOIN "users"."seller" s ON s."id" = po."sellerId" AND s."isTest" = FALSE
        WHERE o."isTest" = FALSE
          AND o."type" = 'COUPON'
          AND b."businessName" NOT ILIKE '%test%'
          AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL)
        GROUP BY o."id", o."code"
        ORDER BY SUM(po."appliedOfferDiscount") DESC
        LIMIT 50;
      `;
      params.push(startDate, endDate);
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
