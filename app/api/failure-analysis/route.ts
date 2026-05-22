import { NextResponse, NextRequest } from 'next/server';
import { queryCached } from '@/lib/db';
import { FAILURE_ANALYSIS_SQL } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 120s cache — failure analysis is a status-distribution aggregate over
// the offer table (relatively small) so this is mainly to coalesce many
// concurrent dashboard loads into one DB hit.
const TTL_SECONDS = 120;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = FAILURE_ANALYSIS_SQL;
    const params: unknown[] = [];

    if (startDate && endDate) {
      sql = `
        SELECT
          a."status",
          COUNT(*)::text AS count,
          ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 2)::text AS pct
        FROM "promotions"."offerReservation" a
        JOIN "purchaseOrder"."purchaseOrder" b
             ON b."id" = a."purchaseOrderId"
            AND b."isTest" = FALSE
            AND b."isFalseOrder" = FALSE
            AND b."markedPendingTime" >= $1::timestamp
            AND b."markedPendingTime" <  ($2::timestamp + INTERVAL '1 day')
        JOIN "users"."buyer"  c ON c."id" = b."buyerId"  AND c."isTest" = FALSE
        LEFT JOIN "users"."seller" d ON d."id" = b."sellerId" AND d."isTest" = FALSE
        WHERE a."status" != 'APPLIED'
          AND b."amount" > 0
        GROUP BY 1
        ORDER BY count DESC;
      `;
      params.push(startDate, endDate);
    }

    const rows = await queryCached(sql, params, TTL_SECONDS);
    return NextResponse.json(
      { data: rows },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
