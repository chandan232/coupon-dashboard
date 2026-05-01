import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const poNumber = searchParams.get('poNumber');

  if (!poNumber) {
    return NextResponse.json({ error: 'poNumber parameter required' }, { status: 400 });
  }

  try {
    const sql = `
      SELECT
        poi."quantity"::text                          AS quantity,
        poi."unitPrice"::text                         AS unit_price,
        poi."amount"::text                            AS amount,
        poi."status"                                  AS item_status,
        bs."label"                                    AS brand_sku,
        bra."label"                                   AS brand,
        (bs."brandSKUDataJSON" ->> 'size')            AS size,
        po."poNumber"::text                           AS po_number,
        po."status"                                   AS po_status,
        po."amount"::text                             AS po_amount,
        po."discount"::text                           AS po_discount,
        po."updated_at"                               AS po_updated_at,
        po."markedPendingTime"                        AS marked_pending_time,
        po."markedCompletedTime"                      AS marked_completed_time,
        po."isFalseOrder"                             AS is_false_order
      FROM "purchaseOrder"."purchaseOrderItem" poi
      INNER JOIN "purchaseOrder"."purchaseOrder" po ON poi."purchaseOrderId" = po."id"
      JOIN "brands"."brandSKU" bs ON poi."brandSKUId" = bs."id"
      LEFT JOIN "brands"."brand" bra ON bs."brandId" = bra."id"
      LEFT JOIN "users"."seller" s ON po."sellerId" = s."id"
      LEFT JOIN "users"."buyer"  b ON po."buyerId"  = b."id"
      WHERE po."poNumber" = $1
        AND b."isTest" = FALSE
        AND b."businessName" NOT ILIKE '%test%'
        AND s."isTest" = FALSE
        AND s."businessName" NOT ILIKE '%test%'
        AND po."isTest" = FALSE
      ORDER BY poi."amount" DESC NULLS LAST
    `;

    const rows = await query<{
      quantity: string;
      unit_price: string;
      amount: string;
      item_status: string;
      brand_sku: string;
      brand: string;
      size: string;
      po_number: string;
      po_status: string;
      po_amount: string;
      po_discount: string;
      po_updated_at: string;
      marked_pending_time: string;
      marked_completed_time: string;
      is_false_order: boolean;
    }>(sql, [Number(poNumber)]);

    const items = rows.map(r => ({
      quantity: r.quantity,
      unitPrice: r.unit_price,
      amount: r.amount,
      itemStatus: r.item_status,
      brandSku: r.brand_sku,
      brand: r.brand,
      size: r.size,
    }));

    const summary = rows[0]
      ? {
          poNumber: rows[0].po_number,
          poStatus: rows[0].po_status,
          poAmount: rows[0].po_amount,
          poDiscount: rows[0].po_discount,
          poUpdatedAt: rows[0].po_updated_at,
          markedPendingTime: rows[0].marked_pending_time,
          markedCompletedTime: rows[0].marked_completed_time,
          isFalseOrder: rows[0].is_false_order,
        }
      : null;

    return NextResponse.json({ data: { summary, items } });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
