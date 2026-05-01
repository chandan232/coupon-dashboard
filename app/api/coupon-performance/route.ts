import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { COUPON_PERFORMANCE_SQL } from '@/lib/queries';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = COUPON_PERFORMANCE_SQL;

    // Add date filter if provided
    if (startDate && endDate) {
      sql = `
        SELECT
          o."code"                               AS coupon_name,
          o."code",
          COUNT(DISTINCT po."poNumber")::text AS usage_count,
          ROUND(
            COUNT(DISTINCT po."poNumber") * 100.0 / NULLIF(SUM(COUNT(DISTINCT po."poNumber")) OVER (), 0),
            2
          )::text                              AS usage_share_pct,
          ROUND(COALESCE(SUM(po."appliedOfferDiscount"), 0) / NULLIF(COUNT(DISTINCT po."poNumber"), 0), 2)::text AS avg_coupon_pct,
          ROUND(COALESCE(SUM(po."appliedOfferDiscount"), 0), 2)::text AS total_discount_burn,
          ROUND(COALESCE(SUM(po."amount"), 0), 2)::text AS total_revenue,
          ROUND(COALESCE(AVG(po."amount"), 0), 2)::text AS avg_order_value,
          ROUND((SUM(COALESCE(po."appliedOfferDiscount", 0)) * 100.0) / NULLIF(SUM(po."amount"), 0), 2)::text AS discount_pct_of_revenue
        FROM "promotions"."offer" o
        JOIN "promotions"."offerReservation" cor ON cor."offerId" = o."id" AND cor."status" = 'APPLIED'
        JOIN "purchaseOrder"."purchaseOrder" po ON po."id" = cor."purchaseOrderId"
        JOIN "users"."buyer" b ON b."id" = po."buyerId"
        LEFT JOIN "users"."seller" s ON s."id" = po."sellerId"
        WHERE o."isTest" = FALSE
          AND po."isTest" = FALSE
          AND po."isFalseOrder" = FALSE
          AND b."isTest" = FALSE
          AND b."businessName" NOT ILIKE '%test%'
          AND (s."isTest" = FALSE OR s."id" IS NULL)
          AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL)
          AND po."markedPendingTime"::date >= $1 AND po."markedPendingTime"::date <= $2
        GROUP BY o."id", o."code"
        ORDER BY SUM(po."appliedOfferDiscount") DESC
        LIMIT 50;
      `;
      const rows = await query(sql, [startDate, endDate]);
      return NextResponse.json({ data: rows });
    }

    const rows = await query(COUPON_PERFORMANCE_SQL);
    return NextResponse.json({ data: rows });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
