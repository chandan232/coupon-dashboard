'use client';

import { useEffect, useState } from 'react';
import MetricCard from '@/components/MetricCard';
import StatusBadge from '@/components/StatusBadge';
import CouponCarousel from '@/components/CouponCarousel';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface Metrics {
  reserved_count: string;
  applied_count: string;
  expired_count: string;
  cancelled_count: string;
  rejected_count: string;
  total_count: string;
  total_discount_burn: string;
  total_revenue: string;
  conversion_rate: string;
  expiry_rate: string;
}

interface CouponRow {
  coupon_name: string;
  code: string;
  usage_count: string;
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

interface ViolationStats {
  reached_limit_count: string;
  total_buyer_coupon_combinations: string;
  limit_reached_percentage: string;
  total_coupon_uses: string;
}

interface ViolationDetail {
  buyer_name: string;
  buyer_phone: string;
  code: string;
  usage_count: string;
  maxUsagePerUser: string;
  exceeded_by: string;
}

const PIE_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f97316', '#a855f7'];

function fmt(n: string | number | null | undefined, decimals = 0) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function num(n: string | number | null | undefined) {
  if (n == null || n === '') return '—';
  return Number(n).toLocaleString('en-IN');
}

function pct(n: string | number | null | undefined) {
  if (n == null || n === '') return '—';
  return `${Number(n).toFixed(2)}%`;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [topCoupons, setTopCoupons] = useState<CouponRow[]>([]);
  const [failure, setFailure] = useState<FailureRow[]>([]);
  const [violations, setViolations] = useState<ViolationStats | null>(null);
  const [violationDetails, setViolationDetails] = useState<ViolationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [mRes, cRes, fRes, vRes] = await Promise.all([
          fetch('/api/metrics'),
          fetch('/api/coupon-performance'),
          fetch('/api/failure-analysis'),
          fetch('/api/coupon-usage-violations'),
        ]);
        const [mJson, cJson, fJson, vJson] = await Promise.all([
          mRes.json(),
          cRes.json(),
          fRes.json(),
          vRes.json(),
        ]);
        if (mJson.error) throw new Error(mJson.error);
        setMetrics(mJson.data);
        setTopCoupons(cJson.data ?? []);
        setFailure(fJson.data ?? []);
        if (vJson.data) {
          setViolations(vJson.data.stats);
          setViolationDetails(vJson.data.details ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="py-24 text-center text-gray-700">Loading dashboard…</div>;
  if (error) return (
    <div className="py-24 text-center text-red-500">
      <p className="font-medium">Could not load dashboard</p>
      <p className="text-xs mt-1">{error}</p>
    </div>
  );

  const pieData = failure.map((f, i) => ({
    name: f.status,
    value: Number(f.count),
    pct: Number(f.pct),
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const barData = topCoupons.slice(0, 10).map(c => ({
    code: c.code ?? c.coupon_name,
    usage: Number(c.usage_count),
    burn: Number(c.total_discount_burn),
  }));

  return (
    <div className="space-y-8">
      <div className="fade-in">
        <h1 className="text-5xl font-light text-gray-900 mb-2 tracking-tight">Management Dashboard</h1>
        <p className="text-gray-600 text-sm">Track coupon performance and key metrics</p>
      </div>
      <CouponCarousel />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 fade-in">
        <MetricCard label="Total Coupons" value={num(metrics?.total_count)} color="gray" />
        <MetricCard label="Applied" value={num(metrics?.applied_count)} color="green" />
        <MetricCard label="Expired" value={num(metrics?.expired_count)} color="red" />
        <MetricCard label="Conversion Rate" value={pct(metrics?.conversion_rate)} color="blue" />
        <MetricCard label="Expiry Rate" value={pct(metrics?.expiry_rate)} color="orange" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Total Discount Burn" value={fmt(metrics?.total_discount_burn)} color="purple"
          sub="Sum of all applied discounts" />
        <MetricCard label="Total Revenue" value={fmt(metrics?.total_revenue)} color="green"
          sub="Gross GMV from coupon orders" />
        <MetricCard label="Cancelled / Rejected"
          value={`${num(metrics?.cancelled_count)} / ${num(metrics?.rejected_count)}`}
          color="orange" sub="Post-application losses" />
      </div>

      {/* Max Usage Violations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="At Max Limit" value={num(violations?.reached_limit_count)} color="red"
          sub="Buyer-coupon combos at limit" />
        <MetricCard label="Limit % Reached" value={pct(violations?.limit_reached_percentage)} color="orange"
          sub="% of all usage combos" />
        <MetricCard label="Total Coupon Uses" value={num(violations?.total_coupon_uses)} color="blue"
          sub="All coupon applications" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in">

        {/* Funnel / status breakdown */}
        <div className="premium-card rounded-lg p-6">
          <h2 className="text-sm font-medium text-gray-800 mb-6">Coupon Status Breakdown</h2>
          <div className="flex gap-6 items-center">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {pieData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString('en-IN') : v} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <StatusBadge status={d.name} />
                  </div>
                  <span className="text-gray-800">{d.value.toLocaleString('en-IN')}
                    <span className="text-xs text-gray-600 ml-2">({d.pct}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top coupons bar chart */}
        <div className="premium-card rounded-lg p-6">
          <h2 className="text-sm font-medium text-gray-800 mb-6">Top 10 Coupons by Usage</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 0, right: 10, left: 10, bottom: 30 }}>
              <XAxis dataKey="code" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="usage" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Usage" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Coupons Table */}
      <div className="premium-card rounded-lg p-6 fade-in">
        <h2 className="text-sm font-medium text-gray-800 mb-6">Coupon Performance Summary</h2>
        <div className="overflow-x-auto rounded-lg border border-purple-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-200 text-xs text-gray-600 uppercase tracking-widest">
                <th className="px-4 py-3 text-left font-medium">Coupon</th>
                <th className="px-4 py-3 text-right font-medium">Usage</th>
                <th className="px-4 py-3 text-right font-medium">Avg %</th>
                <th className="px-4 py-3 text-right font-medium">Burn</th>
                <th className="px-4 py-3 text-right font-medium">Revenue</th>
                <th className="px-4 py-3 text-right font-medium">Avg Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100">
              {topCoupons.map((c, i) => (
                <tr key={i} className="hover:bg-purple-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono text-gray-900 font-medium text-sm">{c.code}</div>
                    <div className="text-gray-600 text-xs">{c.coupon_name}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800">{num(c.usage_count)}</td>
                  <td className="px-4 py-3 text-right text-gray-800">{pct(c.avg_coupon_pct)}</td>
                  <td className="px-4 py-3 text-right text-gray-800">{fmt(c.total_discount_burn)}</td>
                  <td className="px-4 py-3 text-right text-gray-800">{fmt(c.total_revenue)}</td>
                  <td className="px-4 py-3 text-right text-gray-800">{fmt(c.avg_order_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Violations Table */}
      {violationDetails.length > 0 && (
        <div className="premium-card rounded-lg p-6 fade-in border-red-500/10">
          <h2 className="text-sm font-medium text-gray-800 mb-6">
            <span className="text-amber-500">⚠</span> Usage Limit Alerts
          </h2>
          <div className="overflow-x-auto rounded-lg border border-purple-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-200 text-xs text-gray-600 uppercase tracking-widest">
                  <th className="px-4 py-3 text-left font-medium">Buyer Name</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Coupon</th>
                  <th className="px-4 py-3 text-right font-medium">Used</th>
                  <th className="px-4 py-3 text-right font-medium">Limit</th>
                  <th className="px-4 py-3 text-right font-medium">Over</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {violationDetails.map((v, i) => (
                  <tr key={i} className="hover:bg-purple-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900">{v.buyer_name}</td>
                    <td className="px-4 py-3 font-mono text-gray-600 text-xs">{v.buyer_phone}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-gray-900 text-sm">{v.code}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-800">{v.usage_count}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{v.maxUsagePerUser}</td>
                    <td className="px-4 py-3 text-right text-amber-500 font-medium">+{v.exceeded_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-600">
            Total: {violationDetails.length} buyer-coupon combinations have reached or exceeded their maximum usage limit
          </p>
        </div>
      )}
    </div>
  );
}
