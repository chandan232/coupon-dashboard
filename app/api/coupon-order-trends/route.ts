import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!code) {
    return NextResponse.json({ error: 'code parameter required' }, { status: 400 });
  }

  try {
    let sql: string;
    let params: any[] = [code];

    if (startDate && endDate) {
      sql = `
        SELECT
          b."markedPendingTime"::date as order_date,
          count(distinct b."poNumber")::text as total_po,
          count(distinct a."id")::text as coupon_applications,
          ROUND(SUM(b."appliedOfferDiscount"), 2)::text as total_discount_applied,
          ROUND(SUM(b."amount"), 2)::text as total_order_value
        FROM "promotions"."offerReservation" a
        JOIN "promotions"."offer" o ON o."id" = a."offerId"
        JOIN "purchaseOrder"."purchaseOrder" b
          ON b."id" = a."purchaseOrderId"
        JOIN "users"."buyer" c ON c."id" = b."buyerId"
        LEFT JOIN "users"."seller" d ON d."id" = b."sellerId"
        WHERE
          b."markedPendingTime" IS NOT NULL
          AND a."status" = 'APPLIED'
          AND b."amount" > 0
          AND c."isTest" = false
          AND c."businessName" NOT ILIKE '%test%'
          AND b."isTest" = false
          AND b."isFalseOrder" = false
          AND b."appliedOfferReservationId" IS NOT NULL
          AND (d."isTest" = false OR d."id" IS NULL)
          AND (d."businessName" NOT ILIKE '%test%' OR d."id" IS NULL)
          AND o."code" = $1
          AND b."markedPendingTime"::date >= $2 AND b."markedPendingTime"::date <= $3
        GROUP BY 1
        ORDER BY 1 ASC;
      `;
      params = [code, startDate, endDate];
    } else {
      sql = `
        SELECT
          b."markedPendingTime"::date as order_date,
          count(distinct b."poNumber")::text as total_po,
          count(distinct a."id")::text as coupon_applications,
          ROUND(SUM(b."appliedOfferDiscount"), 2)::text as total_discount_applied,
          ROUND(SUM(b."amount"), 2)::text as total_order_value
        FROM "promotions"."offerReservation" a
        JOIN "promotions"."offer" o ON o."id" = a."offerId"
        JOIN "purchaseOrder"."purchaseOrder" b
          ON b."id" = a."purchaseOrderId"
        JOIN "users"."buyer" c ON c."id" = b."buyerId"
        LEFT JOIN "users"."seller" d ON d."id" = b."sellerId"
        WHERE
          b."markedPendingTime" IS NOT NULL
          AND a."status" = 'APPLIED'
          AND b."amount" > 0
          AND c."isTest" = false
          AND c."businessName" NOT ILIKE '%test%'
          AND b."isTest" = false
          AND b."isFalseOrder" = false
          AND b."appliedOfferReservationId" IS NOT NULL
          AND (d."isTest" = false OR d."id" IS NULL)
          AND (d."businessName" NOT ILIKE '%test%' OR d."id" IS NULL)
          AND o."code" = $1
        GROUP BY 1
        ORDER BY 1 ASC;
      `;
    }

    const rows = await query(sql, params);
    return NextResponse.json({ data: rows });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
