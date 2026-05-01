import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'Phone parameter required' }, { status: 400 });
  }

  try {
    const rows = await query<{
      id: string;
      name: string;
      business_name: string;
      phone: string;
    }>(
      `SELECT
        "id",
        "name",
        "businessName" as business_name,
        "phone"
      FROM "users"."buyer"
      WHERE "phone" ILIKE $1
        AND "isTest" = FALSE
      ORDER BY "businessName" ASC
      LIMIT 10`,
      [`%${phone}%`]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
