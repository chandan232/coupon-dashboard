import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from './db';

// /api/auth/google-login is the ONLY token minter. After a verified Clerk /
// Google SSO session, it looks the email up in employeeBase.employee, requires
// an active Support-role row, and signs { id (= employeeId), email, name, role,
// method: 'google' } with this secret and a 7-day expiry. Everything here
// verifies that token before trusting any "who made this call" claim.

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthClaims {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  // Only tokens minted via Google SSO carry this. Required — see requireAuth.
  method?: string;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Pull the Bearer token off Authorization, verify with the shared secret, and
// return the JWT payload. Rejects anything not minted via Google SSO so no
// route can be reached with a hand-made or legacy passwordless token.
export function requireAuth(req: NextRequest): AuthClaims {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header) throw new AuthError('Authorization header missing', 401);
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw new AuthError('Authorization header must be "Bearer <token>"', 401);
  try {
    const decoded = jwt.verify(match[1], JWT_SECRET) as AuthClaims;
    if (!decoded?.id || !decoded?.email) {
      throw new AuthError('Auth token is missing id/email claims', 401);
    }
    if (decoded.method !== 'google') {
      throw new AuthError('Session not authenticated via Google SSO — please sign in again', 401);
    }
    return decoded;
  } catch (e) {
    if (e instanceof AuthError) throw e;
    throw new AuthError(`Auth token verification failed: ${e instanceof Error ? e.message : String(e)}`, 401);
  }
}

export interface SupportEmployee {
  employeeId: string;
  email: string;
  name: string | null;
  role: string | null;
}

// Authorization gate shared by /api/auth/google-login and /api/auth/validate:
// the email must belong to an active employee whose role is Support. Returns
// the row or throws AuthError(401/403) describing why access was refused.
export async function resolveActiveSupportEmployee(email: string): Promise<SupportEmployee> {
  const rows = await query<{
    employeeId: string;
    email: string;
    name: string | null;
    role: string | null;
    isActive: boolean | null;
  }>(
    `SELECT "employeeId", email, name, role, "isActive"
       FROM "employeeBase"."employee"
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1;`,
    [email.toLowerCase().trim()],
  );

  if (rows.length === 0) {
    throw new AuthError('This email is not registered. Please contact your administrator.', 401);
  }
  const employee = rows[0];
  if (employee.isActive !== true) {
    throw new AuthError('Your account is inactive. Please contact your administrator.', 403);
  }
  if (employee.role?.toLowerCase() !== 'support') {
    throw new AuthError('Only Support staff can access this portal.', 403);
  }
  return {
    employeeId: employee.employeeId,
    email: employee.email,
    name: employee.name,
    role: employee.role,
  };
}
