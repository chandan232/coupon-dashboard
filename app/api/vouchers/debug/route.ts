import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Fetch all vouchers from database
    const sql = `
      SELECT
        o."id",
        o."code",
        o."isActive",
        o."isTest",
        o."activationTime" AS start_time,
        o."expiryTime" AS end_time,
        o."created_at",
        o."type"
      FROM "promotions"."offer" o
      WHERE o."type" ILIKE '%voucher%'
      ORDER BY o."created_at" DESC;
    `;

    const rows = await query<any>(sql, []);

    const now = new Date();

    // Analyze each voucher
    const analysis = rows.map((v: any) => {
      const isActive = v.isActive === true;
      const expiryTime = new Date(v.end_time);
      const activationTime = new Date(v.start_time);

      let category = 'UNKNOWN';
      let reason = '';

      if (isActive && expiryTime > now) {
        category = 'ACTIVE';
        reason = `isActive=${isActive} AND expiryTime(${v.end_time}) > now`;
      } else if (activationTime > now) {
        category = 'SCHEDULED';
        reason = `activationTime(${v.start_time}) > now`;
      } else {
        category = 'INACTIVE';
        reason = `!(isActive && expiryTime > now) AND !(activationTime > now)`;
      }

      return {
        code: v.code,
        id: v.id,
        isActive,
        isTest: v.isTest,
        start_time: v.start_time,
        end_time: v.end_time,
        created_at: v.created_at,
        type: v.type,
        category,
        reason,
        activation_time_valid: activationTime instanceof Date && !isNaN(activationTime.getTime()),
        expiry_time_valid: expiryTime instanceof Date && !isNaN(expiryTime.getTime()),
      };
    });

    const summary = {
      total_in_db: rows.length,
      active_count: analysis.filter((a: any) => a.category === 'ACTIVE').length,
      scheduled_count: analysis.filter((a: any) => a.category === 'SCHEDULED').length,
      inactive_count: analysis.filter((a: any) => a.category === 'INACTIVE').length,
      unknown_count: analysis.filter((a: any) => a.category === 'UNKNOWN').length,
      current_time: now.toISOString(),
      raw_data: rows,
      analysis: analysis,
    };

    return NextResponse.json(summary);
  } catch (err) {
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
