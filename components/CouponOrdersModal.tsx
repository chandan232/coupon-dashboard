'use client';

import { useEffect, useState } from 'react';
import StatusBadge from './StatusBadge';

interface OrderRow {
  poNumber: string;
  appliedCouponAmount: string;
  couponStatus: string;
  orderStatus: string;
  buyerPhone: string;
  buyerBusinessName: string;
  sellerPhone: string;
  sellerBusinessName: string;
  orderCreatedAt: string;
  couponAppliedAt: string;
  orderAmount: string;
  couponPctOfOrder: string;
}

function fmt(v: string | number | null | undefined) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function pct(v: string | number | null | undefined) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return `${n.toFixed(2)}%`;
}

function fmtDateTime(s: string | null | undefined) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function CouponOrdersModal({
  couponCode,
  isOpen,
  onClose,
}: {
  couponCode: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch orders when modal opens — only APPLIED orders are shown
  useEffect(() => {
    if (!isOpen || !couponCode) return;
    const ctrl = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ code: couponCode, status: 'APPLIED' });
        const res = await fetch(`/api/coupon-order-details?${params.toString()}`, { signal: ctrl.signal });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setOrders(json.data ?? []);
      } catch (e) {
        if ((e as { name?: string }).name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => ctrl.abort();
  }, [isOpen, couponCode]);

  // Reset filters when modal opens or coupon changes
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setPage(1);
    }
  }, [isOpen, couponCode]);

  // ESC key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Client-side search filter (status is pre-filtered to APPLIED on the server)
  const filteredOrders = orders.filter(o => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      o.poNumber?.toLowerCase().includes(s) ||
      o.buyerPhone?.toLowerCase().includes(s) ||
      o.buyerBusinessName?.toLowerCase().includes(s) ||
      o.sellerPhone?.toLowerCase().includes(s) ||
      o.sellerBusinessName?.toLowerCase().includes(s)
    );
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * itemsPerPage;
  const pageOrders = filteredOrders.slice(startIdx, startIdx + itemsPerPage);

  // Aggregate stats
  const totalOrderValue = filteredOrders.reduce((acc, o) => acc + (Number(o.orderAmount) || 0), 0);
  const totalAppliedAmount = filteredOrders.reduce((acc, o) => acc + (Number(o.appliedCouponAmount) || 0), 0);
  const avgPct = totalOrderValue > 0 ? (totalAppliedAmount * 100) / totalOrderValue : 0;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-br from-purple-50/95 via-white to-indigo-50/95 rounded-3xl shadow-2xl shadow-purple-500/30 max-w-[95vw] w-[1400px] max-h-[92vh] overflow-hidden flex flex-col border border-purple-200/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-purple-200/60 bg-gradient-to-r from-purple-100/80 via-indigo-100/60 to-purple-100/80 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-400/40">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4"/>
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                Applied Orders
              </h2>
              <p className="text-xs font-medium text-slate-700">
                Coupon <span className="font-mono font-bold text-purple-800">{couponCode}</span>
                {!loading && ` · ${filteredOrders.length} applied order${filteredOrders.length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/80 hover:bg-white border border-purple-200 hover:border-purple-400 text-purple-700 hover:text-purple-900 text-xl font-black flex items-center justify-center transition-all hover:shadow-md"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
              <p className="mt-3 text-sm font-medium text-purple-700">Loading orders…</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-600">
              <p className="font-bold">Could not load orders</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl bg-white/80 border border-purple-200 p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-700">Total Orders</p>
                  <p className="mt-1 text-base font-black text-slate-900">{filteredOrders.length.toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl bg-white/80 border border-purple-200 p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-700">Order Value</p>
                  <p className="mt-1 text-base font-black text-slate-900">{fmt(totalOrderValue)}</p>
                </div>
                <div className="rounded-xl bg-white/80 border border-purple-200 p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-700">Applied Amount</p>
                  <p className="mt-1 text-base font-black text-slate-900">{fmt(totalAppliedAmount)}</p>
                </div>
                <div className="rounded-xl bg-white/80 border border-purple-200 p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-700">Applied %</p>
                  <p className="mt-1 text-base font-black text-slate-900">{pct(avgPct)}</p>
                </div>
              </div>

              {/* Search filter */}
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search PO, buyer, seller…"
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-purple-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                />
              </div>

              {/* Orders table */}
              <div className="rounded-2xl bg-white/90 border border-purple-200 shadow-lg shadow-purple-300/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-100 to-indigo-100 border-b border-purple-300 text-slate-900 text-xs uppercase tracking-wide font-bold">
                        <th className="px-3 py-3 text-left whitespace-nowrap">PO #</th>
                        <th className="px-3 py-3 text-left whitespace-nowrap">Order Status</th>
                        <th className="px-3 py-3 text-left whitespace-nowrap">Seller Phone</th>
                        <th className="px-3 py-3 text-left whitespace-nowrap">Buyer Phone</th>
                        <th className="px-3 py-3 text-left whitespace-nowrap">Seller Business</th>
                        <th className="px-3 py-3 text-left whitespace-nowrap">Buyer Business</th>
                        <th className="px-3 py-3 text-left whitespace-nowrap">Coupon Applied</th>
                        <th className="px-3 py-3 text-left whitespace-nowrap">Order Created</th>
                        <th className="px-3 py-3 text-right whitespace-nowrap">Coupon Amount</th>
                        <th className="px-3 py-3 text-right whitespace-nowrap">Order Amount</th>
                        <th className="px-3 py-3 text-right whitespace-nowrap">Coupon / Order %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100">
                      {pageOrders.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-10 text-center text-slate-700 font-medium">
                            No applied orders found{search ? ' for current search' : ''}.
                          </td>
                        </tr>
                      ) : pageOrders.map((o, i) => (
                        <tr key={`${o.poNumber}-${i}`} className="hover:bg-purple-50/80 transition-colors">
                          <td className="px-3 py-3 font-mono font-bold text-purple-800 whitespace-nowrap">#{o.poNumber}</td>
                          <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={o.orderStatus ?? '—'} /></td>
                          <td className="px-3 py-3 text-slate-900 whitespace-nowrap">{o.sellerPhone || '—'}</td>
                          <td className="px-3 py-3 text-slate-900 whitespace-nowrap">{o.buyerPhone || '—'}</td>
                          <td className="px-3 py-3 text-slate-900 max-w-[200px] truncate" title={o.sellerBusinessName || ''}>{o.sellerBusinessName || '—'}</td>
                          <td className="px-3 py-3 text-slate-900 max-w-[200px] truncate" title={o.buyerBusinessName || ''}>{o.buyerBusinessName || '—'}</td>
                          <td className="px-3 py-3 text-slate-700 whitespace-nowrap text-xs">{fmtDateTime(o.couponAppliedAt)}</td>
                          <td className="px-3 py-3 text-slate-700 whitespace-nowrap text-xs">{fmtDateTime(o.orderCreatedAt)}</td>
                          <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap">{fmt(o.appliedCouponAmount)}</td>
                          <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap">{fmt(o.orderAmount)}</td>
                          <td className="px-3 py-3 text-right font-black text-purple-800 whitespace-nowrap">{pct(o.couponPctOfOrder)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <p className="text-slate-700 font-medium">
                    Showing {startIdx + 1}–{Math.min(startIdx + itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="px-3 py-1.5 rounded-lg border border-purple-200 bg-white text-purple-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-50 transition"
                    >
                      ← Prev
                    </button>
                    <span className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-800 font-bold">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-purple-200 bg-white text-purple-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-50 transition"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
