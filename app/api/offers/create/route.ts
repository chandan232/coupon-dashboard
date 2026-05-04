import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

/**
 * Look up the employee's name from "employeeBase"."employee" by email.
 * Returns the name, or null if not found.
 */
async function lookupEmployeeName(email: string): Promise<string | null> {
  if (!email) return null;
  try {
    const rows = await query<{ name: string | null }>(
      `SELECT name FROM "employeeBase"."employee" WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );
    if (rows.length > 0 && rows[0].name) {
      return rows[0].name;
    }
    return null;
  } catch (err) {
    console.error('Employee lookup error:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
      createdByEmail,
    } = body;

    if (!code || !discountDetails || !metaDetails) {
      return NextResponse.json(
        { error: 'Code, discount details, and meta details are required' },
        { status: 400 }
      );
    }

    // Look up the employee name from the email used to log in.
    // Falls back to whatever was sent (or 'System') if the lookup fails.
    const lookedUpName = await lookupEmployeeName(createdByEmail);
    const createdByName = lookedUpName || body.createdBy || 'System';
    console.log(`Coupon createdBy resolved: email=${createdByEmail} -> name="${createdByName}"`);

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
        "type",
        "createdBy"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, 'PLATFORM', 'COUPON', $13
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
      createdByName,
    ]);

    return NextResponse.json({ data: result[0] });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
