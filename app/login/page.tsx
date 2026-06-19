'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn, useAuth, useClerk } from '@clerk/nextjs';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const exchangeStarted = useRef(false);

  // If already logged in, bounce to dashboard
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('authToken')) {
      router.replace('/');
    }
  }, [router]);

  // Returning from the Google OAuth redirect: Clerk session exists but the
  // internal JWT doesn't yet. Exchange one for the other, then enter the
  // dashboard. If the Google email isn't an active Support employee, drop the
  // Clerk session so the next attempt can pick a different account.
  useEffect(() => {
    if (!authLoaded || !isSignedIn || exchangeStarted.current) return;
    if (localStorage.getItem('authToken')) return;
    exchangeStarted.current = true;
    setGoogleLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/auth/google-login', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Google sign-in failed');
          await signOut();
          return;
        }
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('employeeId', data.employeeId);
        localStorage.setItem('employeeName', data.employeeName);
        localStorage.setItem('employeeEmail', data.email);
        router.replace('/');
      } catch (err) {
        console.error(err);
        setError('Something went wrong completing Google sign-in.');
      } finally {
        setGoogleLoading(false);
        exchangeStarted.current = false;
      }
    })();
  }, [authLoaded, isSignedIn, router, signOut]);

  const handleGoogleLogin = async () => {
    if (!signInLoaded || !signIn) return;
    setError('');
    setGoogleLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/login/sso-callback',
        redirectUrlComplete: '/login',
      });
    } catch (err) {
      console.error(err);
      setError('Could not start Google sign-in. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-400/40 mx-auto mb-4">
            <span className="text-white font-black text-3xl">✨</span>
          </div>
          <h1 className="text-3xl font-black text-purple-950">badho</h1>
          <p className="text-sm font-bold text-purple-600 mt-1">COUPON HQ - Support Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-200 p-8">
          <h2 className="text-2xl font-black text-purple-950 mb-2">Welcome Back</h2>
          <p className="text-sm text-slate-600 mb-6">Sign in with your work Google account</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || !signInLoaded}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white border-2 border-purple-200 text-slate-800 font-bold hover:bg-purple-50 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {googleLoading ? 'Signing in with Google…' : 'Continue with Google'}
          </button>

          {/* Info Message */}
          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-xs text-slate-700">
              <span className="font-bold">🔒 Google SSO only:</span> Access is limited to active Support team members. Sign in with your badho work account.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          © 2026 badho. All rights reserved.
        </p>
      </div>
    </div>
  );
}
