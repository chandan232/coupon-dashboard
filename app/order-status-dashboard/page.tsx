'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import MetricCard from '@/components/MetricCard';

interface OrderStatus {
  status: string;
  count: number;
  percentage: number;
}

interface DashboardData {
  data: OrderStatus[];
  total: number;
  timestamp: string;
}

const STATUS_COLORS: Record<string, string> = {
  'PENDING': '#f59e0b',
  'CONFIRMED': '#10b981',
  'FAILED': '#ef4444',
  'DELIVERED': '#3b82f6',
  'CANCELLED': '#6b7280',
  'PROCESSING': '#8b5cf6',
  'COMPLETED': '#06b6d4',
  'REJECTED': '#dc2626',
};

export default function OrderStatusDashboard() {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  const [data, setData] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(yearStart);
  const [endDate, setEndDate] = useState(yearEnd);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (start: string, end: string) => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      params.append('startDate', start);
      params.append('endDate', end);

      const response = await fetch(`/api/order-status-summary?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const result: DashboardData = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(yearStart, yearEnd);
  }, []);

  const handleFilter = () => {
    if (startDate && endDate) {
      fetchData(startDate, endDate);
    }
  };

  const handleReset = () => {
    setStartDate(yearStart);
    setEndDate(yearEnd);
    fetchData(yearStart, yearEnd);
  };

  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Order Status Dashboard</h1>
          <p className="text-slate-600">Order distribution by status for {currentYear} — stakeholder reporting</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleFilter}
                disabled={refreshing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {refreshing ? 'Loading...' : 'Filter'}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 px-4 py-2 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Orders"
            value={total.toLocaleString()}
            trend={0}
            icon="📊"
          />
          <MetricCard
            title="Unique Statuses"
            value={data.length}
            trend={0}
            icon="🏷️"
          />
          <MetricCard
            title="Success Rate"
            value={`${data.find(d => d.status === 'DELIVERED' || d.status === 'COMPLETED')?.percentage || 0}%`}
            trend={0}
            icon="✅"
          />
          <MetricCard
            title="Failure Rate"
            value={`${data.find(d => d.status === 'FAILED' || d.status === 'REJECTED')?.percentage || 0}%`}
            trend={0}
            icon="❌"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Bar Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Order Count by Status</h2>
            {loading ? (
              <div className="h-80 flex items-center justify-center text-slate-500">Loading...</div>
            ) : data.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-slate-500">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Distribution by Percentage</h2>
            {loading ? (
              <div className="h-80 flex items-center justify-center text-slate-500">Loading...</div>
            ) : data.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-slate-500">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ status, percentage }) => `${status}: ${percentage}%`}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#3b82f6'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Status Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Count</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Percentage</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Visual</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-slate-500">No data available</td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span
                          className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                          style={{ backgroundColor: STATUS_COLORS[row.status] || '#3b82f6' }}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-semibold">{row.count.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-700">{row.percentage}%</td>
                      <td className="px-6 py-4">
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${row.percentage}%`,
                              backgroundColor: STATUS_COLORS[row.status] || '#3b82f6',
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>Last updated: {new Date().toLocaleString()}</p>
          <p className="mt-2">
            <a href="/api/order-status-summary" className="text-blue-600 hover:underline">
              Raw JSON API
            </a>
            {' | '}
            <a href="/dashboard" className="text-blue-600 hover:underline">
              Coupon Dashboard
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
