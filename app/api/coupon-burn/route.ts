import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { COUPON_WISE_BURN_SQL } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await query(COUPON_WISE_BURN_SQL);

    return NextResponse.json({ data });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
