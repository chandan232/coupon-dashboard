import { NextResponse, NextRequest } from 'next/server';
import { queryCached } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 180s cache — this endpoint runs THREE separate heavy aggregations on the
// same join tree. Caching the combined result has the biggest single-endpoint
// impact in this codebase.
const TTL_SECONDS = 180;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    // Index-safe date range using >= and < instead of ::date cast.
    // Bind a default 90-day floor so unbounded calls don't scan history.
    let dateFilter = ` AND po."markedPendingTime" >= NOW() - INTERVAL '90 days'`;
    const params: unknown[] = [];
    if (startDate && endDate) {
      params.push(startDate, endDate);
      dateFilter = ` AND po."markedPendingTime" >= $1::timestamp AND po."markedPendingTime" < ($2::timestamp + INTERVAL '1 day')`;
    }

    // 1. Retailer-wise applied coupons (top 50 sellers by coupon usage)
    const retailerSql = `
      SELECT
        s."businessName" AS retailer_name,
        s."phone"        AS retailer_phone,
        COUNT(DISTINCT a."id")  AS applied_coupons_count,
        COUNT(DISTINCT po."id") AS total_orders,
        ROUND(SUM(CAST(po."appliedOfferDiscount" AS numeric)), 2) AS total_discount_applied,
        ROUND(SUM(CAST(po."amount" AS numeric)), 2)               AS total_order_value
      FROM "promotions"."offerReservation" a
      JOIN "purchaseOrder"."purchaseOrder" po
           ON po."id" = a."purchaseOrderId"
          AND po."isTest" = FALSE
          AND po."isFalseOrder" = FALSE
          ${dateFilter}
      JOIN "users"."seller" s ON s."id" = po."sellerId" AND s."isTest" = FALSE
      WHERE a."status" = 'APPLIED'
        AND s."businessName" NOT ILIKE '%test%'
      GROUP BY s."id", s."businessName", s."phone"
      ORDER BY applied_coupons_count DESC
      LIMIT 50;
    `;

    // 2. Buyer conversion metrics (single-row summary)
    // Note: the previous query had two correlated subqueries that
    // re-scanned the entire orders table. Replaced with a single window
    // aggregation that reuses the already-filtered set.
    const buyerMetricsSql = `
      WITH coupon_orders AS (
        SELECT po."id"  AS po_id,
               b."id"   AS buyer_id,
               o."id"   AS offer_id,
               po."appliedOfferDiscount",
               po."amount"
        FROM "promotions"."offerReservation" a
        JOIN "purchaseOrder"."purchaseOrder" po
             ON po."id" = a."purchaseOrderId"
            AND po."isTest" = FALSE
            AND po."isFalseOrder" = FALSE
            ${dateFilter}
        JOIN "users"."buyer"  b ON b."id" = po."buyerId" AND b."isTest" = FALSE
        JOIN "promotions"."offer" o ON o."id" = a."offerId"
        WHERE a."status" = 'APPLIED'
          AND b."businessName" NOT ILIKE '%test%'
      ),
      all_orders AS (
        SELECT COUNT(DISTINCT po."id") AS total_orders
        FROM "purchaseOrder"."purchaseOrder" po
        WHERE po."isTest" = FALSE AND po."isFalseOrder" = FALSE
          ${dateFilter}
      )
      SELECT
        COUNT(DISTINCT co.buyer_id)              AS total_unique_buyers_with_applied_coupons,
        COUNT(DISTINCT co.po_id)                 AS total_orders_with_applied_coupons,
        COUNT(DISTINCT co.offer_id)              AS total_coupons_used,
        ROUND(AVG(CAST(co."appliedOfferDiscount" AS numeric)), 2) AS avg_discount_per_order,
        ROUND(SUM(CAST(co."appliedOfferDiscount" AS numeric)), 2) AS total_discount_value,
        ROUND(SUM(CAST(co."amount" AS numeric)), 2)               AS total_order_value,
        ROUND(COUNT(DISTINCT co.po_id) * 100.0 / NULLIF((SELECT total_orders FROM all_orders), 0), 2) AS coupon_adoption_rate,
        (SELECT total_orders FROM all_orders)    AS total_all_buyers
      FROM coupon_orders co;
    `;

    // 3. Top buyers by coupon usage (top 20)
    const topBuyersSql = `
      SELECT
        b."businessName" AS buyer_business_name,
        b."phone"        AS buyer_phone,
        COUNT(DISTINCT a."id")  AS coupons_applied_count,
        COUNT(DISTINCT po."id") AS orders_count,
        ROUND(SUM(CAST(po."appliedOfferDiscount" AS numeric)), 2) AS total_discount_saved,
        ROUND(SUM(CAST(po."amount" AS numeric)), 2)               AS total_order_value,
        ROUND((SUM(CAST(po."appliedOfferDiscount" AS numeric)) * 100.0)
              / NULLIF(SUM(CAST(po."amount" AS numeric)), 0), 2)  AS coupon_percentage
      FROM "promotions"."offerReservation" a
      JOIN "purchaseOrder"."purchaseOrder" po
           ON po."id" = a."purchaseOrderId"
          AND po."isTest" = FALSE
          AND po."isFalseOrder" = FALSE
          ${dateFilter}
      JOIN "users"."buyer" b ON b."id" = po."buyerId" AND b."isTest" = FALSE
      WHERE a."status" = 'APPLIED'
        AND b."businessName" NOT ILIKE '%test%'
      GROUP BY b."id", b."businessName", b."phone"
      ORDER BY coupons_applied_count DESC
      LIMIT 20;
    `;

    const [retailerData, buyerMetrics, topBuyers] = await Promise.all([
      queryCached<any>(retailerSql, params, TTL_SECONDS),
      queryCached<any>(buyerMetricsSql, params, TTL_SECONDS),
      queryCached<any>(topBuyersSql, params, TTL_SECONDS),
    ]);

    return NextResponse.json(
      {
        retailer_wise: retailerData,
        buyer_metrics: buyerMetrics[0] || {},
        top_buyers: topBuyers,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    console.error('Retailer analytics error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
