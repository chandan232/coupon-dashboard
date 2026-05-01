import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const buyerId = searchParams.get('buyerId');

  if (!buyerId) {
    return NextResponse.json({ error: 'buyerId parameter required' }, { status: 400 });
  }

  try {
    const rows = await query<{
      id: string;
      name: string;
      phone: string;
      businessName: string;
      city: string;
      addressLine1: string;
      state: string;
      district: string;
    }>(
      `SELECT
        "id",
        "name",
        "phone",
        "businessName",
        "city",
        "addressLine1",
        "state",
        "district"
      FROM "users"."buyer"
      WHERE "id" = $1`,
      [buyerId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
