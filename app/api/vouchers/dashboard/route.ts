import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Fetch voucher usage data
    const usageData = await query<any>(`
      SELECT
        of."code",
        of."id",
        COUNT(*) as total_applied,
        SUM(CASE WHEN a."status" = 'APPLIED' THEN 1 ELSE 0 END) as applied_count,
        COUNT(DISTINCT a."buyerId") as unique_buyers,
        (of."discountDetails"->>'value')::numeric as discount_value,
        of."discountDetails"->>'type' as discount_type
      FROM "promotions"."offerReservation" a
      JOIN "users"."buyer" c ON c."id" = a."buyerId"
      JOIN "promotions"."offer" of ON of."id" = a."offerId"
      WHERE
        a."status" = 'APPLIED'
        AND c."isTest" = false
        AND c."businessName" NOT ILIKE '%test%'
        AND of."type" ILIKE '%Voucher%'
      GROUP BY of."id", of."code", of."discountDetails"
      ORDER BY total_applied DESC
      LIMIT 20
    `, []);

    // Fetch overall metrics
    const metrics = await query<any>(`
      SELECT
        COUNT(*) as total_vouchers_applied,
        COUNT(DISTINCT a."buyerId") as total_buyers,
        COUNT(DISTINCT a."offerId") as total_vouchers_used,
        COUNT(*) as total_discount_given,
        COUNT(*) as total_order_value,
        COUNT(*) as avg_discount_per_order
      FROM "promotions"."offerReservation" a
      JOIN "users"."buyer" c ON c."id" = a."buyerId"
      JOIN "promotions"."offer" of ON of."id" = a."offerId"
      WHERE
        a."status" = 'APPLIED'
        AND c."isTest" = false
        AND c."businessName" NOT ILIKE '%test%'
        AND of."type" ILIKE '%Voucher%'
    `, []);

    // Fetch daily trend data
    const trends = await query<any>(`
      SELECT
        DATE(a."createdAt") as date,
        COUNT(*) as applications,
        COUNT(DISTINCT a."buyerId") as buyers
      FROM "promotions"."offerReservation" a
      JOIN "users"."buyer" c ON c."id" = a."buyerId"
      JOIN "promotions"."offer" of ON of."id" = a."offerId"
      WHERE
        a."status" = 'APPLIED'
        AND c."isTest" = false
        AND c."businessName" NOT ILIKE '%test%'
        AND of."type" ILIKE '%Voucher%'
        AND a."createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(a."createdAt")
      ORDER BY DATE(a."createdAt") DESC
    `, []);

    return NextResponse.json({
      metrics: metrics[0] || {},
      usage_by_voucher: usageData,
      trends: trends,
    });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    console.error('Voucher dashboard error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
