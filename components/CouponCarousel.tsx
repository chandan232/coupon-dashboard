'use client';

import { useEffect, useState } from 'react';

interface CarouselCoupon {
  code: string;
  discount_value: string;
  discount_type: string;
  min_order_value: string;
}

export default function CouponCarousel() {
  const [coupons, setCoupons] = useState<CarouselCoupon[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCoupons() {
      try {
        const res = await fetch('/api/offers');
        const json = await res.json();
        if (json.data) {
          const active = json.data
            .filter((o: any) => o.offer_status === 'LIVE' || o.offer_status === 'ACTIVE')
            .slice(0, 5)
            .map((o: any) => ({
              code: o.code,
              discount_value: o.discount_value,
              discount_type: o.discount_type,
              min_order_value: o.min_order_value,
            }));
          setCoupons(active);
        }
      } catch (e) {
        console.error('Failed to load coupons');
      } finally {
        setLoading(false);
      }
    }
    loadCoupons();
  }, []);

  useEffect(() => {
    if (coupons.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % coupons.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [coupons.length]);

  if (loading || coupons.length === 0) return null;

  const coupon = coupons[currentIndex];
  const formatDiscount = () => {
    if (coupon.discount_type === 'conditional') {
      return `${coupon.discount_value}%`;
    }
    return `₹${Number(coupon.discount_value).toLocaleString('en-IN')}`;
  };

  return (
    <div className="relative mb-6 fade-in">
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(85, 107, 71, 0.3); }
          50% { box-shadow: 0 0 40px rgba(85, 107, 71, 0.5); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes scale-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .float-animation { animation: float 3s ease-in-out infinite; }
        .scale-bounce { animation: scale-bounce 1.5s ease-in-out infinite; }
      `}</style>

      <div className="khilna-card relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-50 via-white to-purple-100 border border-purple-300 backdrop-blur-lg p-4 shadow-lg">
        {/* Subtle animated background */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-200/20 rounded-full blur-2xl pointer-events-none float-animation" />

        <div className="relative z-10 flex items-center justify-between gap-6">
          {/* Left: Compact 3D Illustration */}
          <div className="flex-shrink-0">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 200 220" className="w-full h-full scale-bounce">
                {/* Head */}
                <circle cx="100" cy="60" r="28" fill="#FDB4B7" />
                {/* Eyes */}
                <circle cx="92" cy="55" r="4" fill="#333" />
                <circle cx="108" cy="55" r="4" fill="#333" />
                {/* Happy Smile */}
                <path d="M 92 65 Q 100 72 108 65" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
                {/* Body */}
                <rect x="70" y="90" width="60" height="60" rx="8" fill="#3B82F6" />
                {/* Arms */}
                <rect x="35" y="100" width="35" height="18" rx="9" fill="#FDB4B7" transform="rotate(-25 70 109)" />
                <rect x="130" y="100" width="35" height="18" rx="9" fill="#FDB4B7" transform="rotate(25 130 109)" />
                {/* Legs */}
                <rect x="80" y="155" width="12" height="35" rx="6" fill="#333" />
                <rect x="108" y="155" width="12" height="35" rx="6" fill="#333" />
                {/* Voucher Card */}
                <rect x="125" y="110" width="50" height="35" rx="4" fill="#8B5CF6" filter="url(#shadow)" />
                <text x="150" y="135" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">₹500</text>
                {/* Sparkles */}
                <circle cx="30" cy="30" r="3" fill="#C4B5FD" opacity="0.8" />
                <circle cx="170" cy="40" r="2.5" fill="#C4B5FD" opacity="0.6" />
                <defs>
                  <filter id="shadow">
                    <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.5" />
                  </filter>
                </defs>
              </svg>
            </div>
          </div>

          {/* Center: Compact Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-purple-800 uppercase tracking-wider font-black mb-1">Limited Offer</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-black text-purple-900">{formatDiscount()}</span>
              <span className="text-sm font-black text-purple-700">OFF</span>
            </div>
            <p className="text-xs font-bold text-gray-800 mb-1">{coupon.code}</p>
            {coupon.min_order_value && coupon.min_order_value !== '0' && coupon.min_order_value !== 'null' ? (
              <p className="text-xs font-semibold text-gray-700">Min ₹{Number(coupon.min_order_value).toLocaleString('en-IN')}</p>
            ) : (
              <p className="text-xs font-semibold text-gray-700">No minimum required ✨</p>
            )}
          </div>

          {/* Right: Action CTA */}
          <div className="flex-shrink-0 text-center">
            <div className="text-2xl pulse-glow mb-2">🎁</div>
            <p className="text-xs font-black text-purple-700">Grab Now!</p>
          </div>
        </div>
      </div>

      {/* Carousel Indicators */}
      {coupons.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {coupons.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`transition-all duration-300 rounded-full khilna-button ${
                i === currentIndex
                  ? 'bg-purple-700 w-7 h-2'
                  : 'bg-purple-200 w-2 h-2 hover:bg-purple-300'
              }`}
              aria-label={`Go to coupon ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
