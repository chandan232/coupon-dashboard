import { query } from './db';

interface OrderStatusRow {
  status: string;
  count: string;
  pct: string;
}

interface OrderStatusResult {
  status: string;
  count: number;
  percentage: number;
}

export async function getOrderStatusSummary(
  startDate?: string,
  endDate?: string
): Promise<OrderStatusResult[]> {
  let sql = `
    SELECT
      b."status" AS status,
      COUNT(*) AS count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "purchaseOrder"."purchaseOrder" WHERE "isTest" = FALSE AND "isFalseOrder" = FALSE), 2) AS pct
    FROM "purchaseOrder"."purchaseOrder" b
    WHERE b."isTest" = FALSE
      AND b."isFalseOrder" = FALSE
      ${startDate && endDate ? `AND b."created_at"::date >= $1 AND b."created_at"::date <= $2` : ''}
    GROUP BY b."status"
    ORDER BY count DESC;
  `;

  const params: (string | number)[] = [];
  if (startDate && endDate) {
    params.push(startDate, endDate);
  }

  const rows = await query<OrderStatusRow>(sql, params);

  return rows.map(r => ({
    status: r.status,
    count: parseInt(r.count),
    percentage: parseFloat(r.pct),
  }));
}

export async function getOrderMetrics(
  startDate?: string,
  endDate?: string
): Promise<{
  total_orders: number;
  successful_orders: number;
  failed_orders: number;
  success_rate: string;
  failure_rate: string;
  unique_statuses: number;
  statuses: OrderStatusResult[];
}> {
  const statusData = await getOrderStatusSummary(startDate, endDate);

  const total = statusData.reduce((sum, item) => sum + item.count, 0);
  const deliveredOrCompleted = statusData
    .filter(item => item.status === 'DELIVERED' || item.status === 'COMPLETED')
    .reduce((sum, item) => sum + item.count, 0);
  const failedOrRejected = statusData
    .filter(item => item.status === 'FAILED' || item.status === 'REJECTED')
    .reduce((sum, item) => sum + item.count, 0);

  return {
    total_orders: total,
    successful_orders: deliveredOrCompleted,
    failed_orders: failedOrRejected,
    success_rate: total > 0 ? ((deliveredOrCompleted / total) * 100).toFixed(2) : '0',
    failure_rate: total > 0 ? ((failedOrRejected / total) * 100).toFixed(2) : '0',
    unique_statuses: statusData.length,
    statuses: statusData,
  };
}

// MCP Tool Definitions (for Claude Code or other MCP clients)
export const MCPTools = [
  {
    name: 'get_order_status_summary',
    description:
      'Get a summary of order counts grouped by status. Useful for stakeholder reporting and business analytics.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Optional start date in YYYY-MM-DD format',
        },
        end_date: {
          type: 'string',
          description: 'Optional end date in YYYY-MM-DD format',
        },
      },
    },
  },
  {
    name: 'get_order_metrics',
    description:
      'Get key metrics about orders including total count, success rate, and failure rate.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Optional start date in YYYY-MM-DD format',
        },
        end_date: {
          type: 'string',
          description: 'Optional end date in YYYY-MM-DD format',
        },
      },
    },
  },
];
