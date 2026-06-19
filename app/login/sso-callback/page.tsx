'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

// Google redirects here after the OAuth consent screen. Clerk finishes the
// handshake (including first-time sign-up transfer) and then sends the user
// back to /login, where the page exchanges the fresh Clerk session for the
// internal JWT via /api/auth/google-login.
export default function SsoCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50">
      <div className="text-purple-700 text-sm font-semibold">Completing Google sign-in…</div>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/login"
        signUpFallbackRedirectUrl="/login"
      />
    </div>
  );
}
