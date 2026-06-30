import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Approve / Reject / Resubmit a KYC application.
//
// This is the only mutating endpoint in the dashboard, so it is gated by the
// internal Bearer JWT (Google-SSO Support employees only). It writes the new
// status, stamps the decision (category + remarks + who + when) into the
// response JSONB for audit, and — on approval — sets markedVerifiedTime.
const ACTION_STATUS: Record<string, string> = {
  approve: 'VERIFIED',
  reject: 'FAILED',
  resubmit: 'RESUBMIT',
};

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);

    const body = await req.json().catch(() => ({}));
    const { verificationId, action, reasonCategory, remarks } = body as {
      verificationId?: string;
      action?: string;
      reasonCategory?: string;
      remarks?: string;
    };

    if (!verificationId) {
      return NextResponse.json({ error: 'verificationId is required' }, { status: 400 });
    }
    const newStatus = action ? ACTION_STATUS[action] : undefined;
    if (!newStatus) {
      return NextResponse.json({ error: 'action must be approve | reject | resubmit' }, { status: 400 });
    }
    // Reject / Resubmit require a reason category (matches the modal contract).
    if (action !== 'approve' && !reasonCategory) {
      return NextResponse.json({ error: 'reasonCategory is required for reject/resubmit' }, { status: 400 });
    }

    const message =
      action === 'approve'
        ? remarks?.trim() || 'Approved'
        : [reasonCategory, remarks?.trim()].filter(Boolean).join(' — ');

    const decision = JSON.stringify({
      message,
      reasonCategory: reasonCategory || null,
      remarks: remarks?.trim() || null,
      decision: action,
      reviewedBy: auth.name || auth.email,
      reviewedByEmail: auth.email,
      reviewedById: auth.id,
      reviewedAt: new Date().toISOString(),
    });

    const sql = `
      UPDATE "businessVerification"."userBusinessVerification"
         SET "status" = $1,
             "response" = COALESCE("response", '{}'::jsonb) || $2::jsonb,
             "updated_at" = now()
             ${action === 'approve' ? `, "markedVerifiedTime" = now()` : ''}
       WHERE "id" = $3
       RETURNING "id", "status";`;

    const rows = await query<{ id: string; status: string }>(sql, [newStatus, decision, verificationId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: rows[0].id, status: rows[0].status });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('KYC action error:', err);
    return NextResponse.json(
      { error: 'Action failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
