'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';



export default function Navbar() {
  const path = usePathname();
  return (
    <nav className="sticky top-0 z-50 backdrop-filter backdrop-blur-lg bg-gradient-to-r from-purple-50 via-purple-50 to-purple-100 border-b-2 border-purple-200 shadow-sm">
      <div className="w-full px-8 flex items-center gap-12 h-16">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-400/40 transform hover:scale-110 transition-transform duration-300 khilna-button">
            <span className="text-white font-black text-xl">✨</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-purple-950">badho</span>
            <span className="text-xs font-bold text-purple-600">COUPON HQ 💜</span>
          </div>
        </div>
        <div className="flex gap-8 ml-auto">

        </div>
      </div>
    </nav>
  );
}
