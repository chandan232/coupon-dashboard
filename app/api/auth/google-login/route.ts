import { NextResponse, NextRequest } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import jwt from 'jsonwebtoken';
import { resolveActiveSupportEmployee, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Exchange a verified Clerk (Google SSO) session for the internal JWT. Clerk
// only proves identity — authorization still comes from employeeBase.employee
// (active + Support role). The response shape matches the old email-login so
// the client localStorage contract and Bearer-token API routes keep working.
export async function POST(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'No Google session found. Please sign in with Google first.' },
        { status: 401 }
      );
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryEmail =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
      user.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      return NextResponse.json(
        { error: 'Your Google account has no email address Clerk can read.' },
        { status: 400 }
      );
    }

    const employee = await resolveActiveSupportEmployee(primaryEmail);

    const token = jwt.sign(
      {
        id: employee.employeeId,
        email: employee.email,
        name: employee.name,
        role: employee.role,
        // AuthGuard / validate / requireAuth all reject tokens without this,
        // which is what forces any non-SSO session to re-login with Google.
        method: 'google',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      token,
      employeeId: employee.employeeId,
      employeeName: employee.name || employee.email,
      email: employee.email,
      role: employee.role,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
