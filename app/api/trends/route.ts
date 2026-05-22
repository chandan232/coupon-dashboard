import { NextResponse, NextRequest } from 'next/server';
import { queryCached } from '@/lib/db';
import { HOURLY_TREND_SQL, DAILY_TREND_SQL } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 300s cache — trend charts plot the last 7/30 days. Aggregation is
// expensive (5 joins, full date range scan) and the data only shifts
// in slow, smooth increments — 5-minute freshness is invisible to users.
const TTL_SECONDS = 300;

// Indexed date-range filter (no ::date cast) so the index on
// purchaseOrder.markedPendingTime is still usable.
function trendSql(granularity: 'hourly' | 'daily') {
  const bucket = granularity === 'hourly' ? "DATE_TRUNC('hour', po.\"markedPendingTime\")" : "DATE_TRUNC('day', po.\"markedPendingTime\")";
  return `
    SELECT
      ${bucket} AS ${granularity === 'hourly' ? 'hour_bucket' : 'day_bucket'},
      COUNT(DISTINCT po."poNumber")::text AS coupon_orders,
      ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2)::text AS discount_burn,
      ROUND(SUM(po."amount"), 2)::text AS revenue
    FROM "promotions"."offerReservation" cor
    JOIN "promotions"."offer" o ON o."id" = cor."offerId" AND o."isTest" = FALSE
    JOIN "purchaseOrder"."purchaseOrder" po
         ON po."id" = cor."purchaseOrderId"
        AND po."isTest" = FALSE
        AND po."isFalseOrder" = FALSE
        AND po."markedPendingTime" >= $1::timestamp
        AND po."markedPendingTime" <  ($2::timestamp + INTERVAL '1 day')
    JOIN "users"."buyer"  b ON b."id" = po."buyerId"  AND b."isTest" = FALSE
    LEFT JOIN "users"."seller" s ON s."id" = po."sellerId" AND s."isTest" = FALSE
    WHERE cor."status" = 'APPLIED'
    GROUP BY 1
    ORDER BY 1;
  `;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const granularity = (searchParams.get('granularity') === 'hourly' ? 'hourly' : 'daily') as 'hourly' | 'daily';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    let sql: string;
    let params: unknown[] = [];

    if (startDate && endDate) {
      sql = trendSql(granularity);
      params = [startDate, endDate];
    } else {
      sql = granularity === 'hourly' ? HOURLY_TREND_SQL : DAILY_TREND_SQL;
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
