import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RTOBreakdownRow {
  reason_category: string;
  month: string;
  count: string;
  amount: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const currentYear = new Date().getFullYear();
  const year = parseInt(searchParams.get('year') || String(currentYear));

  try {
    const sql = `
      SELECT
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM "deliveries"."intercityDelivery" di
            WHERE di."purchaseOrderId" = po."id"
              AND di."status" = 'NOT PICKED'
              AND di."autoRejectionTime" IS NOT NULL
          ) THEN 'Delivery Partner SLA Breach'
          WHEN po."deliveryStatus" = 'RTO' THEN 'Rejected due to RTO'
          WHEN COALESCE(po."rejectReason", '') ILIKE '%AUTO REJECTED DUE TO SLA BREACH%'
            OR COALESCE(po."reasonAddedByBadhoTeam", '') ILIKE '%AUTO REJECTED DUE TO SLA BREACH%'
            THEN 'Brand SLA Breach'
          WHEN COALESCE(po."rejectReason", '') ILIKE '%serviceab%'
            OR COALESCE(po."reasonAddedByBadhoTeam", '') ILIKE '%serviceab%'
            THEN 'Serviceability Issue'
          WHEN COALESCE(po."rejectReason", '') ILIKE '%address%'
            OR COALESCE(po."reasonAddedByBadhoTeam", '') ILIKE '%address%'
            THEN 'Address Issue'
          ELSE 'Other Reasons'
        END AS reason_category,
        EXTRACT(MONTH FROM po."created_at")::int AS month,
        COUNT(*) AS count,
        COALESCE(SUM(po."amount"::numeric), 0)::text AS amount
      FROM "purchaseOrder"."purchaseOrder" po
      JOIN "users"."buyer" b ON b."id" = po."buyerId"
      JOIN "users"."seller" s ON s."id" = po."sellerId"
      WHERE po."isTest" = FALSE
        AND po."isFalseOrder" = FALSE
        AND b."isTest" = FALSE
        AND b."businessName" NOT ILIKE '%test%'
        AND s."isTest" = FALSE
        AND s."businessName" NOT ILIKE '%test%'
        AND s."isD2RBrandSeller" = TRUE
        AND po."status" = 'REJECTED'
        AND EXTRACT(YEAR FROM po."created_at") = $1
      GROUP BY reason_category, EXTRACT(MONTH FROM po."created_at")
      ORDER BY reason_category, month;
    `;

    const rows = await query<RTOBreakdownRow>(sql, [year]);

    // Pivot data into reason_category -> month -> {count, amount}
    const categoryMap: Record<string, Record<number, { count: number; amount: number }>> = {};
    const totals = {
      byMonth: {} as Record<number, { count: number; amount: number }>,
      byCategory: {} as Record<string, { count: number; amount: number }>,
      grand: { count: 0, amount: 0 },
    };

    // Category order
    const categoryOrder = [
      'Rejected due to RTO',
      'Brand SLA Breach',
      'Delivery Partner SLA Breach',
      'Serviceability Issue',
      'Address Issue',
      'Other Reasons',
    ];

    for (const r of rows) {
      const category = r.reason_category;
      const month = parseInt(String(r.month));
      const count = parseInt(r.count);
      const amount = parseFloat(r.amount);

      if (!categoryMap[category]) categoryMap[category] = {};
      categoryMap[category][month] = { count, amount };

      if (!totals.byMonth[month]) totals.byMonth[month] = { count: 0, amount: 0 };
      totals.byMonth[month].count += count;
      totals.byMonth[month].amount += amount;

      if (!totals.byCategory[category]) totals.byCategory[category] = { count: 0, amount: 0 };
      totals.byCategory[category].count += count;
      totals.byCategory[category].amount += amount;

      totals.grand.count += count;
      totals.grand.amount += amount;
    }

    const categories = Object.keys(categoryMap).sort((a, b) => {
      return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
    });

    const data = categories.map((category) => ({
      reasonCategory: category,
      months: categoryMap[category],
      total: totals.byCategory[category],
    }));

    return NextResponse.json({
      data,
      totals,
      year,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
