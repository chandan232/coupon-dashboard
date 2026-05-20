import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface MonthlyStatusRow {
  status: string;
  reason_category: string | null;
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
        po."status" AS status,
        CASE
          WHEN po."status" = 'REJECTED' THEN
            CASE
              WHEN po."deliveryStatus" = 'RTO' THEN 'RTO'
              WHEN EXISTS (
                SELECT 1
                FROM "deliveries"."intercityDelivery" di
                WHERE di."purchaseOrderId" = po."id"
                  AND di."status" = 'NOT PICKED'
                  AND di."autoRejectionTime" IS NOT NULL
              ) THEN 'Delivery Partner SLA Breach'
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
            END
          ELSE NULL
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
        AND po."status" != 'DRAFT'
        AND EXTRACT(YEAR FROM po."created_at") = $1
      GROUP BY po."status", reason_category, EXTRACT(MONTH FROM po."created_at")
      ORDER BY status, reason_category NULLS LAST, month;
    `;

    const rows = await query<MonthlyStatusRow>(sql, [year]);

    // Pivot data into status/reason_category -> month -> {count, amount}
    const statusMap: Record<string, Record<number, { count: number; amount: number }>> = {};
    const totals = {
      byMonth: {} as Record<number, { count: number; amount: number }>,
      byStatus: {} as Record<string, { count: number; amount: number }>,
      grand: { count: 0, amount: 0 },
    };

    for (const r of rows) {
      // Create composite key for hierarchical display
      const statusKey = r.reason_category ? `${r.status}|${r.reason_category}` : r.status;
      const month = parseInt(String(r.month));
      const count = parseInt(r.count);
      const amount = parseFloat(r.amount);

      if (!statusMap[statusKey]) statusMap[statusKey] = {};
      statusMap[statusKey][month] = { count, amount };

      if (!totals.byMonth[month]) totals.byMonth[month] = { count: 0, amount: 0 };
      totals.byMonth[month].count += count;
      totals.byMonth[month].amount += amount;

      if (!totals.byStatus[statusKey]) totals.byStatus[statusKey] = { count: 0, amount: 0 };
      totals.byStatus[statusKey].count += count;
      totals.byStatus[statusKey].amount += amount;

      totals.grand.count += count;
      totals.grand.amount += amount;
    }

    // Create a special "SLA Breach" parent that combines both SLA breach types
    const slaBreachParent = {
      'SLA Breach|Brand SLA Breach': statusMap['REJECTED|Brand SLA Breach'] || {},
      'SLA Breach|Delivery Partner SLA Breach': statusMap['REJECTED|Delivery Partner SLA Breach'] || {},
    };

    // Move SLA breach categories to SLA Breach parent and update totals
    Object.keys(slaBreachParent).forEach(newKey => {
      const oldKey = newKey.replace('SLA Breach', 'REJECTED');
      statusMap[newKey] = slaBreachParent[newKey];
      totals.byStatus[newKey] = totals.byStatus[oldKey];
      delete totals.byStatus[oldKey];
    });
    delete statusMap['REJECTED|Brand SLA Breach'];
    delete statusMap['REJECTED|Delivery Partner SLA Breach'];

    const statusKeys = Object.keys(statusMap).sort((a, b) => {
      // Custom status order with SLA Breach and RTO at top
      const statusOrder = [
        'SLA Breach|Brand SLA Breach',
        'SLA Breach|Delivery Partner SLA Breach',
        'REJECTED|RTO',
        'REJECTED|Other Reasons',
        'REJECTED|Serviceability Issue',
        'REJECTED|Address Issue',
        'COMPLETED',
        'DISPATCHED',
        'INPROGRESS',
        'PENDING',
        'CANCELLED',
      ];

      const aIndex = statusOrder.indexOf(a);
      const bIndex = statusOrder.indexOf(b);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      return totals.byStatus[b].count - totals.byStatus[a].count;
    });

    const data = statusKeys.map((statusKey) => {
      const [status, reasonCategory] = statusKey.includes('|') ? statusKey.split('|') : [statusKey, null];
      return {
        status,
        reasonCategory: reasonCategory || null,
        months: statusMap[statusKey],
        total: totals.byStatus[statusKey],
      };
    });

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
