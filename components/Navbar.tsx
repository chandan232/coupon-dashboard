'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const path = usePathname();
  const router = useRouter();
  const [employeeName, setEmployeeName] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem('employeeName');
    setEmployeeName(name || '');
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('authToken');
      localStorage.removeItem('employeeName');
      localStorage.removeItem('employeeEmail');
      sessionStorage.removeItem('employeeEmail');
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };
  return (
    <nav className="sticky top-0 z-50 backdrop-filter backdrop-blur-lg bg-gradient-to-r from-purple-50 via-purple-50 to-purple-100 border-b-2 border-purple-200 shadow-sm">
      <div className="w-full px-8 flex items-center gap-12 h-16">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-400/40 transform hover:scale-110 transition-transform duration-300 khilna-button">
            <span className="text-white font-black text-xl">✨</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-purple-950">badho</span>
            <span className="text-xs font-bold text-purple-600">
              {path?.startsWith('/order-status-dashboard') ? 'ORDERS HQ 📦' : 'COUPON HQ 💜'}
            </span>
          </div>
        </div>
        <div className="flex gap-6 ml-auto items-center">
          {path !== '/login' && employeeName && (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-100/50 rounded-lg border border-purple-200">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-black">
                    {employeeName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">{employeeName}</span>
                  <span className="text-xs text-purple-700 font-semibold">Support</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-300"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
