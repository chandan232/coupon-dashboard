import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { HOURLY_TREND_SQL, DAILY_TREND_SQL } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const granularity = searchParams.get('granularity') ?? 'daily';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    let sql: string;

    if (startDate && endDate) {
      // Custom date range query
      if (granularity === 'hourly') {
        sql = `
          SELECT
            DATE_TRUNC('hour', po."markedPendingTime") AS hour_bucket,
            COUNT(DISTINCT po."poNumber")::text AS coupon_orders,
            ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2)::text AS discount_burn,
            ROUND(SUM(po."amount"), 2)::text AS revenue
          FROM "promotions"."offerReservation" cor
          JOIN "promotions"."offer" o ON o."id" = cor."offerId"
          JOIN "purchaseOrder"."purchaseOrder" po ON po."id" = cor."purchaseOrderId"
          JOIN "users"."buyer" b ON b."id" = po."buyerId"
          LEFT JOIN "users"."seller" s ON s."id" = po."sellerId"
          WHERE cor."status" = 'APPLIED'
            AND o."isTest" = FALSE
            AND po."isTest" = FALSE
            AND po."isFalseOrder" = FALSE
            AND b."isTest" = FALSE
            AND b."businessName" NOT ILIKE '%test%'
            AND (s."isTest" = FALSE OR s."id" IS NULL)
            AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL)
            AND po."markedPendingTime" IS NOT NULL
            AND po."markedPendingTime"::date >= $1 AND po."markedPendingTime"::date <= $2
          GROUP BY 1
          ORDER BY 1;
        `;
      } else {
        sql = `
          SELECT
            DATE_TRUNC('day', po."markedPendingTime") AS day_bucket,
            COUNT(DISTINCT po."poNumber")::text AS coupon_orders,
            ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2)::text AS discount_burn,
            ROUND(SUM(po."amount"), 2)::text AS revenue
          FROM "promotions"."offerReservation" cor
          JOIN "promotions"."offer" o ON o."id" = cor."offerId"
          JOIN "purchaseOrder"."purchaseOrder" po ON po."id" = cor."purchaseOrderId"
          JOIN "users"."buyer" b ON b."id" = po."buyerId"
          LEFT JOIN "users"."seller" s ON s."id" = po."sellerId"
          WHERE cor."status" = 'APPLIED'
            AND o."isTest" = FALSE
            AND po."isTest" = FALSE
            AND po."isFalseOrder" = FALSE
            AND b."isTest" = FALSE
            AND b."businessName" NOT ILIKE '%test%'
            AND (s."isTest" = FALSE OR s."id" IS NULL)
            AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL)
            AND po."markedPendingTime" IS NOT NULL
            AND po."markedPendingTime"::date >= $1 AND po."markedPendingTime"::date <= $2
          GROUP BY 1
          ORDER BY 1;
        `;
      }
      const rows = await query(sql, [startDate, endDate]);
      return NextResponse.json({ data: rows });
    }

    sql = granularity === 'hourly' ? HOURLY_TREND_SQL : DAILY_TREND_SQL;
    const rows = await query(sql);
    return NextResponse.json({ data: rows });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
