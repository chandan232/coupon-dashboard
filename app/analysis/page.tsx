'use client';

import { useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

interface TrendRow {
  hour_bucket?: string;
  day_bucket?: string;
  coupon_orders: string;
  discount_burn: string;
  revenue: string;
}

interface CouponPerfRow {
  coupon_name: string;
  code: string;
  usage_count: string;
  usage_share_pct: string;
  avg_coupon_pct: string;
  total_discount_burn: string;
  total_revenue: string;
  avg_order_value: string;
}

interface FailureRow {
  status: string;
  count: string;
  pct: string;
}

interface HighDiscRow {
  poNumber: string;
  order_amount: string;
  discount: string;
  coupon_pct: string;
  coupon_name: string;
  order_time: string;
}

interface CouponBurnRow {
  coupon_code: string;
  coupon_name: string;
  total_coupon_usage_count: string;
  applied_order_count: string;
  total_order_value: string;
  total_discount_burn: string;
  avg_discount_per_order: string;
  avg_discount_percentage: string;
}

function fmt(n: string | number | null | undefined) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function pct(n: string | number | null | undefined) {
  if (n == null || n === '') return '—';
  return `${Number(n).toFixed(2)}%`;
}

function fmtBucket(s: string | undefined, granularity: string) {
  if (!s) return '';
  const d = new Date(s);
  if (granularity === 'hourly') {
    return d.toLocaleString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', hour12: false });
  }
  return d.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });
}

const FAILURE_COLORS: Record<string, string> = {
  APPLIED:   '#22c55e',
  RESERVED:  '#3b82f6',
  EXPIRED:   '#ef4444',
  CANCELLED: '#6b7280',
  REJECTED:  '#f97316',
};

export default function AnalysisPage() {
  const [granularity, setGranularity] = useState<'daily' | 'hourly'>('daily');
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [coupons, setCoupons] = useState<CouponPerfRow[]>([]);
  const [failure, setFailure] = useState<FailureRow[]>([]);
  const [highDisc, setHighDisc] = useState<HighDiscRow[]>([]);
  const [burn, setBurn] = useState<CouponBurnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [tRes, cRes, fRes, hRes, bRes] = await Promise.all([
          fetch(`/api/trends?granularity=${granularity}`),
          fetch('/api/coupon-performance'),
          fetch('/api/failure-analysis'),
          fetch('/api/high-discount-orders'),
          fetch('/api/coupon-burn'),
        ]);
        const [tJson, cJson, fJson, hJson, bJson] = await Promise.all([
          tRes.json(), cRes.json(), fRes.json(), hRes.json(), bRes.json()
        ]);
        if (tJson.error) throw new Error(tJson.error);
        setTrends(tJson.data ?? []);
        setCoupons(cJson.data ?? []);
        setFailure(fJson.data ?? []);
        setHighDisc(hJson.data ?? []);
        setBurn(bJson.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [granularity]);

  const trendData = trends.map(r => ({
    bucket: fmtBucket(r.day_bucket ?? r.hour_bucket, granularity),
    orders: Number(r.coupon_orders),
    burn: Number(r.discount_burn),
    revenue: Number(r.revenue),
  }));

  const failureBarData = failure.map(f => ({
    status: f.status,
    count: Number(f.count),
    pct: Number(f.pct),
    fill: FAILURE_COLORS[f.status] ?? '#94a3b8',
  }));

  if (loading) return <div className="py-24 text-center text-gray-700">Loading analysis…</div>;
  if (error) return (
    <div className="py-24 text-center text-red-500">
      <p className="font-medium">Could not load analysis</p>
      <p className="text-xs mt-1">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Detailed Analysis</h1>

      {/* ── Time-Based Analysis ───────────────────────────────────── */}
      <section className="badho-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-purple-800">Time-Based Coupon Usage</h2>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
            {(['daily', 'hourly'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-4 py-1.5 font-medium capitalize transition-colors
                  ${granularity === g ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gBurn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="bucket" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }}
              tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v, name) =>
                typeof v === 'number'
                  ? (name === 'orders' ? v : `₹${v.toLocaleString('en-IN')}`)
                  : v}
            />
            <Legend />
            <Area yAxisId="l" type="monotone" dataKey="orders" stroke="#3b82f6"
              fill="url(#gOrders)" name="orders" strokeWidth={2} dot={false} />
            <Area yAxisId="r" type="monotone" dataKey="burn" stroke="#ef4444"
              fill="url(#gBurn)" name="discount_burn" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* ── Failure Analysis ─────────────────────────────────────── */}
      <section className="badho-card rounded-2xl p-5">
        <h2 className="text-sm font-bold text-purple-800 mb-4">Funnel Failure Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={failureBarData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString('en-IN') : v} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {failureBarData.map((e, i) => (
                  <rect key={i} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="space-y-2">
            {failure.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-purple-900/20 px-4 py-2.5 border border-purple-500/20">
                <StatusBadge status={f.status} />
                <div className="text-sm font-bold text-gray-800">
                  {Number(f.count).toLocaleString('en-IN')}
                  <span className="text-gray-700 font-normal text-xs ml-1">({pct(f.pct)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100">
          <p className="text-xs font-semibold text-red-700 mb-1">Leakage Insight</p>
          <p className="text-xs text-red-600">
            Expired and Cancelled coupons represent direct revenue leakage — customers engaged
            but did not convert. Target reduction via shorter expiry windows or push notifications.
          </p>
        </div>
      </section>

      {/* ── Coupon-wise Performance ───────────────────────────────── */}
      <section className="badho-card rounded-2xl p-5">
        <h2 className="text-sm font-bold text-purple-800 mb-4">Coupon-wise Performance</h2>
        <div className="overflow-x-auto rounded-xl border border-purple-500/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-purple-900/30 text-xs text-gray-700 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Code / Name</th>
                <th className="px-4 py-3 text-right">Usage</th>
                <th className="px-4 py-3 text-right">Share %</th>
                <th className="px-4 py-3 text-right">Avg Discount %</th>
                <th className="px-4 py-3 text-right">Discount Burn</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Avg Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/20">
              {coupons.map((c, i) => {
                const burnRatio = Number(c.total_discount_burn) / (Number(c.total_revenue) || 1);
                return (
                  <tr key={i} className="hover:bg-purple-900/30 transition-colors">
                    <td className="px-4 py-3 text-gray-700 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-cyan-700 font-bold text-xs">{c.code}</div>
                      <div className="text-gray-700 text-xs">{c.coupon_name}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">{Number(c.usage_count).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-2 rounded-full bg-purple-900/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{ width: `${Math.min(Number(c.usage_share_pct), 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-purple-800 font-semibold">{pct(c.usage_share_pct)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-purple-800 font-semibold">{pct(c.avg_coupon_pct)}</td>
                    <td className="px-4 py-3 text-right text-red-700 font-bold">{fmt(c.total_discount_burn)}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-bold">{fmt(c.total_revenue)}</td>
                    <td className="px-4 py-3 text-right text-orange-700 font-semibold">
                      {fmt(c.avg_order_value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Coupon-wise Burn Analysis ─────────────────────────────── */}
      <section className="badho-card rounded-2xl p-5">
        <h2 className="text-sm font-bold text-purple-800 mb-4">Coupon-wise Burn & Revenue Analysis (APPLIED Orders Only)</h2>
        <div className="overflow-x-auto rounded-xl border border-purple-500/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-purple-900/30 text-xs text-gray-700 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Coupon Code</th>
                <th className="px-4 py-3 text-right">Total Usage Count</th>
                <th className="px-4 py-3 text-right">Applied Orders</th>
                <th className="px-4 py-3 text-right">Total Order Value</th>
                <th className="px-4 py-3 text-right">Total Discount Burn</th>
                <th className="px-4 py-3 text-right">Avg Discount (₹)</th>
                <th className="px-4 py-3 text-right">Avg Discount (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/20">
              {burn.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-700 text-sm">No data available</td>
                </tr>
              ) : (
                burn.map((b, i) => {
                  const appliedCount = Number(b.applied_order_count);
                  const totalUsage = Number(b.total_coupon_usage_count);
                  const mismatch = appliedCount !== totalUsage;
                  return (
                    <tr key={i} className={`transition-colors ${mismatch ? 'bg-yellow-900/20 hover:bg-yellow-900/30' : 'hover:bg-purple-900/30'}`}>
                      <td className="px-4 py-3 text-gray-700 text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-cyan-700 font-bold text-sm">{b.coupon_code}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700">{Number(b.total_coupon_usage_count).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${mismatch ? 'text-yellow-700' : 'text-gray-800'}`}>
                          {appliedCount.toLocaleString('en-IN')}
                        </span>
                        {mismatch && <span className="text-xs text-yellow-700 block">⚠️ mismatch</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800">{fmt(b.total_order_value)}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-700">{fmt(b.total_discount_burn)}</td>
                      <td className="px-4 py-3 text-right text-gray-800">{fmt(b.avg_discount_per_order)}</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-700">{pct(b.avg_discount_percentage)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-700">
          <strong>Note:</strong> Total Usage Count is the coupon's overall currentUsageCount. Applied Orders shows only orders with APPLIED status (non-drafted). Mismatch may indicate RESERVED/CANCELLED orders or other statuses.
        </p>
      </section>

      {/* ── High Discount Orders ──────────────────────────────────── */}
      <section className="badho-card rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-bold text-purple-800">High Discount Orders</h2>
          <span className="text-xs bg-red-900/40 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-500/30">
            coupon % &gt; 30%
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-purple-500/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-purple-900/30 text-xs text-gray-700 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">PO Number</th>
                <th className="px-4 py-3 text-left">Coupon</th>
                <th className="px-4 py-3 text-right">Order Amt</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Coupon %</th>
                <th className="px-4 py-3 text-left">Order Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/20">
              {highDisc.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-700 text-sm">No high-discount orders found</td>
                </tr>
              ) : (
                highDisc.map((o, i) => (
                  <tr key={i} className="hover:bg-red-900/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{o.poNumber}</td>
                    <td className="px-4 py-3 text-xs text-cyan-700 font-bold">{o.coupon_name ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{fmt(o.order_amount)}</td>
                    <td className="px-4 py-3 text-right text-red-700 font-bold">{fmt(o.discount)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${Number(o.coupon_pct) > 50 ? 'text-red-700' : 'text-orange-700'}`}>
                        {pct(o.coupon_pct)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {new Date(o.order_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
