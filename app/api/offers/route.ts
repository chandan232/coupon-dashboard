import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { OFFERS_LIST_SQL } from '@/lib/queries';

export async function GET() {
  try {
    const rows = await query(OFFERS_LIST_SQL);
    return NextResponse.json({ data: rows });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
