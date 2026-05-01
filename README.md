# Coupon & Voucher Management Dashboard

A full-stack Next.js application for coupon performance management with management-level KPIs and detailed analytics.

## Features

- **Coupon Management** — Browse all coupons with filtering (live/scheduled/inactive)
- **Management Dashboard** — KPI cards, status breakdown, top coupons chart
- **Detailed Analysis** — Time-based trends, failure funnel, high-discount orders

## Quick Start

### 1. Environment Setup

Update `.env.local` with your PostgreSQL connection:

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/badho-app
DATABASE_SSL=true   # or false for local dev
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Dev Server

```bash
npm run dev
```

Server starts at **http://localhost:3000**

### 4. Navigate Pages

| Route | Purpose |
|---|---|
| `/` | Coupon browser |
| `/dashboard` | Management KPIs |
| `/analysis` | Detailed trends & failure analysis |

## API Endpoints (MCP Accessible)

All endpoints return JSON. Base: `http://localhost:3000/api`

| Endpoint | Query Params | Returns |
|---|---|---|
| `GET /metrics` | — | KPI totals |
| `GET /offers` | — | All coupons from `promotions.offer` |
| `GET /coupon-performance` | — | Per-coupon breakdown |
| `GET /trends` | `granularity=daily\|hourly` | Time-series |
| `GET /failure-analysis` | — | Status funnel |
| `GET /high-discount-orders` | — | Orders with coupon% > 30 |

## Schema Mapping

Built for `promotions.offer` table:

| UI Field | Database Column |
|---|---|
| Code | `code` |
| Name | `code` (or display name) |
| Status | Derived from `isActive`, `activationTime`, `expiryTime` |
| Discount % | `discountDetails->'value'` (JSONB) |
| Usage | `currentUsageCount` |
| Valid Till | `expiryTime` |

## Build for Production

```bash
npm run build
npm start
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL + pg driver
- **UI**: React 18, Tailwind CSS
- **Charts**: Recharts
- **Type Safety**: TypeScript

## Environment Variables

| Var | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `DATABASE_SSL` | `true` | Enable SSL for DB connection |

## Troubleshooting

### DB Connection Errors
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running and accessible
- For remote DBs, ensure firewall allows inbound on port 5432
- Set `DATABASE_SSL=false` if SSL is not required

### No Data in Charts
- Verify test records exist: `SELECT COUNT(*) FROM "promotions"."offer" WHERE "isTest" = FALSE;`
- Check API responses: `curl http://localhost:3000/api/metrics`

## License

Internal use only
