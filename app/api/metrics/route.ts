import { NextResponse, NextRequest } from 'next/server';
import { queryCached } from '@/lib/db';
import { MANAGEMENT_METRICS_SQL } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 60s cache: metrics aggregate over millions of order rows. 1-minute
// freshness is fine and prevents this query from running per page-load.
const TTL_SECONDS = 60;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build the SQL once. The base MANAGEMENT_METRICS_SQL already filters
    // out test buyers/sellers and has a 90-day order floor; date params
    // override that floor with the explicit user range.
    let sql = MANAGEMENT_METRICS_SQL;
    const params: unknown[] = [];

    if (startDate && endDate) {
      sql = `
        SELECT
          COUNT(*) FILTER (WHERE o."isActive" = true AND o."expiryTime" > NOW())    AS live_count,
          COUNT(*) FILTER (WHERE o."isActive" = true AND o."activationTime" > NOW()) AS scheduled_count,
          COUNT(*) FILTER (WHERE o."isActive" = false OR o."expiryTime" <= NOW())   AS expired_count,
          COUNT(*) FILTER (WHERE o."isTest" = false)                                AS active_real_count,
          COUNT(*)                                                                  AS total_count,
          ROUND(AVG(COALESCE(po."appliedOfferDiscount", 0)), 2)                     AS avg_usage,
          ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2)                     AS total_uses,
          ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2)                     AS total_discount_percentage,
          COUNT(DISTINCT po."poNumber")::text                                       AS applied_count,
          ROUND(SUM(po."appliedOfferDiscount"), 2)::text                            AS total_discount_burn,
          ROUND(SUM(po."amount"), 2)::text                                          AS total_revenue,
          ROUND((SUM(COALESCE(po."appliedOfferDiscount", 0)) * 100.0)
                / NULLIF(SUM(po."amount"), 0), 2)::text                             AS conversion_rate
        FROM "promotions"."offer" o
        LEFT JOIN "promotions"."offerReservation" cor
               ON cor."offerId" = o."id" AND cor."status" = 'APPLIED'
        LEFT JOIN "purchaseOrder"."purchaseOrder" po
               ON po."id" = cor."purchaseOrderId"
              AND po."isTest" = FALSE
              AND po."isFalseOrder" = FALSE
              AND po."markedPendingTime" >= $1::timestamp
              AND po."markedPendingTime" <  ($2::timestamp + INTERVAL '1 day')
        LEFT JOIN "users"."buyer"  b ON b."id" = po."buyerId"  AND b."isTest" = FALSE
        LEFT JOIN "users"."seller" s ON s."id" = po."sellerId" AND s."isTest" = FALSE
        WHERE o."isTest" = FALSE
          AND (b."businessName" NOT ILIKE '%test%' OR b."id" IS NULL)
          AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL);
      `;
      params.push(startDate, endDate);
    }

    const rows = await queryCached(sql, params, TTL_SECONDS);
    return NextResponse.json(
      { data: rows[0] ?? {} },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
