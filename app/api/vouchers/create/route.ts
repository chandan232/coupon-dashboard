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
    console.log('Voucher create request:', body);

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
      buyerId,
      conditionIdWithoutPOContext,
      conditionIdWithPOContext,
      createdByEmail,
    } = body;

    if (!code || !discountDetails || !metaDetails || !buyerId) {
      const errorMsg = `Missing required fields: code=${!!code}, discountDetails=${!!discountDetails}, metaDetails=${!!metaDetails}, buyerId=${!!buyerId}`;
      console.error(errorMsg);
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    // Look up the employee name from the email used to log in.
    // Falls back to whatever was sent (or 'System') if the lookup fails.
    const lookedUpName = await lookupEmployeeName(createdByEmail);
    const createdByName = lookedUpName || body.createdBy || 'System';
    console.log(`Voucher createdBy resolved: email=${createdByEmail} -> name="${createdByName}"`);

    // Build INSERT statement dynamically to handle optional condition ID fields
    const columns = [
      '"code"',
      '"discountDetails"',
      '"metaDetails"',
      '"budgetDistribution"',
      '"minimumOrderValue"',
      '"maxUsageCount"',
      '"maxUsagePerUser"',
      '"internalDescription"',
      '"activationTime"',
      '"expiryTime"',
      '"isActive"',
      '"isTest"',
      '"currentUsageCount"',
      '"owner"',
      '"type"',
      '"buyerId"',
      '"createdBy"',
    ];

    const values: unknown[] = [
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
      0, // currentUsageCount
      'PLATFORM', // owner
      'VOUCHER', // type
      buyerId,
      createdByName, // createdBy = name looked up from employeeBase.employee
    ];

    // Add condition ID fields if they're provided and not null
    if (conditionIdWithoutPOContext !== null && conditionIdWithoutPOContext !== undefined) {
      columns.push('"conditionIdWithoutPOContext"');
      values.push(conditionIdWithoutPOContext);
    }

    if (conditionIdWithPOContext !== null && conditionIdWithPOContext !== undefined) {
      columns.push('"conditionIdWithPOContext"');
      values.push(conditionIdWithPOContext);
    }

    const placeholders = Array.from({ length: values.length }, (_, i) => `$${i + 1}`);

    const sql = `
      INSERT INTO "promotions"."offer" (
        ${columns.join(', ')}
      ) VALUES (
        ${placeholders.join(', ')}
      )
      RETURNING *;
    `;

    console.log('Executing SQL query for voucher creation');
    const result = await query(sql, values);

    console.log('Voucher creation result:', result);
    return NextResponse.json({ data: result[0] });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    console.error('Voucher creation error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
