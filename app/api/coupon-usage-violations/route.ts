import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { COUPON_MAX_USAGE_VIOLATIONS_SQL, BUYERS_AT_COUPON_LIMIT_SQL } from '@/lib/queries';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let violationStatsSQL = COUPON_MAX_USAGE_VIOLATIONS_SQL;
    let violationDetailsSQL = BUYERS_AT_COUPON_LIMIT_SQL;

    // Add date filter if provided
    if (startDate && endDate) {
      violationStatsSQL = `
        WITH user_coupon_usage AS (
          SELECT
            b."id" AS buyer_id,
            b."businessName" AS buyer_name,
            o."code",
            o."maxUsagePerUser",
            COUNT(*) AS usage_count,
            CASE WHEN COUNT(*) >= COALESCE(o."maxUsagePerUser", 999999) THEN 'At Limit' ELSE 'Within Limit' END AS status
          FROM "promotions"."offerReservation" cor
          JOIN "purchaseOrder"."purchaseOrder" po ON po."id" = cor."purchaseOrderId"
          JOIN "users"."buyer" b ON b."id" = po."buyerId"
          JOIN "promotions"."offer" o ON o."id" = cor."offerId"
          WHERE o."isTest" = FALSE
            AND b."isTest" = FALSE
            AND po."isTest" = FALSE
            AND po."isFalseOrder" = FALSE
            AND cor."status" IN ('APPLIED', 'RESERVED', 'CANCELLED')
            AND po."markedPendingTime"::date >= $1 AND po."markedPendingTime"::date <= $2
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

      violationDetailsSQL = `
        SELECT
          b."businessName" AS buyer_name,
          b."phone" AS buyer_phone,
          o."code",
          COUNT(cor."id")::text AS usage_count,
          COALESCE(o."maxUsagePerUser", 999999)::text AS maxUsagePerUser,
          (COUNT(cor."id") - COALESCE(o."maxUsagePerUser", 999999))::text AS exceeded_by
        FROM "users"."buyer" b
        JOIN "promotions"."offerReservation" cor ON cor."buyerId" = b."id"
        JOIN "promotions"."offer" o ON o."id" = cor."offerId"
        JOIN "purchaseOrder"."purchaseOrder" po ON po."id" = cor."purchaseOrderId"
        WHERE b."isTest" = FALSE
          AND b."businessName" NOT ILIKE '%test%'
          AND o."isTest" = FALSE
          AND po."markedPendingTime"::date >= $1 AND po."markedPendingTime"::date <= $2
        GROUP BY b."id", b."businessName", b."phone", o."id", o."code", o."maxUsagePerUser"
        HAVING COUNT(cor."id") > COALESCE(o."maxUsagePerUser", 999999)
        ORDER BY exceeded_by DESC
        LIMIT 100;
      `;

      const [violationStats, violationDetails] = await Promise.all([
        query(violationStatsSQL, [startDate, endDate]),
        query(violationDetailsSQL, [startDate, endDate]),
      ]);

      return NextResponse.json({
        data: {
          stats: violationStats[0] ?? {},
          details: violationDetails ?? [],
        },
      });
    }

    const [violationStats, violationDetails] = await Promise.all([
      query(COUPON_MAX_USAGE_VIOLATIONS_SQL),
      query(BUYERS_AT_COUPON_LIMIT_SQL),
    ]);

    return NextResponse.json({
      data: {
        stats: violationStats[0] ?? {},
        details: violationDetails ?? [],
      },
    });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
