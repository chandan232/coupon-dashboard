import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const granularity = searchParams.get('granularity') ?? 'daily';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!code) {
    return NextResponse.json({ error: 'code parameter required' }, { status: 400 });
  }

  try {
    let sql: string;

    if (granularity === 'hourly') {
      sql = `
        SELECT
          DATE_TRUNC('hour', po."markedPendingTime") AS hour_bucket,
          COUNT(DISTINCT po."poNumber")::text AS order_count,
          ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2)::text AS applied_coupon_amount,
          ROUND(SUM(po."amount"), 2)::text AS order_amount
        FROM "promotions"."offerReservation" cor
        JOIN "promotions"."offer" o ON o."id" = cor."offerId"
        JOIN "purchaseOrder"."purchaseOrder" po ON po."id" = cor."purchaseOrderId"
        JOIN "users"."buyer" b ON b."id" = po."buyerId"
        LEFT JOIN "users"."seller" s ON s."id" = po."sellerId"
        WHERE o."code" = $1
          AND o."isTest" = FALSE
          AND cor."status" = 'APPLIED'
          AND po."isTest" = FALSE
          AND po."isFalseOrder" = FALSE
          AND b."isTest" = FALSE
          AND b."businessName" NOT ILIKE '%test%'
          AND (s."isTest" = FALSE OR s."id" IS NULL)
          AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL)
          AND po."markedPendingTime" IS NOT NULL
          ${startDate && endDate ? `AND po."markedPendingTime"::date >= $2 AND po."markedPendingTime"::date <= $3` : 'AND po."markedPendingTime" >= NOW() - INTERVAL \'7 days\''}
        GROUP BY 1
        ORDER BY 1;
      `;
    } else {
      sql = `
        SELECT
          DATE_TRUNC('day', po."markedPendingTime") AS day_bucket,
          COUNT(DISTINCT po."poNumber")::text AS order_count,
          ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2)::text AS applied_coupon_amount,
          ROUND(SUM(po."amount"), 2)::text AS order_amount
        FROM "promotions"."offerReservation" cor
        JOIN "promotions"."offer" o ON o."id" = cor."offerId"
        JOIN "purchaseOrder"."purchaseOrder" po ON po."id" = cor."purchaseOrderId"
        JOIN "users"."buyer" b ON b."id" = po."buyerId"
        LEFT JOIN "users"."seller" s ON s."id" = po."sellerId"
        WHERE o."code" = $1
          AND o."isTest" = FALSE
          AND cor."status" = 'APPLIED'
          AND po."isTest" = FALSE
          AND po."isFalseOrder" = FALSE
          AND b."isTest" = FALSE
          AND b."businessName" NOT ILIKE '%test%'
          AND (s."isTest" = FALSE OR s."id" IS NULL)
          AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL)
          AND po."markedPendingTime" IS NOT NULL
          ${startDate && endDate ? `AND po."markedPendingTime"::date >= $2 AND po."markedPendingTime"::date <= $3` : 'AND po."markedPendingTime" >= NOW() - INTERVAL \'30 days\''}
        GROUP BY 1
        ORDER BY 1;
      `;
    }

    const params = startDate && endDate ? [code, startDate, endDate] : [code];
    const rows = await query(sql, params);
    return NextResponse.json({ data: rows });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
