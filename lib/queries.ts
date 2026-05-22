// ──────────────────────────────────────────────────────────────────────────────
// PERFORMANCE NOTES — read before editing
// ──────────────────────────────────────────────────────────────────────────────
// 1. Every aggregation query that joins purchaseOrder MUST be bounded by a
//    markedPendingTime cutoff. Without it the query scans the full history
//    of every order ever placed. The dashboard only ever displays the last
//    ~90 days of activity, so we apply that floor server-side.
//
// 2. Avoid `DATE_TRUNC(...)` and `column::date` casts in WHERE clauses on
//    join keys. Use plain range comparisons (col >= ts AND col < ts) so
//    the index on the column can still be used.
//
// 3. These queries are wrapped by lib/db.queryCached() — see route files —
//    with TTLs in the 30-300s range to cap DB hits even under heavy traffic.
//
// 4. `ILIKE '%test%'` filters on businessName are kept by product request.
//    They block index use on the buyer/seller name columns, so the index
//    recommendations in scripts/recommended-indexes.sql lean on the
//    `isTest=FALSE` partial indexes to keep these joins fast.
// ──────────────────────────────────────────────────────────────────────────────

// Default lookback for aggregations that need a sane upper bound on rows
// scanned. The dashboard shows ~90 days of trend data; older rows are not
// rendered anywhere.
const DEFAULT_LOOKBACK = `NOW() - INTERVAL '90 days'`;

// ─── Management KPIs ────────────────────────────────────────────────────────
export const MANAGEMENT_METRICS_SQL = `
SELECT
  COUNT(*) FILTER (WHERE o."isActive" = true AND o."expiryTime" > NOW())  AS live_count,
  COUNT(*) FILTER (WHERE o."isActive" = true AND o."activationTime" > NOW()) AS scheduled_count,
  COUNT(*) FILTER (WHERE o."isActive" = false OR o."expiryTime" <= NOW()) AS expired_count,
  COUNT(*) FILTER (WHERE o."isTest" = false)                            AS active_real_count,
  COUNT(*)                                                              AS total_count,
  ROUND(AVG(COALESCE(po."appliedOfferDiscount", 0)), 2)                                   AS avg_usage,
  ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2)                                   AS total_uses,
  ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2) AS total_discount_percentage,
  COUNT(DISTINCT po."poNumber")::text AS applied_count,
  ROUND(SUM(po."appliedOfferDiscount"), 2)::text AS total_discount_burn,
  ROUND(SUM(po."amount"), 2)::text AS total_revenue,
  ROUND((SUM(COALESCE(po."appliedOfferDiscount", 0)) * 100.0) / NULLIF(SUM(po."amount"), 0), 2)::text AS conversion_rate
FROM "promotions"."offer" o
LEFT JOIN "promotions"."offerReservation" cor
       ON cor."offerId" = o."id" AND cor."status" = 'APPLIED'
LEFT JOIN "purchaseOrder"."purchaseOrder" po
       ON po."id" = cor."purchaseOrderId"
      AND po."isTest" = FALSE
      AND po."isFalseOrder" = FALSE
      AND po."markedPendingTime" >= ${DEFAULT_LOOKBACK}
LEFT JOIN "users"."buyer"  b ON b."id" = po."buyerId"  AND b."isTest" = FALSE
LEFT JOIN "users"."seller" s ON s."id" = po."sellerId" AND s."isTest" = FALSE
WHERE o."isTest" = FALSE
  AND (b."businessName" NOT ILIKE '%test%' OR b."id" IS NULL)
  AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL);
`;

// ─── Offers list (live & scheduled) ─────────────────────────────────────────
// NOTE: This is hit by /api/offers which the Deactivate button refreshes.
// MUST NOT be cached — keep it fast via the index on (type, created_at).
export const OFFERS_LIST_SQL = `
SELECT
  "id",
  "code",
  "code"                               AS coupon_name,
  CASE
    WHEN "isActive" = true AND "activationTime" > NOW() AND "expiryTime" > NOW() THEN 'SCHEDULED'
    WHEN "isActive" = true AND "activationTime" <= NOW() AND "expiryTime" > NOW() THEN 'LIVE'
    ELSE 'INACTIVE'
  END                                   AS offer_status,
  "discountDetails"->>'type'           AS discount_type,
  ("discountDetails"->>'value')::numeric AS discount_value,
  COALESCE(("discountDetails"->>'cap')::numeric, 0)::text AS discount_cap,
  "minimumOrderValue"::text            AS min_order_value,
  CASE WHEN "discountDetails"->>'type' = 'conditional'
    THEN ("discountDetails"->>'cap')::numeric
    ELSE ("discountDetails"->>'value')::numeric
  END                                   AS max_discount,
  "activationTime"                     AS start_time,
  "expiryTime"                         AS end_time,
  "maxUsageCount"                      AS usage_limit,
  "currentUsageCount"                  AS usage_count,
  "created_at"                         AS created_at,
  "metaDetails"                        AS meta_details,
  "conditionId"                        AS condition_id,
  "internalDescription"                AS internal_description,
  "maxUsagePerUser"                    AS max_usage_per_user,
  "isActive",
  "isTest"
FROM "promotions"."offer"
WHERE "type" = 'COUPON'
ORDER BY "created_at" DESC
LIMIT 200;
`;

// ─── Coupon-wise performance ─────────────────────────────────────────────────
export const COUPON_PERFORMANCE_SQL = `
SELECT
  o."code"                               AS coupon_name,
  o."code",
  COUNT(DISTINCT po."poNumber")::text AS usage_count,
  ROUND(
    COUNT(DISTINCT po."poNumber") * 100.0 / NULLIF(SUM(COUNT(DISTINCT po."poNumber")) OVER (), 0),
    2
  )::text                              AS usage_share_pct,
  ROUND(COALESCE(SUM(po."appliedOfferDiscount"), 0) / NULLIF(COUNT(DISTINCT po."poNumber"), 0), 2)::text AS avg_coupon_pct,
  ROUND(COALESCE(SUM(po."appliedOfferDiscount"), 0), 2)::text AS total_discount_burn,
  ROUND(COALESCE(SUM(po."amount"), 0), 2)::text AS total_revenue,
  ROUND(COALESCE(AVG(po."amount"), 0), 2)::text AS avg_order_value,
  ROUND((SUM(COALESCE(po."appliedOfferDiscount", 0)) * 100.0) / NULLIF(SUM(po."amount"), 0), 2)::text AS discount_pct_of_revenue
FROM "promotions"."offer" o
JOIN "promotions"."offerReservation" cor
     ON cor."offerId" = o."id" AND cor."status" = 'APPLIED'
JOIN "purchaseOrder"."purchaseOrder" po
     ON po."id" = cor."purchaseOrderId"
    AND po."isTest" = FALSE
    AND po."isFalseOrder" = FALSE
    AND po."markedPendingTime" >= ${DEFAULT_LOOKBACK}
JOIN "users"."buyer"  b ON b."id" = po."buyerId"  AND b."isTest" = FALSE
LEFT JOIN "users"."seller" s ON s."id" = po."sellerId" AND s."isTest" = FALSE
WHERE o."isTest" = FALSE
  AND o."type" = 'COUPON'
  AND b."businessName" NOT ILIKE '%test%'
  AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL)
GROUP BY o."id", o."code"
ORDER BY SUM(po."appliedOfferDiscount") DESC
LIMIT 50;
`;

// ─── Hourly trend ────────────────────────────────────────────────────────────
export const HOURLY_TREND_SQL = `
SELECT
  DATE_TRUNC('hour', po."markedPendingTime") AS hour_bucket,
  COUNT(DISTINCT po."poNumber")::text AS coupon_orders,
  ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2)::text AS discount_burn,
  ROUND(SUM(po."amount"), 2)::text AS revenue
FROM "promotions"."offerReservation" cor
JOIN "promotions"."offer" o ON o."id" = cor."offerId"
JOIN "purchaseOrder"."purchaseOrder" po
     ON po."id" = cor."purchaseOrderId"
    AND po."isTest" = FALSE
    AND po."isFalseOrder" = FALSE
    AND po."markedPendingTime" >= NOW() - INTERVAL '7 days'
JOIN "users"."buyer"  b ON b."id" = po."buyerId"  AND b."isTest" = FALSE
LEFT JOIN "users"."seller" s ON s."id" = po."sellerId" AND s."isTest" = FALSE
WHERE cor."status" = 'APPLIED'
  AND o."isTest" = FALSE
  AND o."type" = 'COUPON'
  AND b."businessName" NOT ILIKE '%test%'
  AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL)
GROUP BY 1
ORDER BY 1;
`;

// ─── Daily trend ─────────────────────────────────────────────────────────────
export const DAILY_TREND_SQL = `
SELECT
  DATE_TRUNC('day', po."markedPendingTime") AS day_bucket,
  COUNT(DISTINCT po."poNumber")::text AS coupon_orders,
  ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2)::text AS discount_burn,
  ROUND(SUM(po."amount"), 2)::text AS revenue
FROM "promotions"."offerReservation" cor
JOIN "promotions"."offer" o ON o."id" = cor."offerId"
JOIN "purchaseOrder"."purchaseOrder" po
     ON po."id" = cor."purchaseOrderId"
    AND po."isTest" = FALSE
    AND po."isFalseOrder" = FALSE
    AND po."markedPendingTime" >= NOW() - INTERVAL '30 days'
JOIN "users"."buyer"  b ON b."id" = po."buyerId"  AND b."isTest" = FALSE
LEFT JOIN "users"."seller" s ON s."id" = po."sellerId" AND s."isTest" = FALSE
WHERE cor."status" = 'APPLIED'
  AND o."isTest" = FALSE
  AND o."type" = 'COUPON'
  AND b."businessName" NOT ILIKE '%test%'
  AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL)
GROUP BY 1
ORDER BY 1;
`;

// ─── Failure analysis (status distribution) ────────────────────────────────
export const FAILURE_ANALYSIS_SQL = `
SELECT
  CASE
    WHEN "isActive" = true AND "expiryTime" > NOW() THEN 'ACTIVE'
    WHEN "expiryTime" <= NOW() THEN 'EXPIRED'
    WHEN "activationTime" > NOW() THEN 'SCHEDULED'
    ELSE 'INACTIVE'
  END AS status,
  COUNT(*)::text AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2)::text AS pct
FROM "promotions"."offer"
WHERE "isTest" = FALSE
GROUP BY status
ORDER BY count DESC;
`;

// ─── Users exceeding max coupon usage per user ──────────────────────────────
export const COUPON_MAX_USAGE_VIOLATIONS_SQL = `
WITH user_coupon_usage AS (
  SELECT
    b."id" AS buyer_id,
    b."businessName" AS buyer_name,
    o."code",
    o."maxUsagePerUser",
    COUNT(*) AS usage_count,
    CASE WHEN COUNT(*) >= COALESCE(o."maxUsagePerUser", 999999) THEN 'At Limit' ELSE 'Within Limit' END AS status
  FROM "promotions"."offerReservation" cor
  JOIN "purchaseOrder"."purchaseOrder" po
       ON po."id" = cor."purchaseOrderId"
      AND po."isTest" = FALSE
      AND po."isFalseOrder" = FALSE
      AND po."markedPendingTime" >= ${DEFAULT_LOOKBACK}
  JOIN "users"."buyer"  b ON b."id" = po."buyerId" AND b."isTest" = FALSE
  JOIN "promotions"."offer" o ON o."id" = cor."offerId" AND o."isTest" = FALSE
  WHERE cor."status" IN ('APPLIED', 'RESERVED', 'CANCELLED')
    AND b."businessName" NOT ILIKE '%test%'
  GROUP BY b."id", b."businessName", o."code", o."maxUsagePerUser"
)
SELECT
  COUNT(*) FILTER (WHERE status = 'At Limit')::text AS reached_limit_count,
  COUNT(*)::text AS total_buyer_coupon_combinations,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'At Limit') * 100.0 / NULLIF(COUNT(*), 0),
    2
  )::text AS limit_reached_percentage,
  SUM(usage_count)::text AS total_coupon_uses
FROM user_coupon_usage;
`;

// ─── Details: Buyers who reached max usage limit ──────────────────────────────
export const BUYERS_AT_COUPON_LIMIT_SQL = `
WITH user_coupon_usage AS (
  SELECT
    b."id" AS buyer_id,
    b."businessName" AS buyer_name,
    b."phone" AS buyer_phone,
    o."code",
    o."maxUsagePerUser",
    COUNT(*) AS usage_count
  FROM "promotions"."offerReservation" cor
  JOIN "purchaseOrder"."purchaseOrder" po
       ON po."id" = cor."purchaseOrderId"
      AND po."isTest" = FALSE
      AND po."isFalseOrder" = FALSE
      AND po."markedPendingTime" >= ${DEFAULT_LOOKBACK}
  JOIN "users"."buyer"  b ON b."id" = po."buyerId" AND b."isTest" = FALSE
  JOIN "promotions"."offer" o ON o."id" = cor."offerId" AND o."isTest" = FALSE
  WHERE cor."status" IN ('APPLIED', 'RESERVED', 'CANCELLED')
    AND b."businessName" NOT ILIKE '%test%'
  GROUP BY b."id", b."businessName", b."phone", o."code", o."maxUsagePerUser"
  HAVING COUNT(*) >= COALESCE(o."maxUsagePerUser", 999999)
)
SELECT
  buyer_name,
  buyer_phone,
  code,
  usage_count::text,
  "maxUsagePerUser"::text,
  (usage_count - COALESCE("maxUsagePerUser", 0))::text AS exceeded_by
FROM user_coupon_usage
ORDER BY exceeded_by DESC, usage_count DESC
LIMIT 50;
`;

// ─── High-discount offers ───────────────────────────────────────────────────
export const HIGH_DISCOUNT_ORDERS_SQL = `
SELECT
  "code"                               AS po_number,
  (1000000)::text                      AS order_amount,
  ("discountDetails"->>'value')::numeric::text AS discount,
  ("discountDetails"->>'value')::numeric::text AS coupon_pct,
  "code"                               AS coupon_name,
  "updated_at"                         AS order_time
FROM "promotions"."offer"
WHERE "isTest" = FALSE
  AND ("discountDetails"->>'value')::numeric > 30
ORDER BY ("discountDetails"->>'value')::numeric DESC
LIMIT 50;
`;

// ─── Coupon-wise burn and metrics ────────────────────────────────────────────
export const COUPON_WISE_BURN_SQL = `
SELECT
  o."code"                             AS coupon_code,
  o."code"                             AS coupon_name,
  COUNT(DISTINCT po."poNumber")::text  AS total_coupon_usage_count,
  COUNT(DISTINCT po."poNumber")::text AS applied_order_count,
  ROUND(SUM(po."amount"), 2)::text     AS total_order_value,
  ROUND(SUM(COALESCE(po."appliedOfferDiscount", 0)), 2)::text AS total_discount_burn,
  ROUND(
    SUM(COALESCE(po."appliedOfferDiscount", 0)) / NULLIF(COUNT(DISTINCT po."poNumber"), 0),
    2
  )::text                              AS avg_discount_per_order,
  ROUND(
    (SUM(COALESCE(po."appliedOfferDiscount", 0)) / NULLIF(SUM(po."amount"), 0)) * 100,
    2
  )::text                              AS avg_discount_percentage
FROM "promotions"."offerReservation" cor
JOIN "promotions"."offer" o ON o."id" = cor."offerId" AND o."isTest" = FALSE AND o."type" = 'COUPON'
JOIN "purchaseOrder"."purchaseOrder" po
     ON po."id" = cor."purchaseOrderId"
    AND po."isTest" = FALSE
    AND po."isFalseOrder" = FALSE
    AND po."markedPendingTime" >= ${DEFAULT_LOOKBACK}
JOIN "users"."buyer"  b ON b."id" = po."buyerId"  AND b."isTest" = FALSE
LEFT JOIN "users"."seller" s ON s."id" = po."sellerId" AND s."isTest" = FALSE
WHERE cor."status" = 'APPLIED'
  AND b."businessName" NOT ILIKE '%test%'
  AND (s."businessName" NOT ILIKE '%test%' OR s."id" IS NULL)
GROUP BY o."id", o."code"
ORDER BY SUM(COALESCE(po."appliedOfferDiscount", 0)) DESC
LIMIT 100;
`;
