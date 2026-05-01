'use client';

import { useEffect, useState } from 'react';
import StatusBadge from './StatusBadge';

interface BuyerInfo {
  id: string;
  name: string;
  business_name: string;
  phone: string;
  city: string;
  state: string;
  address_line1: string;
}

interface OrderStatus {
  status: string;
  count: number;
  totalAmount: number;
}

interface Totals {
  totalOrders: number;
  totalRevenue: number;
}

function fmt(v: number | null | undefined) {
  if (v == null) return '—';
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function num(v: number | null | undefined) {
  if (v == null) return '—';
  return v.toLocaleString('en-IN');
}

export default function BuyerDetailsModal({
  buyerId,
  isOpen,
  onClose,
}: {
  buyerId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [buyer, setBuyer] = useState<BuyerInfo | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderStatus[]>([]);
  const [totals, setTotals] = useState<Totals>({ totalOrders: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !buyerId) return;
    const ctrl = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/buyer-details?buyerId=${encodeURIComponent(buyerId)}`, { signal: ctrl.signal });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setBuyer(json.data?.buyer ?? null);
        setOrderSummary(json.data?.orderSummary ?? []);
        setTotals(json.data?.totals ?? { totalOrders: 0, totalRevenue: 0 });
      } catch (e) {
        if ((e as { name?: string }).name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => ctrl.abort();
  }, [isOpen, buyerId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-br from-violet-50/95 via-white to-cyan-50/95 rounded-3xl shadow-2xl shadow-violet-500/30 max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-violet-200/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-violet-200/60 bg-gradient-to-r from-violet-100/80 via-indigo-100/60 to-cyan-100/80 backdrop-blur flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-violet-400/40">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766m19.5-4.244V6.504c0-.120-.045-.235-.126-.325A3.374 3.374 0 0 0 21 4.74V3a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 0 4 3v1.74c0 .169-.027.335-.075.5m16.5 4.244H3.75m16.5 0h2.25m0 0v3a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5v-3m19.5 0v6a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5v-6m19.5 0V9a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 9v3"/>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-violet-700 via-indigo-700 to-cyan-700 bg-clip-text text-transparent">Buyer Details</h2>
                <p className="text-xs font-medium text-slate-700">Buyer information and order history</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/80 hover:bg-white border border-violet-200 hover:border-violet-400 text-violet-700 hover:text-violet-900 text-xl font-black flex items-center justify-center transition-all hover:shadow-md"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
              <p className="mt-3 text-sm font-medium text-violet-700">Loading buyer details…</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-600">
              <p className="font-bold">Could not load buyer details</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          ) : !buyer ? (
            <div className="py-20 text-center text-slate-700 font-medium">No buyer found</div>
          ) : (
            <>
              {/* Buyer Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/80 border border-violet-200 p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Buyer Name</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{buyer.name}</p>
                </div>
                <div className="rounded-xl bg-white/80 border border-violet-200 p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Business Name</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{buyer.business_name}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="rounded-xl bg-white/80 border border-violet-200 p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-violet-700 mb-3">Contact Info</p>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold text-slate-700">Phone:</span> <span className="text-slate-900 font-mono">{buyer.phone}</span></p>
                </div>
              </div>

              {/* Address Info */}
              <div className="rounded-xl bg-white/80 border border-violet-200 p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-violet-700 mb-3">Address</p>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold text-slate-700">Street:</span> <span className="text-slate-900">{buyer.address_line1 || '—'}</span></p>
                  <p><span className="font-semibold text-slate-700">City:</span> <span className="text-slate-900">{buyer.city || '—'}</span></p>
                  <p><span className="font-semibold text-slate-700">State:</span> <span className="text-slate-900">{buyer.state || '—'}</span></p>
                </div>
              </div>

              {/* Lifetime Order Summary */}
              <div className="rounded-xl bg-gradient-to-br from-emerald-50/70 via-teal-50/50 to-cyan-50/70 border border-emerald-200/60 p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 mb-4">Lifetime Orders Summary</p>

                {/* Total Stats */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="rounded-lg bg-white/70 border border-emerald-200 p-3">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Orders</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{num(totals.totalOrders)}</p>
                  </div>
                  <div className="rounded-lg bg-white/70 border border-emerald-200 p-3">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Revenue</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{fmt(totals.totalRevenue)}</p>
                  </div>
                </div>

                {/* Status-wise Breakdown */}
                {orderSummary.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Status Breakdown</p>
                    {orderSummary.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/60 rounded-lg p-3 border border-emerald-100">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={item.status} />
                          <span className="text-sm font-semibold text-slate-700">{num(item.count)} orders</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{fmt(item.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
