import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { MANAGEMENT_METRICS_SQL } from '@/lib/queries';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = MANAGEMENT_METRICS_SQL;

    // Add date filter if provided
    if (startDate && endDate) {
      sql = `
        SELECT
          COUNT(*) FILTER (WHERE o."isActive" = true AND o."expiryTime" > NOW())  AS live_count,
          COUNT(*) FILTER (WHERE o."isActive" = true AND o."activationTime" > NOW()) AS scheduled_count,
          COUNT(*) FILTER (WHERE o."isActive" = false OR o."expiryTime" <= NOW()) AS expired_count,
          COUNT(*) FILTER (WHERE o."isTest" = false)                            AS active_real_count,
          COUNT(*)                                                              AS total_count,
          ROUND(AVG(COALESCE(po."appliedOfferDiscount", 0)), 2)                                   AS avg_usage,
          ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2)                                   AS total_uses,
          ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2) AS total_discount_percentage,
          COUNT(DISTINCT po."poNumber")::text AS applied_count,
          ROUND(SUM(po."appliedOfferDiscount"), 2)::text AS total_discount_burn,
          ROUND(SUM(po."amount"), 2)::text AS total_revenue,
          ROUND((SUM(COALESCE(po."appliedOfferDiscount", 0)) * 100.0) / NULLIF(SUM(po."amount"), 0), 2)::text AS conversion_rate
        FROM "promotions"."offer" o
        LEFT JOIN "promotions"."offerReservation" cor ON cor."offerId" = o."id" AND cor."status" = 'APPLIED'
        LEFT JOIN "purchaseOrder"."purchaseOrder" po ON po."id" = cor."purchaseOrderId" AND po."isTest" = FALSE AND po."isFalseOrder" = FALSE
        LEFT JOIN "users"."buyer" b ON b."id" = po."buyerId"
        LEFT JOIN "users"."seller" s ON s."id" = po."sellerId"
        WHERE o."isTest" = FALSE
          AND (b."isTest" = FALSE AND b."businessName" NOT ILIKE '%test%' OR b."id" IS NULL)
          AND (s."isTest" = FALSE AND s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL)
          AND (po."markedPendingTime"::date >= $1 AND po."markedPendingTime"::date <= $2 OR po."markedPendingTime" IS NULL);
      `;
      const rows = await query(sql, [startDate, endDate]);
      return NextResponse.json({ data: rows[0] ?? {} });
    }

    const rows = await query(sql);
    return NextResponse.json({ data: rows[0] ?? {} });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
