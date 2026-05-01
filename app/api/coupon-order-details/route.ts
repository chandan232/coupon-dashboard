import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  try {
    let sql = `
      SELECT
        c."id"                                            AS buyer_id,
        b."poNumber"::text                                AS po_number,
        b."appliedOfferDiscount"::text                    AS applied_coupon_amount,
        a."status"                                        AS coupon_status,
        b."status"                                        AS order_status,
        ofr."code"                                        AS coupon_name,
        c."phone"                                         AS buyer_phone,
        c."businessName"                                  AS buyer_business_name,
        s."phone"                                         AS seller_phone,
        s."businessName"                                  AS seller_business_name,
        b."markedPendingTime"                             AS marked_pending_time,
        b."created_at"                                    AS order_created_at,
        a."created_at"                                    AS coupon_applied_at,
        b."amount"::text                                  AS order_amount,
        ROUND((b."appliedOfferDiscount" * 100.0) / NULLIF(b."amount", 0), 2)::text AS coupon_pct_of_order
      FROM "promotions"."offerReservation" a
      JOIN "purchaseOrder"."purchaseOrder" b ON b."id" = a."purchaseOrderId"
      JOIN "users"."buyer"  c ON c."id" = b."buyerId"
      JOIN "promotions"."offer" ofr ON ofr."id" = a."offerId"
      JOIN "users"."seller" s ON s."id" = b."sellerId"
      WHERE b."markedPendingTime" IS NOT NULL
        AND b."amount" > 0
        AND c."isTest" = FALSE
        AND c."businessName" NOT ILIKE '%test%'
        AND b."isTest" = FALSE
        AND b."isFalseOrder" = FALSE
        AND b."appliedOfferReservationId" IS NOT NULL
        AND ofr."type" = 'COUPON'
    `;

    const params: (string | number)[] = [];

    if (startDate && endDate) {
      params.push(startDate, endDate);
      sql += ` AND b."created_at"::date >= $${params.length - 1} AND b."created_at"::date <= $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND a."status" = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      sql += ` AND (ofr."code" ILIKE $${i} OR c."phone" ILIKE $${i} OR c."businessName" ILIKE $${i} OR s."phone" ILIKE $${i} OR s."businessName" ILIKE $${i} OR b."poNumber"::text ILIKE $${i})`;
    }

    sql += ` ORDER BY b."markedPendingTime" DESC LIMIT 1000;`;

    const rows = await query<{
      buyer_id: string;
      po_number: string;
      applied_coupon_amount: string;
      coupon_status: string;
      order_status: string;
      coupon_name: string;
      buyer_phone: string;
      buyer_business_name: string;
      seller_phone: string;
      seller_business_name: string;
      marked_pending_time: string;
      order_created_at: string;
      coupon_applied_at: string;
      order_amount: string;
      coupon_pct_of_order: string;
    }>(sql, params);

    const formatted = rows.map(r => ({
      poNumber: r.po_number,
      appliedCouponAmount: r.applied_coupon_amount,
      couponStatus: r.coupon_status,
      orderStatus: r.order_status,
      couponName: r.coupon_name,
      buyerId: r.buyer_id,
      buyerPhone: r.buyer_phone,
      buyerBusinessName: r.buyer_business_name,
      sellerPhone: r.seller_phone,
      sellerBusinessName: r.seller_business_name,
      markedPendingTime: r.marked_pending_time,
      orderCreatedAt: r.order_created_at,
      couponAppliedAt: r.coupon_applied_at,
      orderAmount: r.order_amount,
      couponPctOfOrder: r.coupon_pct_of_order,
    }));

    return NextResponse.json({ data: formatted });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
