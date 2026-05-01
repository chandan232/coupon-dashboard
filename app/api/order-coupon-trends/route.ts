import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = `
      SELECT
        po."markedPendingTime"::date AS "Date",
        COUNT(DISTINCT po."poNumber")::text AS "total_orders",
        COUNT(DISTINCT CASE WHEN po."appliedOfferReservationId" IS NOT NULL AND o."isTest" = FALSE THEN po."poNumber" END)::text AS "coupon_driven_orders",
        COUNT(DISTINCT CASE WHEN po."appliedOfferReservationId" IS NULL THEN po."poNumber" END)::text AS "no_coupon_orders"
      FROM "purchaseOrder"."purchaseOrder" po
      JOIN "users"."buyer" b ON po."buyerId" = b."id"
      LEFT JOIN "users"."seller" s ON s."id" = po."sellerId"
      LEFT JOIN "promotions"."offerReservation" cor ON cor."id" = po."appliedOfferReservationId"
      LEFT JOIN "promotions"."offer" o ON o."id" = cor."offerId"
      WHERE
        po."status" NOT IN ('DRAFT', 'CANCELLED', 'REJECTED')
        AND po."isTest" = FALSE
        AND po."isFalseOrder" = FALSE
        AND po."deliveryType" = 'INTERCITY'
        AND po."deliveryNetwork" = 'THIRD_PARTY'
        AND b."isTest" = FALSE
        AND b."businessName" NOT ILIKE '%test%'
        AND (s."isTest" = FALSE OR s."id" IS NULL)
        AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL)
        AND po."markedPendingTime" IS NOT NULL
    `;

    // Add date filter if provided
    if (startDate && endDate) {
      sql += `
        AND po."markedPendingTime"::date >= $1
        AND po."markedPendingTime"::date <= $2
      `;
      sql += `
        GROUP BY 1
        ORDER BY 1 DESC;
      `;
      const rows = await query(sql, [startDate, endDate]);
      return NextResponse.json({ data: rows });
    }

    sql += `
      AND po."markedPendingTime" >= CURRENT_DATE - INTERVAL '15 days'
      AND po."markedPendingTime" < CURRENT_DATE + INTERVAL '1 day'
      GROUP BY 1
      ORDER BY 1 DESC;
    `;
    const rows = await query(sql);
    return NextResponse.json({ data: rows });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
