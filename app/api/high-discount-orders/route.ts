import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { HIGH_DISCOUNT_ORDERS_SQL } from '@/lib/queries';

export async function GET() {
  try {
    const rows = await query(HIGH_DISCOUNT_ORDERS_SQL);
    return NextResponse.json({ data: rows });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
