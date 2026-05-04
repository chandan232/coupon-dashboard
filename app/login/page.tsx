'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (!email.trim()) {
        setError('Please enter your support email');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Store token and employee info in localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('employeeName', data.employeeName);
      localStorage.setItem('employeeEmail', data.email);

      // Redirect to dashboard
      router.push('/');
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
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
          <p className="text-sm text-slate-600 mb-6">Sign in to your support account</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800">{message}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="support@badho.in"
                className="w-full px-4 py-3 rounded-lg border-2 border-purple-200 bg-purple-50 text-slate-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all font-medium"
                required
              />
            </div>

            {/* Info Message */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                <span className="font-bold">📧 Email Only:</span> Enter your support email to access the dashboard.
              </p>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-black rounded-lg transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking email...' : 'Access Dashboard'}
            </button>
          </form>

          {/* Info Message */}
          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-xs text-slate-700">
              <span className="font-bold">✨ Passwordless Login:</span> Only registered support emails can access. Enter your support email from badho.
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
