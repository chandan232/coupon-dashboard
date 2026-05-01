import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { FAILURE_ANALYSIS_SQL } from '@/lib/queries';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = FAILURE_ANALYSIS_SQL;

    // Add date filter if provided
    if (startDate && endDate) {
      sql = `
        SELECT
          a."status",
          COUNT(*)::text AS count,
          ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 2)::text AS pct
        FROM "promotions"."offerReservation" a
        JOIN "purchaseOrder"."purchaseOrder" b ON b."id" = a."purchaseOrderId"
        JOIN "users"."buyer" c ON c."id" = b."buyerId"
        LEFT JOIN "users"."seller" d ON d."id" = b."sellerId"
        WHERE a."status" != 'APPLIED'
          AND b."amount" > 0
          AND c."isTest" = FALSE
          AND c."businessName" NOT ILIKE '%test%'
          AND b."isTest" = FALSE
          AND b."isFalseOrder" = FALSE
          AND (d."isTest" = FALSE OR d."id" IS NULL)
          AND (d."businessName" NOT ILIKE '%test%' OR d."id" IS NULL)
          AND b."markedPendingTime"::date >= $1 AND b."markedPendingTime"::date <= $2
        GROUP BY 1
        ORDER BY count DESC;
      `;
      const rows = await query(sql, [startDate, endDate]);
      return NextResponse.json({ data: rows });
    }

    const rows = await query(FAILURE_ANALYSIS_SQL);
    return NextResponse.json({ data: rows });
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
