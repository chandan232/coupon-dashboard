import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { OFFERS_LIST_SQL } from '@/lib/queries';

// Force dynamic rendering on every request — never cache.
// Without this, Next.js statically prerenders this GET route at build
// time, so every call returns the same stale snapshot regardless of
// what /api/offers/deactivate or /activate does to the database.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await query(OFFERS_LIST_SQL);
    return NextResponse.json(
      { data: rows },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    );
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
