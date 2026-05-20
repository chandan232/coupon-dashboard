import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic'; // Force Vercel rebuild - AWB columns deployment v2

interface Row {
  poNumber: string;
  MarkedpendingTime: string | null;
  paymentDate: string | null;
  paymentEvent: string | null;
  sellerPhone: string | null;
  sellerBusinessName: string | null;
  buyerPhone: string | null;
  buyerBusinessName: string | null;
  paidAmount: number | null;
  poAmount: number | null;
  CoupanApplied: number | null;
  orderStatus: string;
  discountBySeller: number;
  discountByBadho: number;
  appliedWalletAmount: number | null;
  rejectReason: string | null;
  paymentMode: string | null;
  awbNumber: string | null;
  courierName: string | null;
  DeliveryPaymentMethod: string | null;
  deliveryStatus: string | null;
  RefundIntiatedTime: string | null;
  RefundCompletedTime: string | null;
  RefundCompletedInMin: number | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const currentYear = new Date().getFullYear();
  const year = parseInt(searchParams.get('year') || String(currentYear));
  const monthParam = searchParams.get('month');
  const status = searchParams.get('status');

  if (!status) {
    return NextResponse.json({ error: 'status parameter required' }, { status: 400 });
  }

  try {
    const params: (string | number)[] = [status, year];
    let monthFilter = '';
    if (monthParam) {
      const month = parseInt(monthParam);
      if (!Number.isNaN(month) && month >= 1 && month <= 12) {
        params.push(month);
        monthFilter = ` AND EXTRACT(MONTH FROM po."created_at") = $${params.length}`;
      }
    }

    const sql = `
      SELECT DISTINCT
        po."poNumber",
        po."markedPendingTime"::date AS "MarkedpendingTime",
        pop."created_at" AS "paymentDate",
        pop."event" AS "paymentEvent",
        s."phone" AS "sellerPhone",
        s."businessName" AS "sellerBusinessName",
        b."phone" AS "buyerPhone",
        b."businessName" AS "buyerBusinessName",
        pop."paidAmount",
        po."amount" AS "poAmount",
        po."appliedOfferDiscount" AS "CoupanApplied",
        po."status" AS "orderStatus",
        COALESCE((pop."breakup"->>'discount_on_payment_preference_for_seller')::float, 0) AS "discountBySeller",
        COALESCE((pop."breakup"->>'discount_on_payment_preference_from_badho')::float, 0) AS "discountByBadho",
        pop."appliedWalletAmount",
        po."rejectReason",
        po."paymentInfo"->>'instrument' AS "paymentMode",
        dv."trackingInfo"->>'awbNumber' AS "awbNumber",
        dv."trackingInfo"->>'courierName' AS "courierName",
        dv."metaDetails"->>'paymentMethod' AS "DeliveryPaymentMethod",
        dv."status" AS "deliveryStatus",
        pf."markedStatusInitiatedTime" AS "RefundIntiatedTime",
        pf."markedStatusCompletedTime" AS "RefundCompletedTime",
        ROUND(EXTRACT(EPOCH FROM (DATE_TRUNC('minute', pf."markedStatusCompletedTime") - DATE_TRUNC('minute', pf."markedStatusInitiatedTime"))) / 60, 2) AS "RefundCompletedInMin"
      FROM "purchaseOrder"."purchaseOrder" po
      JOIN "users"."buyer" AS b ON b."id" = po."buyerId"
      JOIN "users"."seller" s ON po."sellerId" = s."id"
      LEFT JOIN "deliveries"."intercityDelivery" AS dv ON dv."purchaseOrderId" = po."id"
      LEFT JOIN "payments"."paymentRefundRecord" AS pf ON pf."purchaseOrderId" = po."id" AND pf."status" = 'COMPLETED'
      LEFT JOIN "purchaseOrder"."purchaseOrderPayment" AS pop ON pop."purchaseOrderId" = po."id" AND pop."status" = 'COMPLETED' AND pop."event" IN ('FULL_ADVANCE', 'PARTIAL_ADVANCE')
      WHERE
        s."isD2RBrandSeller" = TRUE
        AND s."isTest" = FALSE
        AND s."businessName" NOT ILIKE '%test%'
        AND b."isTest" = FALSE
        AND b."businessName" NOT ILIKE '%test%'
        AND po."isTest" = FALSE
        AND po."markedPendingTime" IS NOT NULL
        AND po."deliveryNetwork" = 'THIRD_PARTY'
        AND po."deliveryType" = 'INTERCITY'
        AND po."isFalseOrder" = FALSE
        AND EXTRACT(YEAR FROM po."created_at") = $2
        AND po."status" = $1
        ${monthFilter}
      ORDER BY "MarkedpendingTime" DESC NULLS LAST
      LIMIT 5000;
    `;

    const rows = await query<Row>(sql, params);

    const data = rows;

    return NextResponse.json({
      data,
      count: data.length,
      year,
      month: monthParam ? parseInt(monthParam) : null,
      status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
