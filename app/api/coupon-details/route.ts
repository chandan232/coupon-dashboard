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
    let sql = `
      SELECT
        po."markedPendingTime"::date AS order_date,
        cor."status" AS reservation_status,
        po."poNumber"::text,
        po."appliedOfferDiscount"::text,
        po."amount"::text AS order_amount,
        ROUND((po."appliedOfferDiscount" * 100.0) / NULLIF(po."amount", 0), 2)::text AS coupon_pct_of_order,
        o."code" AS coupon_code,
        b."phone" AS buyer_phone,
        s."phone" AS seller_phone,
        b."businessName" AS buyer_business_name,
        s."businessName" AS seller_business_name,
        cor."created_at" AS created_at
      FROM "promotions"."offerReservation" cor
      JOIN "promotions"."offer" o ON o."id" = cor."offerId"
      JOIN "purchaseOrder"."purchaseOrder" po ON po."id" = cor."purchaseOrderId"
      JOIN "users"."buyer" b ON b."id" = po."buyerId"
      LEFT JOIN "users"."seller" s ON s."id" = po."sellerId"
      WHERE o."code" = $1
        AND o."isTest" = FALSE
        AND cor."status" = 'APPLIED'
        AND b."isTest" = FALSE
        AND b."businessName" NOT ILIKE '%test%'
        AND po."isTest" = FALSE
        AND po."isFalseOrder" = FALSE
        AND (s."isTest" = FALSE OR s."id" IS NULL)
        AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL)
        AND po."markedPendingTime" IS NOT NULL
    `;

    // Add date filter if provided
    if (startDate && endDate) {
      sql += `
        AND po."markedPendingTime"::date >= $2 AND po."markedPendingTime"::date <= $3
      `;
    }

    sql += `
      ORDER BY po."markedPendingTime" DESC;
    `;

    const rows = await query<{
      order_date: string;
      reservation_status: string;
      poNumber: string;
      appliedOfferDiscount: string;
      order_amount: string;
      coupon_pct_of_order: string;
      coupon_code: string;
      buyer_phone: string;
      seller_phone: string;
      buyer_business_name: string;
      seller_business_name: string;
      created_at: string;
    }>(sql, startDate && endDate ? [code, startDate, endDate] : [code]);

    const formatted = rows.map(r => ({
      orderDate: r.order_date,
      poNumber: r.poNumber,
      amount: r.order_amount,
      appliedOfferDiscount: r.appliedOfferDiscount,
      couponPctOfOrder: r.coupon_pct_of_order,
      couponCode: r.coupon_code,
      buyerPhone: r.buyer_phone,
      sellerPhone: r.seller_phone,
      buyerBusinessName: r.buyer_business_name,
      sellerBusinessName: r.seller_business_name,
      reservationStatus: r.reservation_status,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ data: formatted });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
