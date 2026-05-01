import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const buyerId = searchParams.get('buyerId');

  if (!buyerId) {
    return NextResponse.json({ error: 'buyerId parameter required' }, { status: 400 });
  }

  try {
    // Fetch buyer details
    const buyerRows = await query<{
      id: string;
      name: string;
      business_name: string;
      phone: string;
      city: string;
      state: string;
      address_line1: string;
    }>(
      `SELECT
        "id",
        "name",
        "businessName" as business_name,
        "phone",
        "city",
        "state",
        "addressLine1" as address_line1
      FROM "users"."buyer"
      WHERE "id" = $1`,
      [buyerId]
    );

    if (buyerRows.length === 0) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
    }

    const buyer = buyerRows[0];

    // Fetch order summary by status
    const orderSummary = await query<{
      status: string;
      count: string;
      total_amount: string;
    }>(
      `SELECT
        "status",
        COUNT(*) as count,
        SUM("amount"::numeric) as total_amount
      FROM "purchaseOrder"."purchaseOrder"
      WHERE "buyerId" = $1
      GROUP BY "status"
      ORDER BY "status"`,
      [buyerId]
    );

    // Fetch total orders and revenue
    const totalRows = await query<{
      total_orders: string;
      total_revenue: string;
    }>(
      `SELECT
        COUNT(*) as total_orders,
        SUM("amount"::numeric) as total_revenue
      FROM "purchaseOrder"."purchaseOrder"
      WHERE "buyerId" = $1`,
      [buyerId]
    );

    const totals = totalRows[0] || { total_orders: '0', total_revenue: '0' };

    return NextResponse.json({
      data: {
        buyer,
        orderSummary: orderSummary.map(row => ({
          status: row.status,
          count: Number(row.count),
          totalAmount: row.total_amount ? Number(row.total_amount) : 0,
        })),
        totals: {
          totalOrders: Number(totals.total_orders),
          totalRevenue: totals.total_revenue ? Number(totals.total_revenue) : 0,
        },
      },
    });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
