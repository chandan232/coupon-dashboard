'use client';

import { useEffect, useState } from 'react';
import StatusBadge from './StatusBadge';

interface OrderDetail {
  poNumber: string;
  amount: string;
  appliedOfferDiscount: string;
  buyerPhone: string;
  sellerPhone: string;
  buyerBusinessName: string;
  sellerBusinessName: string;
  reservationStatus: string;
  createdAt: string;
  orderDate: string;
}

interface Props {
  couponCode: string;
  isOpen: boolean;
  onClose: () => void;
  dateFilter?: 'all' | 'today' | '7' | '15' | '30' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRangeParams(filter?: string, customStart?: string, customEnd?: string) {
  if (!filter || filter === 'all') return {};

  const now = new Date();
  let startDate: Date;
  let endDate = new Date(now);

  switch(filter) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case '7':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '15':
      startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      break;
    case '30':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      startDate = customStart ? new Date(customStart) : new Date(0);
      endDate = customEnd ? new Date(customEnd) : new Date();
      break;
    default:
      return {};
  }

  return {
    startDate: formatDateLocal(startDate),
    endDate: formatDateLocal(endDate),
  };
}

function fmt(n: string | number | null | undefined) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN')}`;
}

export default function CouponDetailsModal({ couponCode, isOpen, onClose, dateFilter = 'all', customStartDate = '', customEndDate = '' }: Props) {
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterBuyerName, setFilterBuyerName] = useState('');
  const [filterBuyerPhone, setFilterBuyerPhone] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filteredOrders = orders.filter(o => {
    const buyerNameMatch = !filterBuyerName || (o.buyerBusinessName?.toLowerCase().includes(filterBuyerName.toLowerCase()) ?? false);
    const buyerPhoneMatch = !filterBuyerPhone || (o.buyerPhone?.includes(filterBuyerPhone) ?? false);
    const statusMatch = !filterStatus || o.reservationStatus === filterStatus;
    return buyerNameMatch && buyerPhoneMatch && statusMatch;
  });

  const statusCounts = {
    APPLIED: new Set(orders.filter(o => o.reservationStatus === 'APPLIED').map(o => o.poNumber)).size,
    RESERVED: new Set(orders.filter(o => o.reservationStatus === 'RESERVED').map(o => o.poNumber)).size,
    EXPIRED: new Set(orders.filter(o => o.reservationStatus === 'EXPIRED').map(o => o.poNumber)).size,
    CANCELLED: new Set(orders.filter(o => o.reservationStatus === 'CANCELLED').map(o => o.poNumber)).size,
    REJECTED: new Set(orders.filter(o => o.reservationStatus === 'REJECTED').map(o => o.poNumber)).size,
  };

  useEffect(() => {
    if (!isOpen || !couponCode) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Build date parameters
        let params: any = {};
        if (dateFilter === 'custom') {
          if (customStartDate && customEndDate) {
            params = getDateRangeParams('custom', customStartDate, customEndDate);
          }
        } else if (dateFilter !== 'all') {
          params = getDateRangeParams(dateFilter);
        }

        const queryParams = new URLSearchParams();
        queryParams.append('code', couponCode);
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);

        const res = await fetch(`/api/coupon-details?${queryParams.toString()}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setOrders(json.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isOpen, couponCode, dateFilter, customStartDate, customEndDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b bg-purple-50 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Coupon Details</h2>
            <p className="text-sm text-gray-600 mt-1">Code: <span className="font-mono font-semibold text-slate-800">{couponCode}</span></p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-2xl font-light w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 text-center text-gray-700">Loading orders…</div>
          ) : error ? (
            <div className="py-12 text-center text-red-500">
              <p className="font-medium">{error}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-gray-700">No orders found for this coupon</div>
          ) : (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-xs font-bold text-gray-900 uppercase mb-3">Filters</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Buyer Name</label>
                    <input
                      type="text"
                      placeholder="Search buyer name..."
                      value={filterBuyerName}
                      onChange={(e) => setFilterBuyerName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Buyer Phone</label>
                    <input
                      type="text"
                      placeholder="Search phone..."
                      value={filterBuyerPhone}
                      onChange={(e) => setFilterBuyerPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Coupon Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">All Status</option>
                      <option value="APPLIED">Applied</option>
                      <option value="RESERVED">Reserved</option>
                      <option value="EXPIRED">Expired</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Status Summary */}
              <div className="grid grid-cols-5 gap-3">
                <div className="khilna-card bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="text-xs font-semibold text-gray-700 uppercase">Applied</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{statusCounts.APPLIED}</p>
                </div>
                <div className="khilna-card bg-purple-100 p-3 rounded-lg border border-purple-300">
                  <p className="text-xs font-semibold text-gray-700 uppercase">Reserved</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{statusCounts.RESERVED}</p>
                </div>
                <div className="khilna-card bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="text-xs font-semibold text-gray-700 uppercase">Expired</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{statusCounts.EXPIRED}</p>
                </div>
                <div className="khilna-card bg-purple-100 p-3 rounded-lg border border-purple-300">
                  <p className="text-xs font-semibold text-gray-700 uppercase">Cancelled</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{statusCounts.CANCELLED}</p>
                </div>
                <div className="khilna-card bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="text-xs font-semibold text-gray-700 uppercase">Rejected</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{statusCounts.REJECTED}</p>
                </div>
              </div>

              {/* Orders Table */}
              <div className="text-xs text-gray-700 font-semibold uppercase">
                Showing {filteredOrders.length} of {orders.length} order(s)
              </div>
              <div className="overflow-x-auto rounded-xl border border-purple-300">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-100 text-xs text-gray-700 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">PO #</th>
                      <th className="px-4 py-3 text-left">Buyer Name</th>
                      <th className="px-4 py-3 text-left">Buyer Phone</th>
                      <th className="px-4 py-3 text-right">Order Amount</th>
                      <th className="px-4 py-3 text-right">Applied Coupon Amount</th>
                      <th className="px-4 py-3 text-right">% of Order</th>
                      <th className="px-4 py-3 text-left">Coupon Code</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Marked Pending Time</th>
                      <th className="px-4 py-3 text-left">Reservation Date</th>
                      <th className="px-4 py-3 text-left">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-200">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-gray-600 text-sm">
                          No orders match the selected filters
                        </td>
                      </tr>
                    ) : filteredOrders.map((o, i) => {
                      const percentage = Number(o.amount) > 0
                        ? ((Number(o.appliedOfferDiscount) / Number(o.amount)) * 100).toFixed(2)
                        : '0.00';
                      return (
                        <tr key={i} className="khilna-row hover:bg-purple-100 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-slate-800 text-xs">{o.poNumber}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{o.buyerBusinessName ?? '—'}</td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-700">{o.buyerPhone ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-medium">{fmt(o.amount)}</td>
                          <td className="px-4 py-3 text-right text-slate-800 font-semibold">{fmt(o.appliedOfferDiscount)}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{percentage}%</td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900">{couponCode}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={o.reservationStatus} />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                            {new Date(o.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                            {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700">
                            {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-purple-50 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 transition-colors khilna-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
