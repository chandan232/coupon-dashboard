'use client';

import { useEffect, useState } from 'react';
import StatusBadge from './StatusBadge';

interface OrderItem {
  quantity: string;
  unitPrice: string;
  amount: string;
  itemStatus: string;
  brandSku: string;
  brand: string;
  size: string;
}

interface OrderSummary {
  poNumber: string;
  poStatus: string;
  poAmount: string;
  poDiscount: string;
  poUpdatedAt: string;
  markedPendingTime: string;
  markedCompletedTime: string;
  isFalseOrder: boolean;
}

function fmt(v: string | number | null | undefined) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function num(v: string | number | null | undefined) {
  if (v == null || v === '') return '—';
  return Number(v).toLocaleString('en-IN');
}

function fmtDateTime(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function PurchaseOrderItemsModal({
  poNumber,
  isOpen,
  onClose,
}: {
  poNumber: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !poNumber) return;
    const ctrl = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/purchase-order-items?poNumber=${encodeURIComponent(poNumber)}`, { signal: ctrl.signal });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setItems(json.data?.items ?? []);
        setSummary(json.data?.summary ?? null);
      } catch (e) {
        if ((e as { name?: string }).name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => ctrl.abort();
  }, [isOpen, poNumber]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalQty = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
  const totalAmount = items.reduce((acc, it) => acc + Number(it.amount || 0), 0);
  const itemCount = items.length;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-br from-violet-50/95 via-white to-cyan-50/95 rounded-3xl shadow-2xl shadow-violet-500/30 max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-violet-200/60"
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M5 21h14a2 2 0 0 0 2-2V7l-5-5H5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2Z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-violet-700 via-indigo-700 to-cyan-700 bg-clip-text text-transparent">Order Items</h2>
                <p className="text-xs font-medium text-slate-700">PO <span className="font-mono font-bold text-violet-800">#{poNumber}</span></p>
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
              <p className="mt-3 text-sm font-medium text-violet-700">Loading order items…</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-600">
              <p className="font-bold">Could not load order items</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          ) : !summary ? (
            <div className="py-20 text-center text-slate-700 font-medium">No order found for PO #{poNumber}</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-xl bg-white/80 border border-violet-200 p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">PO Status</p>
                  <div className="mt-1.5"><StatusBadge status={summary.poStatus} /></div>
                </div>
                <div className="rounded-xl bg-white/80 border border-violet-200 p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">PO Amount</p>
                  <p className="mt-1 text-base font-black text-slate-900">{fmt(summary.poAmount)}</p>
                </div>
                <div className="rounded-xl bg-white/80 border border-violet-200 p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">PO Discount</p>
                  <p className="mt-1 text-base font-black text-slate-900">{fmt(summary.poDiscount)}</p>
                </div>
                <div className="rounded-xl bg-white/80 border border-violet-200 p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Items</p>
                  <p className="mt-1 text-base font-black text-slate-900">{num(itemCount)}</p>
                </div>
                <div className="rounded-xl bg-white/80 border border-violet-200 p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Total Qty</p>
                  <p className="mt-1 text-base font-black text-slate-900">{num(totalQty)}</p>
                </div>
                <div className="rounded-xl bg-white/80 border border-violet-200 p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">False Order</p>
                  <p className={`mt-1 text-base font-black ${summary.isFalseOrder ? 'text-red-700' : 'text-emerald-700'}`}>
                    {summary.isFalseOrder ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-xl bg-white/80 border border-violet-200 p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-violet-700 mb-2">Timeline</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-600 font-medium">Marked Pending</span>
                    <p className="text-slate-900 font-semibold">{fmtDateTime(summary.markedPendingTime)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-600 font-medium">Marked Completed</span>
                    <p className="text-slate-900 font-semibold">{fmtDateTime(summary.markedCompletedTime)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-600 font-medium">Last Updated</span>
                    <p className="text-slate-900 font-semibold">{fmtDateTime(summary.poUpdatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Items table */}
              <div className="rounded-2xl bg-white/90 border border-violet-200 shadow-lg shadow-violet-300/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-violet-100 to-indigo-100 border-b border-violet-300 text-slate-900 text-xs uppercase tracking-wide font-bold">
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Brand</th>
                        <th className="px-4 py-3 text-left">Brand SKU</th>
                        <th className="px-4 py-3 text-left">Item Status</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-violet-100">
                      {items.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-700">No items</td></tr>
                      ) : items.map((it, i) => (
                        <tr key={i} className="hover:bg-violet-50/80 transition-colors">
                          <td className="px-4 py-3 text-slate-600 text-xs font-mono">{i + 1}</td>
                          <td className="px-4 py-3 font-bold text-violet-800">{it.brand ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-900 font-medium">{it.brandSku ?? '—'}</td>
                          <td className="px-4 py-3"><StatusBadge status={it.itemStatus ?? '—'} /></td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{num(it.quantity)}</td>
                          <td className="px-4 py-3 text-right text-slate-900">{fmt(it.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">{fmt(it.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {items.length > 0 && (
                      <tfoot>
                        <tr className="bg-gradient-to-r from-violet-50 to-cyan-50 border-t-2 border-violet-300 font-black text-slate-900">
                          <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-violet-700">Total</td>
                          <td className="px-4 py-3 text-right">{num(totalQty)}</td>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-right text-base">{fmt(totalAmount)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
