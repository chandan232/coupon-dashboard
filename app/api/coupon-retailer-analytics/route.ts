import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    let dateFilter = '';
    const params: any[] = [];

    if (startDate && endDate) {
      params.push(startDate, endDate);
      dateFilter = ` AND po."created_at"::date >= $1 AND po."created_at"::date <= $2`;
    }

    // 1. Retailer-wise applied coupons
    const retailerData = await query<any>(`
      SELECT
        s."businessName" AS retailer_name,
        s."phone" AS retailer_phone,
        COUNT(DISTINCT a."id") AS applied_coupons_count,
        COUNT(DISTINCT po."id") AS total_orders,
        ROUND(SUM(CAST(po."appliedOfferDiscount" AS numeric)), 2) AS total_discount_applied,
        ROUND(SUM(CAST(po."amount" AS numeric)), 2) AS total_order_value
      FROM "promotions"."offerReservation" a
      JOIN "purchaseOrder"."purchaseOrder" po ON po."id" = a."purchaseOrderId"
      JOIN "users"."seller" s ON s."id" = po."sellerId"
      WHERE a."status" = 'APPLIED'
        AND po."isTest" = FALSE
        AND po."isFalseOrder" = FALSE
        AND s."isTest" = FALSE
        ${dateFilter}
      GROUP BY s."id", s."businessName", s."phone"
      ORDER BY applied_coupons_count DESC
      LIMIT 50
    `, params);

    // 2. Buyer conversion metrics
    const buyerMetrics = await query<any>(`
      SELECT
        COUNT(DISTINCT b."id") AS total_unique_buyers_with_applied_coupons,
        COUNT(DISTINCT po."id") AS total_orders_with_applied_coupons,
        COUNT(DISTINCT o."id") AS total_coupons_used,
        ROUND(AVG(CAST(po."appliedOfferDiscount" AS numeric)), 2) AS avg_discount_per_order,
        ROUND(SUM(CAST(po."appliedOfferDiscount" AS numeric)), 2) AS total_discount_value,
        ROUND(SUM(CAST(po."amount" AS numeric)), 2) AS total_order_value,
        ROUND(COUNT(DISTINCT po."id") * 100.0 / NULLIF(
          (SELECT COUNT(DISTINCT "id") FROM "purchaseOrder"."purchaseOrder"
           WHERE "isTest" = FALSE AND "isFalseOrder" = FALSE ${dateFilter.replace('po.', '')}), 0
        ), 2) AS coupon_adoption_rate,
        (SELECT COUNT(DISTINCT "id") FROM "purchaseOrder"."purchaseOrder"
         WHERE "isTest" = FALSE AND "isFalseOrder" = FALSE ${dateFilter.replace('po.', '')}) AS total_all_buyers,
        (SELECT COUNT(DISTINCT b2."id") FROM "users"."buyer" b2
         WHERE b2."isTest" = FALSE AND b2."businessName" NOT ILIKE '%test%') AS total_all_unique_buyers
      FROM "promotions"."offerReservation" a
      JOIN "purchaseOrder"."purchaseOrder" po ON po."id" = a."purchaseOrderId"
      JOIN "users"."buyer" b ON b."id" = po."buyerId"
      JOIN "promotions"."offer" o ON o."id" = a."offerId"
      WHERE a."status" = 'APPLIED'
        AND po."isTest" = FALSE
        AND po."isFalseOrder" = FALSE
        AND b."isTest" = FALSE
        AND b."businessName" NOT ILIKE '%test%'
        ${dateFilter}
    `, params);

    // 3. Top buyers by coupon usage
    const topBuyers = await query<any>(`
      SELECT
        b."businessName" AS buyer_business_name,
        b."phone" AS buyer_phone,
        COUNT(DISTINCT a."id") AS coupons_applied_count,
        COUNT(DISTINCT po."id") AS orders_count,
        ROUND(SUM(CAST(po."appliedOfferDiscount" AS numeric)), 2) AS total_discount_saved,
        ROUND(SUM(CAST(po."amount" AS numeric)), 2) AS total_order_value,
        ROUND((SUM(CAST(po."appliedOfferDiscount" AS numeric)) * 100.0) / NULLIF(SUM(CAST(po."amount" AS numeric)), 0), 2) AS coupon_percentage
      FROM "promotions"."offerReservation" a
      JOIN "purchaseOrder"."purchaseOrder" po ON po."id" = a."purchaseOrderId"
      JOIN "users"."buyer" b ON b."id" = po."buyerId"
      WHERE a."status" = 'APPLIED'
        AND po."isTest" = FALSE
        AND po."isFalseOrder" = FALSE
        AND b."isTest" = FALSE
        AND b."businessName" NOT ILIKE '%test%'
        ${dateFilter}
      GROUP BY b."id", b."businessName", b."phone"
      ORDER BY coupons_applied_count DESC
      LIMIT 20
    `, params);

    return NextResponse.json({
      retailer_wise: retailerData,
      buyer_metrics: buyerMetrics[0] || {},
      top_buyers: topBuyers,
    });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    console.error('Retailer analytics error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
