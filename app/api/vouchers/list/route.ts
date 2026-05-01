import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isActive = searchParams.get('isActive');

  try {
    let sql = `
      SELECT
        o."id",
        o."code",
        o."code" AS coupon_name,
        CASE
          WHEN o."isActive" = true AND o."expiryTime" > NOW() THEN 'LIVE'
          WHEN o."activationTime" > NOW() THEN 'SCHEDULED'
          ELSE 'INACTIVE'
        END AS offer_status,
        o."discountDetails"->>'type' AS discount_type,
        (o."discountDetails"->>'value')::numeric AS discount_value,
        o."minimumOrderValue"::text AS min_order_value,
        o."maxUsageCount" AS usage_limit,
        o."currentUsageCount" AS usage_count,
        o."created_at",
        o."activationTime" AS start_time,
        o."expiryTime" AS end_time,
        o."internalDescription" AS internal_description,
        o."maxUsagePerUser" AS max_usage_per_user,
        o."isActive",
        o."isTest",
        o."buyerId",
        b."phone" AS buyer_phone,
        b."businessName" AS buyer_business_name
      FROM "promotions"."offer" o
      LEFT JOIN "users"."buyer" b ON o."buyerId" = b."id"
      WHERE o."type" = 'VOUCHER'
    `;

    const params: (string | boolean)[] = [];

    if (isActive === 'true') {
      sql += ` AND "isActive" = true`;
    } else if (isActive === 'false') {
      sql += ` AND "isActive" = false`;
    }

    sql += ` ORDER BY "created_at" DESC LIMIT 200`;

    const rows = await query<any>(sql, params);

    return NextResponse.json({ data: rows });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
