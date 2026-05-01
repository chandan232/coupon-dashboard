import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

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
    } = body;

    if (!code || !discountDetails || !metaDetails || !buyerId) {
      const errorMsg = `Missing required fields: code=${!!code}, discountDetails=${!!discountDetails}, metaDetails=${!!metaDetails}, buyerId=${!!buyerId}`;
      console.error(errorMsg);
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

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
    ];

    const values = [
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
    console.log('SQL:', sql);
    console.log('Values:', values);
    const result = await query(sql, values);

    console.log('Voucher creation result:', result);
    return NextResponse.json({ data: result[0] });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    console.error('Voucher creation error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
