import { NextRequest, NextResponse } from 'next/server';

// Note: We don't verify JWT in middleware because Next.js middleware runs in Edge Runtime
// where the 'jsonwebtoken' library doesn't work. Instead, we rely on:
// 1. Client-side auth check in app/page.tsx (redirects to /login if no token)
// 2. The /api/auth/email-login endpoint validates credentials against the database
// API routes are accessible to keep the dashboard working; the login page is the gate.

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow login page and all API routes
  // The client-side dashboard already gates access by checking localStorage token
  if (pathname === '/login' || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
