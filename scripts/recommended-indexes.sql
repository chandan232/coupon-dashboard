-- =============================================================================
-- RECOMMENDED INDEXES — apply on the production Postgres
-- =============================================================================
-- These complement the application-level fixes (query caching + removal of
-- leading-wildcard ILIKE) and target the join patterns the dashboard hits
-- on every load.
--
-- All indexes use CONCURRENTLY so they can be added without blocking writes
-- on hot tables. Run them one at a time during low-traffic hours.
-- =============================================================================

-- ─── purchaseOrder (the biggest, hottest table) ────────────────────────────
-- The dashboard scans this table for every aggregation, almost always
-- filtered by markedPendingTime and (isTest=false, isFalseOrder=false).
-- A partial index on the "good" rows keeps the index small and fast.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_pendingtime_filtered
  ON "purchaseOrder"."purchaseOrder" ("markedPendingTime" DESC)
  WHERE "isTest" = FALSE AND "isFalseOrder" = FALSE;

-- Joins on appliedOfferReservationId (LEFT JOIN to offerReservation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_applied_offer_reservation
  ON "purchaseOrder"."purchaseOrder" ("appliedOfferReservationId")
  WHERE "appliedOfferReservationId" IS NOT NULL;

-- buyerId / sellerId joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_buyerid
  ON "purchaseOrder"."purchaseOrder" ("buyerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_sellerid
  ON "purchaseOrder"."purchaseOrder" ("sellerId");

-- ─── offerReservation (mid-volume join table) ──────────────────────────────
-- Status='APPLIED' filter appears in nearly every dashboard query.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_or_status_purchaseorder
  ON "promotions"."offerReservation" ("status", "purchaseOrderId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_or_offerid
  ON "promotions"."offerReservation" ("offerId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_or_buyerid
  ON "promotions"."offerReservation" ("buyerId");

-- ─── offer ─────────────────────────────────────────────────────────────────
-- Almost every dashboard query filters by (type='COUPON' AND isTest=FALSE)
-- and orders by created_at; a composite partial index nails it.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offer_type_created
  ON "promotions"."offer" ("type", "created_at" DESC)
  WHERE "isTest" = FALSE;

-- code lookups (single-coupon detail modal)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offer_code
  ON "promotions"."offer" ("code");

-- ─── buyer / seller (test-account filtering) ───────────────────────────────
-- Queries do BOTH `isTest = FALSE` AND `businessName NOT ILIKE '%test%'`.
-- isTest is the cheap check via this partial index on id, after which the
-- result set is small enough that the businessName ILIKE filter doesn't
-- dominate cost.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buyer_real
  ON "users"."buyer" ("id")
  WHERE "isTest" = FALSE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seller_real
  ON "users"."seller" ("id")
  WHERE "isTest" = FALSE;

-- Optional but recommended: pg_trgm GIN index makes the
-- `NOT ILIKE '%test%'` filter index-backed instead of forcing a per-row
-- regex match. Trade-off: indexes take ~2-3× the size of a btree.
-- Skip if disk pressure matters more than query speed.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buyer_businessname_trgm
  ON "users"."buyer" USING gin ("businessName" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seller_businessname_trgm
  ON "users"."seller" USING gin ("businessName" gin_trgm_ops);

-- ─── employee (login lookup) ───────────────────────────────────────────────
-- Email-only login does a LOWER(email) match — needs a functional index.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_email_lower
  ON "employeeBase"."employee" (LOWER("email"));

-- ─── Run ANALYZE so the planner sees the new indexes ───────────────────────
ANALYZE "purchaseOrder"."purchaseOrder";
ANALYZE "promotions"."offerReservation";
ANALYZE "promotions"."offer";
ANALYZE "users"."buyer";
ANALYZE "users"."seller";
ANALYZE "employeeBase"."employee";

-- =============================================================================
-- VERIFICATION — run after the indexes are created
-- =============================================================================
-- 1. Confirm they're being used
-- EXPLAIN ANALYZE SELECT * FROM "purchaseOrder"."purchaseOrder"
--   WHERE "isTest" = FALSE AND "isFalseOrder" = FALSE
--     AND "markedPendingTime" >= NOW() - INTERVAL '7 days';
--
-- Look for "Index Scan using idx_po_pendingtime_filtered" — NOT "Seq Scan".
--
-- 2. Check overall index health
-- SELECT schemaname, relname, indexrelname, idx_scan, idx_tup_read
-- FROM pg_stat_user_indexes
-- WHERE schemaname IN ('purchaseOrder', 'promotions', 'users', 'employeeBase')
-- ORDER BY idx_scan DESC;
