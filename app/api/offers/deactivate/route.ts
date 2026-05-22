import { NextResponse, NextRequest } from 'next/server';
import { query, invalidateCache } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { offerId } = await req.json();

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    const sql = `
      UPDATE "promotions"."offer"
      SET "isTest" = true, "isActive" = false, "updated_at" = NOW()
      WHERE "id" = $1
      RETURNING *;
    `;

    const result = await query(sql, [offerId]);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Clear cached dashboard query results so the deactivated coupon
    // immediately disappears from LIVE-tab aggregations and shows up
    // wherever INACTIVE is counted.
    invalidateCache();

    return NextResponse.json({ data: result[0] });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
