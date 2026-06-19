import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { resolveActiveSupportEmployee, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Session validity check called by AuthGuard on every page load. A token is
// only good if it (1) verifies against the shared secret, (2) was minted via
// Google SSO (method claim — legacy passwordless tokens don't have it), and
// (3) still belongs to an active Support employee. Anything else gets 401/403
// and the client purges the session, forcing a fresh Google sign-in.
export async function GET(req: NextRequest) {
  const header = req.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return NextResponse.json({ ok: false, error: 'No token' }, { status: 401 });
  }
  try {
    const claims = jwt.verify(match[1], JWT_SECRET) as { email?: string; method?: string };
    if (claims.method !== 'google') {
      return NextResponse.json(
        { ok: false, error: 'Legacy session — please sign in with Google' },
        { status: 401 }
      );
    }
    if (!claims.email) {
      return NextResponse.json({ ok: false, error: 'Token missing email' }, { status: 401 });
    }
    await resolveActiveSupportEmployee(claims.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 401 });
  }
}
