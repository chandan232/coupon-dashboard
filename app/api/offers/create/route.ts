import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const {
      code,
      discountDetails,
      metaDetails,
      minimumOrderValue,
      maxUsageCount,
      maxUsagePerUser,
      internalDescription,
      activationTime,
      expiryTime,
      isActive,
      isTest,
    } = await req.json();

    if (!code || !discountDetails || !metaDetails) {
      return NextResponse.json(
        { error: 'Code, discount details, and meta details are required' },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO "promotions"."offer" (
        "code",
        "discountDetails",
        "metaDetails",
        "budgetDistribution",
        "minimumOrderValue",
        "maxUsageCount",
        "maxUsagePerUser",
        "internalDescription",
        "activationTime",
        "expiryTime",
        "isActive",
        "isTest",
        "currentUsageCount",
        "owner",
        "type"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, 'PLATFORM', 'COUPON'
      )
      RETURNING *;
    `;

    const result = await query(sql, [
      code,
      JSON.stringify(discountDetails),
      JSON.stringify(metaDetails),
      JSON.stringify({}), // budgetDistribution - empty object
      minimumOrderValue,
      maxUsageCount,
      maxUsagePerUser,
      internalDescription,
      activationTime,
      expiryTime,
      isActive,
      isTest,
    ]);

    return NextResponse.json({ data: result[0] });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
