#!/usr/bin/env -S npx tsx
// @ts-nocheck
/**
 * Order Status Dashboard — MCP server
 *
 * Exposes the dashboard's data queries as Model Context Protocol tools so
 * Claude Desktop / Claude Code / any MCP client can query it directly.
 *
 * Run via stdio:
 *   npm run mcp:start
 *
 * Add to ~/Library/Application Support/Claude/claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "order-dashboard": {
 *         "command": "npx",
 *         "args": ["tsx", "/absolute/path/to/coupon-dashboard/lib/mcp-server.ts"],
 *         "env": { "DATABASE_URL": "postgresql://...", "DATABASE_SSL": "true" }
 *       }
 *     }
 *   }
 */

// Load .env / .env.local before importing anything that reads process.env.
// (Next.js does this automatically for the web app, but this MCP server
// is a standalone Node process.)
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(path.resolve(__dirname, '..'), false, { info: () => {}, error: () => {} });

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { query } from './db';

// ─── Shared filter clauses ────────────────────────────────────────────────────
// Mirror the dashboard: real-only orders, D2R brand sellers, no DRAFT.
const BASE_WHERE = `
  po."isTest" = FALSE
  AND po."isFalseOrder" = FALSE
  AND b."isTest" = FALSE
  AND b."businessName" NOT ILIKE '%test%'
  AND s."isTest" = FALSE
  AND s."businessName" NOT ILIKE '%test%'
  AND s."isD2RBrandSeller" = TRUE
  AND po."status" != 'DRAFT'
`;

const currentYear = () => new Date().getFullYear();

// ─── Query helpers ────────────────────────────────────────────────────────────

async function getGmvGoal(year: number) {
  const sql = `
    SELECT
      COALESCE(SUM(po."amount"::numeric), 0)::text AS achieved,
      COUNT(*)::text AS orders
    FROM "purchaseOrder"."purchaseOrder" po
    JOIN "users"."buyer" b ON b."id" = po."buyerId"
    JOIN "users"."seller" s ON s."id" = po."sellerId"
    WHERE ${BASE_WHERE}
      AND po."status" IN ('DELIVERED', 'COMPLETED')
      AND EXTRACT(YEAR FROM po."created_at") = $1;
  `;
  const rows = await query<{ achieved: string; orders: string }>(sql, [year]);
  const goal = 10000000;
  const achieved = parseFloat(rows[0]?.achieved || '0');
  const orders = parseInt(rows[0]?.orders || '0');
  const achievePct = goal > 0 ? (achieved / goal) * 100 : 0;
  return {
    year,
    goal,
    achieved,
    orders,
    remaining: Math.max(goal - achieved, 0),
    achievePct: parseFloat(achievePct.toFixed(2)),
  };
}

async function getMonthlyStatusBreakdown(year: number) {
  const sql = `
    SELECT
      po."status" AS status,
      EXTRACT(MONTH FROM po."created_at")::int AS month,
      COUNT(*) AS count,
      COALESCE(SUM(po."amount"::numeric), 0)::text AS amount
    FROM "purchaseOrder"."purchaseOrder" po
    JOIN "users"."buyer" b ON b."id" = po."buyerId"
    JOIN "users"."seller" s ON s."id" = po."sellerId"
    WHERE ${BASE_WHERE}
      AND EXTRACT(YEAR FROM po."created_at") = $1
    GROUP BY po."status", EXTRACT(MONTH FROM po."created_at")
    ORDER BY status, month;
  `;
  const rows = await query<{ status: string; month: string; count: string; amount: string }>(
    sql,
    [year]
  );
  type Cell = { count: number; amount: number };
  const statusMap: Record<string, Record<number, Cell>> = {};
  const byMonth: Record<number, Cell> = {};
  const byStatus: Record<string, Cell> = {};
  const grand: Cell = { count: 0, amount: 0 };
  for (const r of rows) {
    const month = parseInt(String(r.month));
    const count = parseInt(r.count);
    const amount = parseFloat(r.amount);
    if (!statusMap[r.status]) statusMap[r.status] = {};
    statusMap[r.status][month] = { count, amount };
    if (!byMonth[month]) byMonth[month] = { count: 0, amount: 0 };
    byMonth[month].count += count;
    byMonth[month].amount += amount;
    if (!byStatus[r.status]) byStatus[r.status] = { count: 0, amount: 0 };
    byStatus[r.status].count += count;
    byStatus[r.status].amount += amount;
    grand.count += count;
    grand.amount += amount;
  }
  const statuses = Object.keys(statusMap).sort(
    (a, b) => byStatus[b].count - byStatus[a].count
  );
  return {
    year,
    data: statuses.map((status) => ({
      status,
      months: statusMap[status],
      total: byStatus[status],
    })),
    totals: { byMonth, byStatus, grand },
  };
}

async function getSellerWiseBreakdown(year: number) {
  const sql = `
    SELECT
      s."id"::text          AS seller_id,
      s."phone"             AS seller_phone,
      s."businessName"      AS seller_business_name,
      po."status"           AS status,
      COUNT(*)              AS count,
      COALESCE(SUM(po."amount"::numeric), 0)::text AS amount
    FROM "purchaseOrder"."purchaseOrder" po
    JOIN "users"."buyer" b ON b."id" = po."buyerId"
    JOIN "users"."seller" s ON s."id" = po."sellerId"
    WHERE ${BASE_WHERE}
      AND EXTRACT(YEAR FROM po."created_at") = $1
    GROUP BY s."id", s."phone", s."businessName", po."status";
  `;
  const rows = await query<{
    seller_id: string;
    seller_phone: string | null;
    seller_business_name: string | null;
    status: string;
    count: string;
    amount: string;
  }>(sql, [year]);

  type Cell = { count: number; amount: number };
  type Seller = {
    sellerId: string;
    sellerPhone: string | null;
    sellerBusinessName: string | null;
    statuses: Record<string, Cell>;
    total: Cell;
  };
  const sellerMap = new Map<string, Seller>();
  const byStatus: Record<string, Cell> = {};
  const grand: Cell = { count: 0, amount: 0 };
  for (const r of rows) {
    const count = parseInt(r.count);
    const amount = parseFloat(r.amount);
    let seller = sellerMap.get(r.seller_id);
    if (!seller) {
      seller = {
        sellerId: r.seller_id,
        sellerPhone: r.seller_phone,
        sellerBusinessName: r.seller_business_name,
        statuses: {},
        total: { count: 0, amount: 0 },
      };
      sellerMap.set(r.seller_id, seller);
    }
    seller.statuses[r.status] = { count, amount };
    seller.total.count += count;
    seller.total.amount += amount;
    if (!byStatus[r.status]) byStatus[r.status] = { count: 0, amount: 0 };
    byStatus[r.status].count += count;
    byStatus[r.status].amount += amount;
    grand.count += count;
    grand.amount += amount;
  }
  const statuses = Object.keys(byStatus).sort((a, b) => byStatus[b].count - byStatus[a].count);
  const data = Array.from(sellerMap.values()).sort((a, b) => b.total.count - a.total.count);
  return { year, data, statuses, totals: { byStatus, grand } };
}

async function getSellerOrders(
  sellerId: string,
  year: number,
  page = 1,
  limit = 50
) {
  const offset = (page - 1) * limit;
  const countSql = `
    SELECT COUNT(*) as total
    FROM "purchaseOrder"."purchaseOrder" po
    JOIN "users"."buyer" b ON b."id" = po."buyerId"
    JOIN "users"."seller" s ON s."id" = po."sellerId"
    WHERE ${BASE_WHERE}
      AND s."id" = $1
      AND EXTRACT(YEAR FROM po."created_at") = $2;
  `;
  const countRows = await query<{ total: string }>(countSql, [sellerId, year]);
  const total = parseInt(countRows[0]?.total || '0');

  const sql = `
    SELECT
      po."poNumber"::text          AS po_number,
      po."status"                  AS status,
      po."amount"::text            AS amount,
      b."phone"                    AS buyer_phone,
      b."businessName"             AS buyer_business_name,
      po."markedPendingTime"       AS marked_pending_time,
      po."created_at"              AS created_at
    FROM "purchaseOrder"."purchaseOrder" po
    JOIN "users"."buyer" b ON b."id" = po."buyerId"
    JOIN "users"."seller" s ON s."id" = po."sellerId"
    WHERE ${BASE_WHERE}
      AND s."id" = $1
      AND EXTRACT(YEAR FROM po."created_at") = $2
    ORDER BY po."created_at" DESC
    LIMIT $3 OFFSET $4;
  `;
  const rows = await query<{
    po_number: string;
    status: string;
    amount: string;
    buyer_phone: string | null;
    buyer_business_name: string | null;
    marked_pending_time: string | null;
    created_at: string;
  }>(sql, [sellerId, year, limit, offset]);
  return {
    sellerId,
    year,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    data: rows.map((r) => ({
      poNumber: r.po_number,
      status: r.status,
      amount: parseFloat(r.amount),
      buyerPhone: r.buyer_phone,
      buyerBusinessName: r.buyer_business_name,
      markedPendingTime: r.marked_pending_time,
      createdAt: r.created_at,
    })),
  };
}

async function listOrdersByStatus(
  status: string,
  year: number,
  month?: number,
  page = 1,
  limit = 50
) {
  const params: (string | number)[] = [year, status];
  let monthFilter = '';
  if (typeof month === 'number' && month >= 1 && month <= 12) {
    params.push(month);
    monthFilter = `AND EXTRACT(MONTH FROM po."created_at") = $${params.length}`;
  }

  const countParams = [...params];
  const countSql = `
    SELECT COUNT(*) as total
    FROM "purchaseOrder"."purchaseOrder" po
    JOIN "users"."buyer" b ON b."id" = po."buyerId"
    JOIN "users"."seller" s ON s."id" = po."sellerId"
    WHERE ${BASE_WHERE}
      AND EXTRACT(YEAR FROM po."created_at") = $1
      AND po."status" = $2
      ${monthFilter};
  `;
  const countRows = await query<{ total: string }>(countSql, countParams);
  const total = parseInt(countRows[0]?.total || '0');

  const offset = (page - 1) * limit;
  params.push(limit);
  params.push(offset);
  const sql = `
    SELECT
      po."poNumber"::text          AS po_number,
      po."status"                  AS status,
      po."amount"::text            AS amount,
      b."phone"                    AS buyer_phone,
      b."businessName"             AS buyer_business_name,
      s."phone"                    AS seller_phone,
      s."businessName"             AS seller_business_name,
      b."state"                    AS buyer_state,
      po."markedPendingTime"       AS marked_pending_time,
      po."created_at"              AS created_at
    FROM "purchaseOrder"."purchaseOrder" po
    JOIN "users"."buyer" b ON b."id" = po."buyerId"
    JOIN "users"."seller" s ON s."id" = po."sellerId"
    WHERE ${BASE_WHERE}
      AND EXTRACT(YEAR FROM po."created_at") = $1
      AND po."status" = $2
      ${monthFilter}
    ORDER BY po."created_at" DESC
    LIMIT $${params.length - 1} OFFSET $${params.length};
  `;
  const rows = await query<{
    po_number: string;
    status: string;
    amount: string;
    buyer_phone: string | null;
    buyer_business_name: string | null;
    seller_phone: string | null;
    seller_business_name: string | null;
    buyer_state: string | null;
    marked_pending_time: string | null;
    created_at: string;
  }>(sql, params);
  return {
    status,
    year,
    month: month ?? null,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    data: rows.map((r) => ({
      poNumber: r.po_number,
      status: r.status,
      amount: parseFloat(r.amount),
      buyerPhone: r.buyer_phone,
      buyerBusinessName: r.buyer_business_name,
      sellerPhone: r.seller_phone,
      sellerBusinessName: r.seller_business_name,
      buyerState: r.buyer_state,
      markedPendingTime: r.marked_pending_time,
      createdAt: r.created_at,
    })),
  };
}

async function listRefundOrders(year: number, page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  const countSql = `
    SELECT COUNT(*) as total
    FROM "purchaseOrder"."purchaseOrder" po
    JOIN "users"."buyer" b ON b."id" = po."buyerId"
    JOIN "users"."seller" s ON s."id" = po."sellerId"
    LEFT JOIN "payments"."paymentRefundRecord" pf ON pf."purchaseOrderId" = po."id" AND pf."status" = 'COMPLETED'
    WHERE ${BASE_WHERE}
      AND EXTRACT(YEAR FROM po."created_at") = $1;
  `;
  const countRows = await query<{ total: string }>(countSql, [year]);
  const total = parseInt(countRows[0]?.total || '0');

  const sql = `
    SELECT
      po."poNumber"::text          AS po_number,
      po."status"                  AS status,
      po."amount"::text            AS amount,
      b."phone"                    AS buyer_phone,
      b."businessName"             AS buyer_business_name,
      s."phone"                    AS seller_phone,
      s."businessName"             AS seller_business_name,
      po."created_at"              AS order_created_at,
      pf."markedStatusInitiatedTime" AS refund_initiated_at,
      pf."markedStatusCompletedTime" AS refund_completed_at,
      ROUND(
        EXTRACT(EPOCH FROM (
          DATE_TRUNC('minute', pf."markedStatusCompletedTime") -
          DATE_TRUNC('minute', pf."markedStatusInitiatedTime")
        )) / 60, 2
      ) AS refund_time_minutes
    FROM "purchaseOrder"."purchaseOrder" po
    JOIN "users"."buyer" b ON b."id" = po."buyerId"
    JOIN "users"."seller" s ON s."id" = po."sellerId"
    LEFT JOIN "payments"."paymentRefundRecord" pf ON pf."purchaseOrderId" = po."id" AND pf."status" = 'COMPLETED'
    WHERE ${BASE_WHERE}
      AND EXTRACT(YEAR FROM po."created_at") = $1
    ORDER BY po."created_at" DESC
    LIMIT $2 OFFSET $3;
  `;
  const rows = await query<{
    po_number: string;
    status: string;
    amount: string;
    buyer_phone: string | null;
    buyer_business_name: string | null;
    seller_phone: string | null;
    seller_business_name: string | null;
    order_created_at: string;
    refund_initiated_at: string | null;
    refund_completed_at: string | null;
    refund_time_minutes: number | null;
  }>(sql, [year, limit, offset]);

  return {
    year,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    data: rows.map((r) => ({
      poNumber: r.po_number,
      status: r.status,
      amount: parseFloat(r.amount),
      buyerPhone: r.buyer_phone,
      buyerBusinessName: r.buyer_business_name,
      sellerPhone: r.seller_phone,
      sellerBusinessName: r.seller_business_name,
      orderCreatedAt: r.order_created_at,
      refundInitiatedAt: r.refund_initiated_at,
      refundCompletedAt: r.refund_completed_at,
      refundTimeMinutes: r.refund_time_minutes,
    })),
  };
}

// ─── MCP server ───────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'get_gmv_goal',
    description:
      'Returns GMV goal progress for a given year: achieved revenue (sum of order amount where status IN DELIVERED, COMPLETED) against the ₹1 Cr goal. Filters: real (non-test) D2R brand seller orders. Defaults to current year.',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'integer', description: 'Calendar year, e.g. 2026' },
      },
    },
  },
  {
    name: 'get_monthly_status_breakdown',
    description:
      'Returns a status × month pivot of order count and revenue for the year. Each status row has per-month {count, amount} cells plus a total. Also returns row/column/grand totals.',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'integer', description: 'Calendar year, e.g. 2026' },
      },
    },
  },
  {
    name: 'get_seller_wise_breakdown',
    description:
      'Returns a per-seller × status pivot for the year. Each seller row has phone, businessName, per-status {count, amount} cells, and a row total. Sorted by total order count desc. Use the returned sellerId with get_seller_orders to drill down.',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'integer', description: 'Calendar year, e.g. 2026' },
      },
    },
  },
  {
    name: 'get_seller_orders',
    description:
      "Returns paginated orders for one seller in a given year (most recent first). Response includes pagination metadata (page, limit, total, pages). Use after get_seller_wise_breakdown to drill into a seller's orders.",
    inputSchema: {
      type: 'object',
      properties: {
        sellerId: { type: 'string', description: 'Seller UUID from get_seller_wise_breakdown' },
        year: { type: 'integer', description: 'Calendar year, e.g. 2026' },
        page: { type: 'integer', description: 'Page number (default 1)' },
        limit: { type: 'integer', description: 'Rows per page (default 50)' },
      },
      required: ['sellerId'],
    },
  },
  {
    name: 'list_orders_by_status',
    description:
      'Lists paginated orders for a given status, year, and optional month. Response includes pagination metadata (page, limit, total, pages). Use to drill into a status × month cell from get_monthly_status_breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Order status, e.g. DELIVERED, COMPLETED, PENDING, REJECTED, CANCELLED, INPROGRESS, DISPATCHED',
        },
        year: { type: 'integer', description: 'Calendar year, e.g. 2026' },
        month: { type: 'integer', description: 'Optional month 1-12' },
        page: { type: 'integer', description: 'Page number (default 1)' },
        limit: { type: 'integer', description: 'Rows per page (default 50)' },
      },
      required: ['status'],
    },
  },
  {
    name: 'list_refund_orders',
    description:
      'Lists paginated refund orders for a given year. Returns orders with refund-specific fields: refundInitiatedAt, refundCompletedAt, refundTimeMinutes. Useful for building refund order dashboards with pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'integer', description: 'Calendar year, e.g. 2026' },
        page: { type: 'integer', description: 'Page number (default 1)' },
        limit: { type: 'integer', description: 'Rows per page (default 50)' },
      },
      required: [],
    },
  },
];

const server = new Server(
  { name: 'order-dashboard', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: rawArgs } = req.params;
  const args = (rawArgs ?? {}) as Record<string, unknown>;
  try {
    let result: unknown;
    switch (name) {
      case 'get_gmv_goal': {
        const year = (args.year as number | undefined) ?? currentYear();
        result = await getGmvGoal(year);
        break;
      }
      case 'get_monthly_status_breakdown': {
        const year = (args.year as number | undefined) ?? currentYear();
        result = await getMonthlyStatusBreakdown(year);
        break;
      }
      case 'get_seller_wise_breakdown': {
        const year = (args.year as number | undefined) ?? currentYear();
        result = await getSellerWiseBreakdown(year);
        break;
      }
      case 'get_seller_orders': {
        const sellerId = String(args.sellerId ?? '');
        if (!sellerId) throw new Error('sellerId is required');
        const year = (args.year as number | undefined) ?? currentYear();
        const page = (args.page as number | undefined) ?? 1;
        const limit = (args.limit as number | undefined) ?? 50;
        result = await getSellerOrders(sellerId, year, page, limit);
        break;
      }
      case 'list_orders_by_status': {
        const status = String(args.status ?? '');
        if (!status) throw new Error('status is required');
        const year = (args.year as number | undefined) ?? currentYear();
        const month = args.month as number | undefined;
        const page = (args.page as number | undefined) ?? 1;
        const limit = (args.limit as number | undefined) ?? 50;
        result = await listOrdersByStatus(status, year, month, page, limit);
        break;
      }
      case 'list_refund_orders': {
        const year = (args.year as number | undefined) ?? currentYear();
        const page = (args.page as number | undefined) ?? 1;
        const limit = (args.limit as number | undefined) ?? 50;
        result = await listRefundOrders(year, page, limit);
        break;
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [{ type: 'text', text: `Error: ${msg}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // server is now serving over stdio; do not console.log to stdout (would break protocol)
  console.error('[order-dashboard MCP] ready');
}

main().catch((err) => {
  console.error('[order-dashboard MCP] fatal:', err);
  process.exit(1);
});
