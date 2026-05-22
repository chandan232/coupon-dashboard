import { NextResponse, NextRequest } from 'next/server';
import { query, invalidateCache } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { voucherId, isActive } = await req.json();

    console.log('Toggle Status Request:', { voucherId, isActive });

    if (!voucherId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'voucherId and isActive are required' }, { status: 400 });
    }

    // Update the offer status
    // When deactivating (isActive = false), also set isTest = true
    // When activating (isActive = true), also set isTest = false
    const result = await query(
      `UPDATE "promotions"."offer"
       SET "isActive" = $1, "isTest" = $2, "updated_at" = NOW()
       WHERE "id" = $3 AND "type" = 'VOUCHER'`,
      [isActive, !isActive, voucherId]
    );

    console.log('Update Result:', result);

    // Drop cached dashboard aggregates so the toggle reflects immediately.
    invalidateCache();

    return NextResponse.json({
      success: true,
      message: isActive ? 'Voucher activated' : 'Voucher deactivated',
      updated: {
        isActive: isActive,
        isTest: !isActive
      }
    });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    console.error('Toggle Status Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
