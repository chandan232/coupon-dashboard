'use client';

import { useEffect, useState, useCallback } from 'react';
import StatusBadge from '@/components/StatusBadge';
import CouponDetailsModal from '@/components/CouponDetailsModal';
import CreateCouponModal from '@/components/CreateCouponModal';
import CreateVoucherModal from '@/components/CreateVoucherModal';
import PurchaseOrderItemsModal from '@/components/PurchaseOrderItemsModal';
import BuyerDetailsModal from '@/components/BuyerDetailsModal';
import MetricCard from '@/components/MetricCard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ComposedChart, Legend, CartesianGrid,
  LabelList,
} from 'recharts';

interface Offer {
  id: string;
  coupon_name: string;
  code: string;
  offer_status: string;
  discount_type: string;
  discount_value: number;
  discount_cap: string;
  min_order_value: string;
  max_discount: number;
  start_time: string;
  end_time: string;
  usage_limit: number;
  usage_count: number;
  created_at: string;
  meta_details?: unknown;
  condition_id?: number;
  internal_description?: string;
  max_usage_per_user?: number;
  isActive?: boolean;
  isTest?: boolean;
}

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
  discount_pct_of_revenue: string;
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

interface TrendRow {
  day_bucket?: string;
  hour_bucket?: string;
  coupon_orders: string;
  discount_burn: string;
  revenue: string;
}

interface CouponTrendRow {
  day_bucket?: string;
  hour_bucket?: string;
  order_count: string;
  applied_coupon_amount: string;
  order_amount: string;
}

interface OrderTrendRow {
  order_date: string;
  total_po: string;
  coupon_applications: string;
  total_discount_applied: string;
  total_order_value: string;
}

interface OrderCouponTrendRow {
  Date: string;
  total_orders: string;
  coupon_driven_orders: string;
  no_coupon_orders: string;
}

interface CouponOrderDetailRow {
  poNumber: string;
  appliedCouponAmount: string;
  couponStatus: string;
  orderStatus: string;
  couponName: string;
  buyerId: string;
  buyerPhone: string;
  buyerBusinessName: string;
  sellerPhone: string;
  sellerBusinessName: string;
  markedPendingTime: string;
  orderCreatedAt: string;
  couponAppliedAt: string;
  orderAmount: string;
  couponPctOfOrder: string;
}

const TOP_TABS = ['COUPON', 'VOUCHER'] as const;
type TopTab = (typeof TOP_TABS)[number];

const SUB_TABS_COUPON = [
  { label: 'Dashboard', id: 'dashboard' },
  { label: 'Trend', id: 'trend' },
  { label: 'Details', id: 'details' },
  { label: 'Coupon', id: 'coupon' },
];

const SUB_TABS_VOUCHER = [
  { label: 'Details', id: 'details' },
  { label: 'Voucher', id: 'voucher' },
];

const SUB_TABS = (tab: TopTab) => tab === 'COUPON' ? SUB_TABS_COUPON : SUB_TABS_VOUCHER;

const COUPON_FILTERS = [
  { label: 'Live', filter: 'LIVE' },
  { label: 'Scheduled', filter: 'SCHEDULED' },
  { label: 'Inactive', filter: 'INACTIVE' },
];

const PIE_COLORS = ['#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

function fmt(v: number | null | undefined, currency = true) {
  if (v == null) return '—';
  const rounded = Math.round(Number(v));
  return currency ? `₹${rounded.toLocaleString('en-IN')}` : String(rounded);
}

function fmtWhole(v: number | null | undefined) {
  if (v == null) return '—';
  return `₹${Math.round(Number(v)).toLocaleString('en-IN')}`;
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function num(n: string | number | null | undefined) {
  if (n == null || n === '') return '—';
  return Math.round(Number(n)).toLocaleString('en-IN');
}

function pct(n: string | number | null | undefined) {
  if (n == null || n === '') return '—';
  return `${Number(n).toFixed(2)}%`;
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type DownloadableOrderRow = {
  poNumber: string;
  orderAmount: string;
  appliedCouponAmount: string;
  couponStatus: string;
  orderStatus: string;
  couponName: string;
  buyerPhone: string;
  buyerBusinessName: string;
  sellerPhone: string;
  sellerBusinessName: string;
  orderCreatedAt: string;
  couponAppliedAt: string;
};

const DOWNLOAD_HEADERS = [
  'PO #', 'Order Amount', 'Applied Coupon Amt', 'Coupon Status', 'Order Status',
  'Coupon Name', 'Buyer Phone', 'Buyer Business', 'Seller Phone', 'Seller Business',
  'Order Created', 'Coupon Applied',
] as const;

function rowToValues(r: DownloadableOrderRow): (string | number)[] {
  return [
    r.poNumber,
    Number(r.orderAmount) || 0,
    Number(r.appliedCouponAmount) || 0,
    r.couponStatus,
    r.orderStatus,
    r.couponName,
    r.buyerPhone,
    r.buyerBusinessName,
    r.sellerPhone,
    r.sellerBusinessName,
    r.orderCreatedAt,
    r.couponAppliedAt,
  ];
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadOrderDetailsCSV(rows: DownloadableOrderRow[]) {
  const lines = [DOWNLOAD_HEADERS.join(',')];
  for (const r of rows) {
    lines.push(rowToValues(r).map(csvEscape).join(','));
  }
  const csv = '﻿' + lines.join('\r\n');
  triggerDownload(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    `coupon-order-details-${formatDateLocal(new Date())}.csv`,
  );
}

async function downloadOrderDetailsXLSX(rows: DownloadableOrderRow[]) {
  const XLSX = await import('xlsx');
  const aoa: (string | number)[][] = [
    [...DOWNLOAD_HEADERS],
    ...rows.map(rowToValues),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
    { wch: 18 }, { wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 32 },
    { wch: 22 }, { wch: 22 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Coupon Orders');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `coupon-order-details-${formatDateLocal(new Date())}.xlsx`,
  );
}

function getDateRangeParams(filter: string, customStart?: string, customEnd?: string) {
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
    case 'all':
      return {}; // All days
    default:
      return {}; // All days
  }

  return {
    startDate: formatDateLocal(startDate),
    endDate: formatDateLocal(endDate),
  };
}

export default function CouponsPage() {
  const [topTab, setTopTab] = useState<TopTab>('COUPON');
  const [subTab, setSubTab] = useState(0);
  const [couponFilterTab, setCouponFilterTab] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [topCoupons, setTopCoupons] = useState<CouponRow[]>([]);
  const [failure, setFailure] = useState<FailureRow[]>([]);
  const [violations, setViolations] = useState<ViolationStats | null>(null);
  const [violationDetails, setViolationDetails] = useState<ViolationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateVoucherModal, setShowCreateVoucherModal] = useState(false);
  const [selectedDashboardCode, setSelectedDashboardCode] = useState<string | null>('FIRSTORDER');
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [couponTrends, setCouponTrends] = useState<CouponTrendRow[]>([]);
  const [orderTrends, setOrderTrends] = useState<OrderTrendRow[]>([]);
  const [orderCouponTrends, setOrderCouponTrends] = useState<OrderCouponTrendRow[]>([]);
  const [orderDetails, setOrderDetails] = useState<CouponOrderDetailRow[]>([]);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [orderDetailsError, setOrderDetailsError] = useState<string | null>(null);
  const [orderDetailsStatus, setOrderDetailsStatus] = useState<string>('');
  const [orderDetailsSearch, setOrderDetailsSearch] = useState<string>('');
  const [orderDetailsStartDate, setOrderDetailsStartDate] = useState<string>('');
  const [orderDetailsEndDate, setOrderDetailsEndDate] = useState<string>('');
  const [selectedPoNumber, setSelectedPoNumber] = useState<string | null>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7' | '15' | '30' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [activeVouchers, setActiveVouchers] = useState<Offer[]>([]);
  const [inactiveVouchers, setInactiveVouchers] = useState<Offer[]>([]);
  const [scheduledVouchers, setScheduledVouchers] = useState<Offer[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [vouchersError, setVouchersError] = useState<string | null>(null);
  const [voucherFilterTab, setVoucherFilterTab] = useState(0);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [voucherDashboardData, setVoucherDashboardData] = useState<any>(null);
  const [voucherDashboardLoading, setVoucherDashboardLoading] = useState(false);
  const [voucherDashboardError, setVoucherDashboardError] = useState<string | null>(null);

  const [retailerAnalytics, setRetailerAnalytics] = useState<any>(null);
  const [retailerAnalyticsLoading, setRetailerAnalyticsLoading] = useState(false);
  const [retailerAnalyticsError, setRetailerAnalyticsError] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/offers');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setOffers(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVoucherDashboard = useCallback(async () => {
    setVoucherDashboardLoading(true);
    setVoucherDashboardError(null);
    try {
      const res = await fetch('/api/vouchers/dashboard');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setVoucherDashboardData(json);
    } catch (e) {
      setVoucherDashboardError(e instanceof Error ? e.message : 'Failed to load dashboard');
      console.error('Voucher dashboard error:', e);
    } finally {
      setVoucherDashboardLoading(false);
    }
  }, []);

  const fetchVouchers = useCallback(async () => {
    setVouchersLoading(true);
    setVouchersError(null);
    try {
      // Fetch all vouchers to filter them properly
      const res = await fetch('/api/vouchers/list');
      const json = await res.json();
      console.log('Vouchers API response:', json);
      if (json.error) throw new Error(json.error);

      const allVouchers = json.data ?? [];
      console.log('All vouchers fetched:', allVouchers);
      console.log('Total count:', allVouchers.length);
      const now = new Date();

      // Filter vouchers based on their status
      const active = allVouchers.filter((v: any) => {
        const isActive = v.isActive === true;
        const expiryTime = new Date(v.end_time);
        const result = isActive && expiryTime > now;
        console.log(`Voucher ${v.code}: isActive=${isActive}, expiry=${v.end_time}, > now=${expiryTime > now}, active=${result}`);
        return result;
      });

      const scheduled = allVouchers.filter((v: any) => {
        const activationTime = new Date(v.start_time);
        // Scheduled: activation time in future AND not marked as test/deactivated
        const result = activationTime > now && v.isTest !== true;
        console.log(`Voucher ${v.code}: activation=${v.start_time}, > now=${activationTime > now}, isTest=${v.isTest}, scheduled=${result}`);
        return result;
      });

      const inactive = allVouchers.filter((v: any) => {
        const isActive = v.isActive === true;
        const expiryTime = new Date(v.end_time);
        const activationTime = new Date(v.start_time);
        // Inactive: not active, or expired, and not scheduled (unless marked as test/deactivated)
        const result = (!(isActive && expiryTime > now) && !(activationTime > now)) || v.isTest === true;
        console.log(`Voucher ${v.code}: isTest=${v.isTest}, inactive=${result}`);
        return result;
      });

      console.log('Filtered Active:', active.length, active);
      console.log('Filtered Scheduled:', scheduled.length, scheduled);
      console.log('Filtered Inactive:', inactive.length, inactive);
      console.log('Total filtered:', active.length + scheduled.length + inactive.length);
      setActiveVouchers(active);
      setScheduledVouchers(scheduled);
      setInactiveVouchers(inactive);
    } catch (e) {
      console.error('Error fetching vouchers:', e);
      setVouchersError(e instanceof Error ? e.message : 'Failed to load vouchers');
    } finally {
      setVouchersLoading(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      // If custom filter is selected but dates are incomplete, show all data
      let params: any = {};
      if (dateFilter === 'custom') {
        if (customStartDate && customEndDate) {
          params = getDateRangeParams('custom', customStartDate, customEndDate);
        }
        // else: show all data (empty params)
      } else {
        params = getDateRangeParams(dateFilter);
      }

      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const [mRes, cRes, fRes, vRes, tRes, ocRes] = await Promise.all([
        fetch(`/api/metrics${queryString}`),
        fetch(`/api/coupon-performance${queryString}`),
        fetch(`/api/failure-analysis${queryString}`),
        fetch(`/api/coupon-usage-violations${queryString}`),
        fetch(`/api/trends?granularity=daily${queryString ? '&' + queryParams.toString() : ''}`),
        fetch(`/api/order-coupon-trends${queryString}`),
      ]);
      const [mJson, cJson, fJson, vJson, tJson, ocJson] = await Promise.all([
        mRes.json(),
        cRes.json(),
        fRes.json(),
        vRes.json(),
        tRes.json(),
        ocRes.json(),
      ]);
      if (mJson.error) throw new Error(mJson.error);
      setMetrics(mJson.data);
      setTopCoupons(cJson.data ?? []);
      setFailure(fJson.data ?? []);
      setTrends(tJson.data ?? []);
      setOrderCouponTrends(ocJson.data ?? []);
      if (vJson.data) {
        setViolations(vJson.data.stats);
        setViolationDetails(vJson.data.details ?? []);
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
  }, [dateFilter, customStartDate, customEndDate]);

  const handleToggleStatus = async (offerId: string, isTest: boolean, isActive: boolean) => {
    const isCurrentlyActive = !isTest && isActive;
    const action = isCurrentlyActive ? 'deactivate' : 'activate';

    if (!confirm(`Are you sure you want to ${action} this coupon?`)) return;

    try {
      const endpoint = isCurrentlyActive ? '/api/offers/deactivate' : '/api/offers/activate';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `Failed to ${action}`);

      setOffers(prev =>
        prev.map(o =>
          o.id === offerId
            ? {
                ...o,
                isTest: isCurrentlyActive ? true : false,
                isActive: isCurrentlyActive ? false : true,
              }
            : o
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : `Failed to ${action} coupon`);
    }
  };

  const fetchRetailerAnalytics = useCallback(async () => {
    setRetailerAnalyticsLoading(true);
    setRetailerAnalyticsError(null);
    try {
      let params: any = {};
      if (dateFilter === 'custom') {
        if (customStartDate && customEndDate) {
          params = getDateRangeParams('custom', customStartDate, customEndDate);
        }
      } else {
        params = getDateRangeParams(dateFilter);
      }

      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const res = await fetch(`/api/coupon-retailer-analytics${queryString}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRetailerAnalytics(json);
    } catch (e) {
      setRetailerAnalyticsError(e instanceof Error ? e.message : 'Failed to load');
      console.error('Retailer analytics error:', e);
    } finally {
      setRetailerAnalyticsLoading(false);
    }
  }, [dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    fetchOffers();
    fetchDashboardData();
    fetchRetailerAnalytics();
    fetchVouchers();
    fetchVoucherDashboard();
  }, [fetchOffers, fetchDashboardData, fetchRetailerAnalytics, fetchVouchers, fetchVoucherDashboard]);

  useEffect(() => {
    if (selectedDashboardCode) {
      const fetchCouponTrends = async () => {
        try {
          // If custom filter is selected but dates are incomplete, show all data
          let params: any = {};
          if (dateFilter === 'custom') {
            if (customStartDate && customEndDate) {
              params = getDateRangeParams('custom', customStartDate, customEndDate);
            }
            // else: show all data (empty params)
          } else {
            params = getDateRangeParams(dateFilter);
          }

          const queryParams = new URLSearchParams();
          queryParams.append('code', selectedDashboardCode);
          queryParams.append('granularity', 'daily');
          if (params?.startDate) queryParams.append('startDate', params.startDate);
          if (params?.endDate) queryParams.append('endDate', params.endDate);

          const [trendsRes, orderRes] = await Promise.all([
            fetch(`/api/coupon-trends?${queryParams.toString()}`),
            fetch(`/api/coupon-order-trends?${queryParams.toString()}`),
          ]);
          const [trendsJson, orderJson] = await Promise.all([
            trendsRes.json(),
            orderRes.json(),
          ]);
          if (trendsJson.data) {
            setCouponTrends(trendsJson.data);
          }
          if (orderJson.data) {
            setOrderTrends(orderJson.data);
          }
        } catch (e) {
          console.error('Failed to load coupon trends:', e);
        }
      };
      fetchCouponTrends();
    } else {
      setCouponTrends([]);
      setOrderTrends([]);
    }
  }, [selectedDashboardCode, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    if (topTab !== 'COUPON' || subTab !== 2) return;
    const ctrl = new AbortController();
    const load = async () => {
      setOrderDetailsLoading(true);
      setOrderDetailsError(null);
      try {
        const params: Record<string, string> = {};
        if (orderDetailsStartDate && orderDetailsEndDate) {
          params.startDate = orderDetailsStartDate;
          params.endDate = orderDetailsEndDate;
        }
        if (orderDetailsStatus) params.status = orderDetailsStatus;
        if (orderDetailsSearch.trim()) params.search = orderDetailsSearch.trim();
        const qs = new URLSearchParams(params).toString();
        const res = await fetch(`/api/coupon-order-details${qs ? `?${qs}` : ''}`, { signal: ctrl.signal });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setOrderDetails(json.data ?? []);
      } catch (e) {
        if ((e as { name?: string }).name === 'AbortError') return;
        setOrderDetailsError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setOrderDetailsLoading(false);
      }
    };
    load();
    return () => ctrl.abort();
  }, [topTab, subTab, orderDetailsStartDate, orderDetailsEndDate, orderDetailsStatus, orderDetailsSearch]);

  const filtered = offers.filter(o => {
    const filterValue = COUPON_FILTERS[couponFilterTab].filter;
    const statusMatch =
      filterValue === 'LIVE' ? o.offer_status?.toUpperCase() === 'LIVE' || o.offer_status?.toUpperCase() === 'ACTIVE' :
      filterValue === 'SCHEDULED' ? o.offer_status?.toUpperCase() === 'SCHEDULED' :
      filterValue === 'INACTIVE' ? !['LIVE', 'ACTIVE', 'SCHEDULED'].includes(o.offer_status?.toUpperCase()) :
      false;
    const searchMatch = !search ||
      o.coupon_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.code?.toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  const formatDiscount = (o: Offer) => {
    if (o.discount_type === 'conditional') {
      return `${o.discount_value}%`;
    }
    return fmt(o.discount_value);
  };

  const formatMinOrder = (o: Offer) => {
    if (!o.min_order_value || o.min_order_value === 'null' || o.min_order_value === '0') {
      return 'No minimum';
    }
    return fmt(Number(o.min_order_value));
  };

  const formatMaxDiscount = (o: Offer) => {
    return fmt(o.max_discount);
  };

  return (
    <div className="space-y-8 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 min-h-screen p-8">
      <div className="rounded-3xl p-8 bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 backdrop-blur-lg border-2 border-purple-200 shadow-lg">
        {/* Primary tabs: COUPON | VOUCHER */}
        <div className="flex items-center gap-0 mb-8">
          <div className="flex rounded-xl border-2 border-purple-200 overflow-hidden bg-gradient-to-r from-purple-100 to-purple-200 backdrop-blur-lg p-1">
            {TOP_TABS.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTopTab(t);
                  setSubTab(0);
                  setCouponFilterTab(0);
                }}
                className={`px-8 py-3 text-sm font-black transition-all duration-300 rounded-lg khilna-button
                  ${topTab === t
                    ? 'text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-400/40'
                    : 'text-purple-950 hover:text-purple-600 hover:bg-purple-200 hover:shadow-md'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Date Range Filter - Only visible on Dashboard tab */}
          {topTab === 'COUPON' && subTab === 0 && (
            <div className="flex items-center gap-2 ml-auto">
              {dateFilter === 'custom' ? (
                // Custom Date Mode
                <div className="flex items-center gap-2">
                  <div className="flex gap-2 border-r border-purple-200/50 pr-4">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-2 text-xs border border-purple-300 bg-purple-100 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 khilna-button"
                      placeholder="Start Date"
                    />
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-2 text-xs border border-purple-300 bg-purple-100 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 khilna-button"
                      placeholder="End Date"
                    />
                  </div>

                  {/* Back Button */}
                  <button
                    onClick={() => {
                      setDateFilter('all' as any);
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg transition-all bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-400/40 khilna-button"
                  >
                    ← Back
                  </button>
                </div>
              ) : (
                // Standard Date Filter Mode
                <>
                  <div className="flex gap-3 items-center">
                    {/* Date Filter Buttons Container */}
                    <div className="flex gap-3 bg-gradient-to-r from-purple-100/50 to-indigo-100/50 p-2 rounded-2xl border border-purple-200/60 backdrop-blur-sm">
                      {[
                        { label: 'Today', value: 'today', icon: '📅' },
                        { label: 'Last 7 Days', value: '7', icon: '📊' },
                        { label: 'Last 15 Days', value: '15', icon: '📈' },
                        { label: 'Last 30 Days', value: '30', icon: '📉' },
                        { label: 'All Time', value: 'all', icon: '∞' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setDateFilter(option.value as any);
                            setCustomStartDate('');
                            setCustomEndDate('');
                          }}
                          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 khilna-button flex items-center gap-2 whitespace-nowrap ${
                            dateFilter === option.value
                              ? 'bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 text-white shadow-xl shadow-purple-500/40 scale-105 border border-purple-400'
                              : 'bg-white/70 text-purple-900 hover:bg-white hover:shadow-lg hover:border-purple-300 border border-purple-200/50'
                          }`}
                        >
                          <span>{option.icon}</span>
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Custom Date Button */}
                    <button
                      onClick={() => setDateFilter('custom' as any)}
                      className="px-5 py-2.5 text-xs font-bold rounded-xl transition-all bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 text-white shadow-xl shadow-purple-500/40 hover:shadow-2xl hover:from-purple-500 hover:to-indigo-600 border border-purple-400/50 khilna-button flex items-center gap-2 whitespace-nowrap"
                    >
                      <span>🗓️</span>
                      <span>Custom</span>
                    </button>

                    {/* Reset Filter Button - Show only when filter is not "all" */}
                    {dateFilter !== 'all' && (
                      <button
                        onClick={() => {
                          setDateFilter('all' as any);
                          setCustomStartDate('');
                          setCustomEndDate('');
                        }}
                        className="px-4 py-2.5 text-xs font-bold rounded-xl transition-all bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-400/40 hover:shadow-xl hover:from-red-600 hover:to-rose-700 border border-red-400/50 khilna-button flex items-center gap-2 whitespace-nowrap"
                      >
                        <span>✕</span>
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sub-tabs: Coupon | Dashboard | Analysis | Details */}
        <div className="mb-8">
          <div className="flex items-center justify-between pb-4 border-b-2 border-purple-200">
            <div className="flex gap-8">
              {SUB_TABS(topTab).map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => {
                    setSubTab(i);
                    setCouponFilterTab(0);
                  }}
                  className={`pb-3 text-sm font-black border-b-3 transition-all duration-300 khilna-tab
                    ${subTab === i
                      ? 'border-purple-600 text-purple-950'
                      : 'border-transparent text-slate-700 hover:text-purple-600 hover:border-b-purple-300'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {topTab === 'COUPON' && subTab === 3 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-purple-400/40 hover:shadow-xl hover:shadow-purple-400/60 hover:scale-105 transition-all duration-300 khilna-button">
                ✨ Add New Coupon
              </button>
            )}
            {topTab === 'VOUCHER' && subTab === 1 && (
              <button
                onClick={() => setShowCreateVoucherModal(true)}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-purple-400/40 hover:shadow-xl hover:shadow-purple-400/60 hover:scale-105 transition-all duration-300 khilna-button">
                ✨ Add New Voucher
              </button>
            )}
          </div>
        </div>

        {/* Coupon filters: Live | Scheduled | Inactive (only show when in Coupon sub-tab) */}
        {subTab === 3 && topTab === 'COUPON' && (
          <div className="mb-6 border-b border-purple-200 pb-4">
            <div className="flex gap-6">
              {COUPON_FILTERS.map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => setCouponFilterTab(i)}
                  className={`pb-2 text-sm font-bold border-b-2 transition-all duration-300 khilna-tab
                    ${couponFilterTab === i
                      ? 'border-purple-600 text-purple-950 drop-shadow-lg drop-shadow-purple-500/30'
                      : 'border-transparent text-slate-700 hover:text-purple-600 hover:border-b-purple-200/50'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content sections */}
        {topTab === 'COUPON' && subTab === 3 ? (
          <>
            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="🔍 Search by name or code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-72 rounded-xl border border-purple-300 bg-purple-100 px-4 py-3 text-sm text-slate-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-300 khilna-button"
              />
            </div>

            {/* Table */}
            {loading ? (
              <div className="py-16 text-center text-gray-700 text-sm">Loading coupons…</div>
            ) : error ? (
              <div className="py-16 text-center text-red-500 text-sm">
                <p className="font-medium">Could not load data</p>
                <p className="text-xs mt-1">{error}</p>
                <button onClick={fetchOffers} className="mt-3 text-blue-600 underline text-xs">Retry</button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-purple-300">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-100 to-purple-200 border-b border-purple-300 text-slate-900 text-xs uppercase tracking-wide font-bold">
                      <th className="px-4 py-3 text-left">CODE</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Discount</th>
                      <th className="px-4 py-3 text-left">Min Order</th>
                      <th className="px-4 py-3 text-left">Max Discount</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-left">Max per User</th>
                      <th className="px-4 py-3 text-left">Usage</th>
                      <th className="px-4 py-3 text-left">Valid Till</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-200">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-10 text-center text-gray-500">
                          No coupons found
                        </td>
                      </tr>
                    ) : (
                      filtered.map((o) => (
                        <tr key={o.id} className="khilna-row bg-purple-50/30 hover:bg-purple-100/60">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            <button
                              onClick={() => setSelectedCode(o.code)}
                              className="text-slate-900 hover:text-purple-950 hover:underline transition-colors font-bold"
                            >
                              {o.code ?? '—'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-medium">{o.coupon_name ?? '—'}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={o.offer_status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-900 font-bold">{formatDiscount(o)}</div>
                            <div className="text-xs text-slate-700 mt-0.5">
                              {o.discount_type === 'conditional' ? 'Percentage' : 'Flat'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-medium">
                            <div>{formatMinOrder(o)}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-medium">
                            <div>{formatMaxDiscount(o)}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {o.internal_description ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                            {o.max_usage_per_user ? `${o.max_usage_per_user}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-medium">
                            <span>{o.usage_count ?? 0}</span>
                            {o.usage_limit ? (
                              <span className="text-slate-700"> / {o.usage_limit}</span>
                            ) : (
                              <span className="text-slate-700"> / ∞</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700 text-sm">{fmtDate(o.end_time)}</td>
                          <td className="px-4 py-3 text-center">
                            {(() => {
                              const shouldDeactivate = o.offer_status === 'LIVE' || o.offer_status === 'SCHEDULED';
                              return (
                                <button
                                  onClick={() => handleToggleStatus(o.id, o.isTest || false, o.isActive || false)}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm hover:shadow-md khilna-button ${
                                    shouldDeactivate
                                      ? 'text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                                      : 'text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                                  }`}
                                >
                                  {shouldDeactivate ? 'Deactivate' : 'Activate'}
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && !error && (
              <p className="mt-3 text-xs text-gray-700">{filtered.length} coupon(s) shown</p>
            )}
          </>
        ) : topTab === 'COUPON' && subTab === 0 ? (
          <div className="space-y-6">
            {/* Code Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-slate-900">Filter by Code:</label>
              <select
                value={selectedDashboardCode || ''}
                onChange={(e) => setSelectedDashboardCode(e.target.value || null)}
                className="px-4 py-2 bg-purple-100 border border-purple-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all khilna-button"
              >
                <option value="">All Coupons</option>
                {topCoupons.map((coupon) => (
                  <option key={coupon.code} value={coupon.code}>
                    {coupon.code} - {coupon.coupon_name}
                  </option>
                ))}
              </select>
              {selectedDashboardCode && (
                <button
                  onClick={() => setSelectedDashboardCode(null)}
                  className="px-3 py-2 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-all"
                >
                  ✕ Clear Filter
                </button>
              )}
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-6 gap-3">
              {(() => {
                const selected = selectedDashboardCode
                  ? topCoupons.find(c => c.code === selectedDashboardCode)
                  : null;

                let appliedAmount = '—';
                let appliedOrderCount = '—';
                let appliedOrderValue = '—';
                let appliedPercentage = '—';
                let avgOrderValue = '—';

                if (selected) {
                  appliedAmount = fmt(Number(selected.total_discount_burn));
                  appliedOrderCount = num(selected.usage_count);
                  appliedOrderValue = fmt(Number(selected.total_revenue));
                  appliedPercentage = `${Math.round(Number(selected.discount_pct_of_revenue))}%`;
                  avgOrderValue = fmtWhole(Number(selected.avg_order_value));
                } else if (metrics) {
                  appliedAmount = metrics.total_discount_burn ? fmt(Number(metrics.total_discount_burn)) : '—';
                  appliedOrderCount = metrics.applied_count ? num(metrics.applied_count) : '—';
                  appliedOrderValue = metrics.total_revenue ? fmt(Number(metrics.total_revenue)) : '—';
                  appliedPercentage = metrics.conversion_rate ? pct(metrics.conversion_rate) : '—';
                  // Calculate average from total revenue and applied count
                  if (metrics.total_revenue && metrics.applied_count) {
                    avgOrderValue = fmtWhole(Number(metrics.total_revenue) / Number(metrics.applied_count));
                  }
                }

                return (
                  <>
                    <div className="khilna-card p-2 rounded-xl bg-white border border-purple-200 text-center">
                      <p className="text-xs text-slate-700 font-semibold uppercase mb-1">Applied Amount</p>
                      <p className="text-2xl font-black text-slate-900">{appliedAmount}</p>
                      <p className="text-xs text-slate-700 mt-0.5">Total discount burn</p>
                    </div>
                    <div className="khilna-card p-2 rounded-xl bg-white border border-purple-200 text-center">
                      <p className="text-xs text-slate-700 font-semibold uppercase mb-1">Applied Orders</p>
                      <p className="text-2xl font-black text-slate-900">{appliedOrderCount}</p>
                      <p className="text-xs text-slate-700 mt-0.5">Order count</p>
                    </div>
                    <div className="khilna-card p-2 rounded-xl bg-white border border-purple-200 text-center">
                      <p className="text-xs text-slate-700 font-semibold uppercase mb-1">Order Value</p>
                      <p className="text-2xl font-black text-slate-900">{appliedOrderValue}</p>
                      <p className="text-xs text-slate-700 mt-0.5">Total revenue</p>
                    </div>
                    <div className="khilna-card p-2 rounded-xl bg-white border border-purple-200 text-center">
                      <p className="text-xs text-slate-700 font-semibold uppercase mb-1">Avg Order Value</p>
                      <p className="text-2xl font-black text-slate-900">{avgOrderValue}</p>
                      <p className="text-xs text-slate-700 mt-0.5">Per order</p>
                    </div>
                    <div className="khilna-card p-2 rounded-xl bg-white border border-purple-200 text-center">
                      <p className="text-xs text-slate-700 font-semibold uppercase mb-1">% Applied</p>
                      <p className="text-2xl font-black text-slate-900">{appliedPercentage}</p>
                      <p className="text-xs text-slate-700 mt-0.5">Percentage</p>
                    </div>
                    <div className="khilna-card p-2 rounded-xl bg-white border border-purple-200 text-center">
                      <p className="text-xs text-slate-700 font-semibold uppercase mb-1">Avg Applied Amount</p>
                      <p className="text-2xl font-black text-slate-900">
                        {(() => {
                          const appliedAmt = Number(appliedAmount?.replace(/[₹,]/g, '') || 0);
                          const appliedOrders = Number(appliedOrderCount || 0);
                          const avgAmt = appliedOrders > 0 ? Math.round(appliedAmt / appliedOrders) : 0;
                          return `₹${avgAmt.toLocaleString('en-IN')}`;
                        })()}
                      </p>
                      <p className="text-xs text-slate-700 mt-0.5">Per applied order</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Top Coupons Table */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-violet-400/40">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v18M19 3v18M5 9h14M5 15h14M9 3v18M15 3v18"/></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black bg-gradient-to-r from-violet-700 via-indigo-700 to-cyan-700 bg-clip-text text-transparent leading-none tracking-tight whitespace-nowrap">Top Performing Coupons</h3>
                  <p className="mt-1 text-xs font-medium text-slate-700">Ranked by total applied amount</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-purple-300">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-100 to-purple-200 border-b border-purple-300 text-slate-900 text-xs uppercase tracking-wide font-bold">
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Coupon Name</th>
                      <th className="px-4 py-3 text-right">Applied Amount</th>
                      <th className="px-4 py-3 text-right">Order Count</th>
                      <th className="px-4 py-3 text-right">Order Value</th>
                      <th className="px-4 py-3 text-right">Avg Order Value</th>
                      <th className="px-4 py-3 text-right">Avg Applied Amount</th>
                      <th className="px-4 py-3 text-right">Applied Amount %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-200">
                    {topCoupons.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-700 text-sm">
                          No coupon data available
                        </td>
                      </tr>
                    ) : (
                      topCoupons.map((coupon) => {
                        const appliedAmountPct = Number(coupon.total_revenue) > 0
                          ? Math.round((Number(coupon.total_discount_burn) / Number(coupon.total_revenue)) * 100)
                          : 0;
                        const avgAppliedAmount = Number(coupon.usage_count) > 0
                          ? Math.round(Number(coupon.total_discount_burn) / Number(coupon.usage_count))
                          : 0;
                        return (
                          <tr
                            key={coupon.code}
                            className={`khilna-row cursor-pointer hover:bg-purple-100 transition-colors ${selectedDashboardCode === coupon.code ? 'bg-purple-100/80 border-l-4 border-purple-600' : 'bg-purple-50/30'}`}
                            onClick={() => setSelectedDashboardCode(coupon.code)}
                          >
                            <td className="px-4 py-3 font-mono font-bold text-slate-900 hover:underline">{coupon.code}</td>
                            <td className="px-4 py-3 text-slate-900 font-medium">{coupon.coupon_name}</td>
                            <td className="px-4 py-3 text-right text-slate-900 font-bold">{fmt(Number(coupon.total_discount_burn))}</td>
                            <td className="px-4 py-3 text-right text-slate-900 font-bold">{num(coupon.usage_count)}</td>
                            <td className="px-4 py-3 text-right text-slate-900 font-bold">{fmt(Number(coupon.total_revenue))}</td>
                            <td className="px-4 py-3 text-right text-slate-900 font-bold">{fmtWhole(Number(coupon.avg_order_value))}</td>
                            <td className="px-4 py-3 text-right text-slate-900 font-bold">{fmt(avgAppliedAmount)}</td>
                            <td className="px-4 py-3 text-right text-slate-900 font-bold">{appliedAmountPct}%</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Count Day-wise Trend Chart - Moved to Bottom */}
            {selectedDashboardCode && (
              <div className="khilna-card p-6 rounded-xl bg-white border border-purple-200">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Day-wise Trend - {selectedDashboardCode}</h3>
                {couponTrends.length === 0 ? (
                  <div className="h-96 flex items-center justify-center text-gray-700">
                    <p>No data available for this coupon</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={450}>
                    <ComposedChart
                      data={couponTrends.map(t => ({
                        ...t,
                        date: t.day_bucket ? new Date(t.day_bucket).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : t.hour_bucket,
                        order_count: Number(t.order_count),
                        applied_coupon_amount: Number(t.applied_coupon_amount),
                        order_amount: Number(t.order_amount)
                      }))}
                      margin={{ top: 20, right: 80, left: 60, bottom: 60 }}
                    >
                      <defs>
                        <linearGradient id="colorOrder" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorApplied" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        style={{ fontSize: '12px', fontWeight: 500 }}
                        tick={{ fill: '#6b7280' }}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#3b82f6"
                        style={{ fontSize: '12px', fontWeight: 500 }}
                        tick={{ fill: '#3b82f6' }}
                        label={{ value: 'Order Count', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: '12px', fontWeight: 'bold', fill: '#3b82f6' } }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#1f2937"
                        style={{ fontSize: '12px', fontWeight: 500 }}
                        tick={{ fill: '#1f2937' }}
                        label={{ value: 'Amount (₹)', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: '12px', fontWeight: 'bold', fill: '#1f2937' } }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: '2px solid #8b5cf6',
                          borderRadius: '12px',
                          padding: '16px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                        }}
                        labelStyle={{ color: '#1f2937', fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}
                        formatter={(value: any, name: any) => {
                          if (name === '💰 Order Amount') return [fmt(value), '💰 Order Amount'];
                          if (name === '🎁 Applied Discount') return [fmt(value), '🎁 Applied Discount'];
                          return [num(value), '📊 Order Count'];
                        }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="line"
                        height={30}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="order_amount"
                        fill="url(#colorOrder)"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="💰 Order Amount"
                        radius={[8, 8, 0, 0]}
                        opacity={0.8}
                        label={{ position: 'top', fill: '#166534', fontSize: 11, fontWeight: 'bold', formatter: (value: any) => fmt(value), offset: 8 }}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="applied_coupon_amount"
                        fill="url(#colorApplied)"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="🎁 Applied Discount"
                        radius={[8, 8, 0, 0]}
                        opacity={0.8}
                        label={{ position: 'top', fill: '#991b1b', fontSize: 11, fontWeight: 'bold', formatter: (value: any) => fmt(value), offset: 8 }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="order_count"
                        stroke="#3b82f6"
                        strokeWidth={3.5}
                        dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 7, strokeWidth: 2 }}
                        label={{ position: 'top', fill: '#1f2937', fontSize: 11, fontWeight: 'bold', formatter: (value: any) => num(value), offset: 12 }}
                        name="📊 Order Count"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>
        ) : topTab === 'COUPON' && subTab === 1 ? (
          <div className="space-y-6">
            {/* Trend Title */}
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/10 blur-3xl -z-10" />
              <h2 className="text-4xl font-black bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">✨ Business Analytics & Insights</h2>
              <p className="text-sm font-medium text-slate-700 mt-2">Live signals across coupons, orders, and revenue</p>
              <div className="mt-3 h-[3px] w-32 rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />
            </div>

            {/* 0. Coupon Impact on Order Volume */}
            {orderCouponTrends.length > 0 && (
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-violet-50/70 via-indigo-50/50 to-cyan-50/70 border border-violet-200/60 shadow-xl shadow-violet-300/20 backdrop-blur-sm overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4 relative">
                  <div>
                    <h3 className="text-xl font-black bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">🎯 Coupon Impact on Order Trend</h3>
                    <p className="text-xs font-medium text-slate-700 mt-1">Coupon-driven vs non-coupon orders (INTERCITY + THIRD_PARTY)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">{orderCouponTrends.reduce((sum, t) => sum + Number(t.coupon_driven_orders), 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-violet-700">Coupon Orders</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={420}>
                  <ComposedChart data={[...orderCouponTrends].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime()).map(t => ({
                    ...t,
                    date: new Date(t.Date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                    total_orders: Number(t.total_orders),
                    coupon_driven_orders: Number(t.coupon_driven_orders),
                    no_coupon_orders: Number(t.no_coupon_orders)
                  }))}>
                    <defs>
                      <linearGradient id="colorCouponDriven" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.95}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                      </linearGradient>
                      <linearGradient id="colorNoCoupon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.95}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.15}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ddd6fe" />
                    <XAxis
                      dataKey="date"
                      stroke="#7c3aed"
                      style={{ fontSize: '12px', fontWeight: 600 }}
                    />
                    <YAxis
                      stroke="#7c3aed"
                      style={{ fontSize: '12px', fontWeight: 600 }}
                      label={{ value: 'Order Count', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: '12px', fontWeight: 'bold', fill: '#7c3aed' } }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '2px solid #8b5cf6',
                        borderRadius: '14px',
                        padding: '16px',
                        boxShadow: '0 20px 40px rgba(236, 72, 153, 0.25)',
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === '💳 Coupon Driven') return [num(value), '💳 Coupon Driven'];
                        if (name === '🔌 No Coupon') return [num(value), '🔌 No Coupon'];
                        return [num(value), '📊 Total Orders'];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      height={30}
                    />
                    <Bar
                      dataKey="coupon_driven_orders"
                      fill="url(#colorCouponDriven)"
                      name="💳 Coupon Driven"
                      radius={[10, 10, 0, 0]}
                      stroke="#8b5cf6"
                      strokeWidth={1}
                    >
                      <LabelList dataKey="coupon_driven_orders" position="top" fill="#7c3aed" fontSize={12} fontWeight="bold" />
                    </Bar>
                    <Bar
                      dataKey="no_coupon_orders"
                      fill="url(#colorNoCoupon)"
                      name="🔌 No Coupon"
                      radius={[10, 10, 0, 0]}
                      stroke="#06b6d4"
                      strokeWidth={1}
                    >
                      <LabelList dataKey="no_coupon_orders" position="top" fill="#0e7490" fontSize={12} fontWeight="bold" />
                    </Bar>
                    <Line
                      type="monotone"
                      dataKey="total_orders"
                      stroke="#f59e0b"
                      strokeWidth={3.5}
                      name="📊 Total Orders"
                      dot={{ fill: '#f59e0b', r: 6, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 9, fill: '#f59e0b', stroke: '#fff', strokeWidth: 3 }}
                      label={{ position: 'top', fill: '#b45309', fontSize: 11, fontWeight: 'bold', offset: 12 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 1. Daily Order & Revenue Trend */}
            {trends.length > 0 && (
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-violet-50/50 to-cyan-50/70 border border-indigo-200/60 shadow-xl shadow-indigo-300/20 backdrop-blur-sm overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4 relative">
                  <div>
                    <h3 className="text-xl font-black bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 bg-clip-text text-transparent">📈 Daily Order & Revenue Trend</h3>
                    <p className="text-xs font-medium text-slate-700 mt-1">Real-time metrics: order volume, discount burn, revenue impact</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">{trends.length}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Days</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={420}>
                  <ComposedChart data={[...trends].sort((a, b) => {
                    const dateA = a.day_bucket ? new Date(a.day_bucket).getTime() : 0;
                    const dateB = b.day_bucket ? new Date(b.day_bucket).getTime() : 0;
                    return dateA - dateB;
                  }).map(t => ({
                    ...t,
                    date: t.day_bucket ? new Date(t.day_bucket).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : t.hour_bucket,
                    coupon_orders: Number(t.coupon_orders),
                    discount_burn: Number(t.discount_burn),
                    revenue: Number(t.revenue)
                  }))}>
                    <defs>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.95}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.2}/>
                      </linearGradient>
                      <linearGradient id="colorDiscount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ddd6fe" />
                    <XAxis
                      dataKey="date"
                      stroke="#7c3aed"
                      style={{ fontSize: '12px', fontWeight: 600 }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#7c3aed"
                      style={{ fontSize: '12px', fontWeight: 600 }}
                      label={{ value: 'Order Count', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: '12px', fontWeight: 'bold', fill: '#7c3aed' } }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#0e7490"
                      style={{ fontSize: '12px', fontWeight: 600 }}
                      label={{ value: 'Amount (₹)', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: '12px', fontWeight: 'bold', fill: '#0e7490' } }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '2px solid #8b5cf6',
                        borderRadius: '14px',
                        padding: '16px',
                        boxShadow: '0 20px 40px rgba(236, 72, 153, 0.25)',
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === '💰 Total Revenue') return [fmt(value), '💰 Total Revenue'];
                        if (name === '🎁 Discount Burn') return [fmt(value), '🎁 Discount Burn'];
                        return [num(value), '📊 Order Count'];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      height={30}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="coupon_orders"
                      fill="url(#colorOrders)"
                      name="📊 Order Count"
                      radius={[10, 10, 0, 0]}
                      stroke="#8b5cf6"
                      strokeWidth={1}
                    >
                      <LabelList dataKey="coupon_orders" position="top" fill="#7c3aed" fontSize={12} fontWeight="bold" />
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="discount_burn"
                      stroke="#f59e0b"
                      strokeWidth={3.5}
                      name="🎁 Discount Burn"
                      dot={{ fill: '#f59e0b', r: 6, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 9, fill: '#f59e0b', stroke: '#fff', strokeWidth: 3 }}
                      label={{ position: 'top', fill: '#b45309', fontSize: 11, fontWeight: 'bold', offset: 10 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#06b6d4"
                      strokeWidth={3.5}
                      name="💰 Total Revenue"
                      dot={{ fill: '#06b6d4', r: 6, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 9, fill: '#06b6d4', stroke: '#fff', strokeWidth: 3 }}
                      label={{ position: 'bottom', fill: '#0e7490', fontSize: 11, fontWeight: 'bold', offset: 10 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Discount Percentage Trend */}
            {trends.length > 0 && (
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-cyan-50/70 via-violet-50/50 to-amber-50/70 border border-cyan-200/60 shadow-xl shadow-cyan-300/20 backdrop-blur-sm overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between mb-6 relative">
                  <div>
                    <h3 className="text-2xl font-black bg-gradient-to-r from-cyan-600 via-violet-600 to-amber-500 bg-clip-text text-transparent">📉 Discount Burn % Trend</h3>
                    <p className="text-sm font-semibold text-slate-700 mt-2">How much of your daily revenue is being given away as discounts - Track this to optimize profitability</p>
                  </div>
                  <div className="text-right bg-white/60 backdrop-blur rounded-xl p-4 border border-violet-200/60">
                    <p className="text-4xl font-black bg-gradient-to-r from-cyan-600 to-violet-600 bg-clip-text text-transparent">{trends.length > 0 ? Math.round((trends.reduce((sum, t) => sum + Number(t.discount_burn), 0) / trends.reduce((sum, t) => sum + Number(t.revenue), 0)) * 100) : 0}%</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-violet-700 mt-1">Period Average</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={[...trends].sort((a, b) => {
                    const dateA = a.day_bucket ? new Date(a.day_bucket).getTime() : 0;
                    const dateB = b.day_bucket ? new Date(b.day_bucket).getTime() : 0;
                    return dateA - dateB;
                  }).map(t => ({
                    date: t.day_bucket ? new Date(t.day_bucket).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : t.hour_bucket,
                    discount_pct: Number(((Number(t.discount_burn) / Number(t.revenue)) * 100).toFixed(2))
                  }))}>
                    <defs>
                      <linearGradient id="discountPct" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={1}/>
                        <stop offset="50%" stopColor="#4f46e5" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.9}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ddd6fe" />
                    <XAxis dataKey="date" stroke="#7c3aed" style={{ fontSize: '13px', fontWeight: 700 }} />
                    <YAxis
                      stroke="#7c3aed"
                      label={{ value: '% of Revenue', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: '13px', fontWeight: 'bold', fill: '#7c3aed' } }}
                      style={{ fontSize: '13px', fontWeight: 700 }}
                    />
                    <Tooltip
                      formatter={(value: any) => [`${value}% of revenue`, 'Discount Burn']}
                      labelFormatter={(label: any) => `Date: ${label}`}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '3px solid #7c3aed',
                        borderRadius: '14px',
                        padding: '14px',
                        boxShadow: '0 20px 40px rgba(124, 58, 237, 0.3)',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    />
                    <Bar
                      dataKey="discount_pct"
                      fill="url(#discountPct)"
                      name="Discount Burn %"
                      radius={[16, 16, 0, 0]}
                      stroke="#7c3aed"
                      strokeWidth={2}
                      label={{ position: 'top', fill: '#1e1b4b', fontSize: 14, fontWeight: 'bold', formatter: (value: any) => `${value}%` }}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 p-4 rounded-lg bg-white/60 border border-violet-200/60">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">💡 Business Insight</p>
                  <p className="text-sm text-slate-700">Higher percentages mean more revenue is being spent on discounts. Monitor trends to ensure discount strategy remains profitable while driving customer acquisition.</p>
                </div>
              </div>
            )}

            {/* Weekly & Monthly Comparison Analytics */}
            {trends.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Comparison */}
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-teal-50/50 to-cyan-50/70 border border-emerald-200/60 shadow-xl shadow-emerald-300/20 backdrop-blur-sm overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">📊 Weekly Comparison</h3>
                      <p className="text-xs font-medium text-slate-700 mt-1">Last week vs This week performance</p>
                    </div>
                  </div>
                  {(() => {
                    const sorted = [...trends].sort((a, b) => {
                      const dateA = a.day_bucket ? new Date(a.day_bucket).getTime() : 0;
                      const dateB = b.day_bucket ? new Date(b.day_bucket).getTime() : 0;
                      return dateA - dateB;
                    });
                    const today = new Date();
                    const thisWeekStart = new Date(today);
                    thisWeekStart.setDate(today.getDate() - today.getDay());
                    const lastWeekStart = new Date(thisWeekStart);
                    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

                    const thisWeek = sorted.filter(t => {
                      const d = t.day_bucket ? new Date(t.day_bucket) : null;
                      return d && d >= thisWeekStart && d <= today;
                    });
                    const lastWeek = sorted.filter(t => {
                      const d = t.day_bucket ? new Date(t.day_bucket) : null;
                      return d && d >= lastWeekStart && d < thisWeekStart;
                    });

                    const thisWeekRevenue = thisWeek.reduce((sum, t) => sum + Number(t.revenue || 0), 0);
                    const lastWeekRevenue = lastWeek.reduce((sum, t) => sum + Number(t.revenue || 0), 0);
                    const thisWeekBurn = thisWeek.reduce((sum, t) => sum + Number(t.discount_burn || 0), 0);
                    const lastWeekBurn = lastWeek.reduce((sum, t) => sum + Number(t.discount_burn || 0), 0);

                    const thisWeekPct = thisWeekRevenue > 0 ? (thisWeekBurn / thisWeekRevenue * 100) : 0;
                    const lastWeekPct = lastWeekRevenue > 0 ? (lastWeekBurn / lastWeekRevenue * 100) : 0;
                    const weekChange = thisWeekPct - lastWeekPct;
                    const weekRevChange = ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue * 100);

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/70 rounded-xl border border-emerald-200">
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">This Week Burn %</p>
                            <p className="text-2xl font-black text-slate-900 mt-2">{Math.round(thisWeekPct)}%</p>
                            <p className="text-xs text-slate-600 mt-1">Discount burn rate</p>
                          </div>
                          <div className="p-4 bg-white/70 rounded-xl border border-emerald-200">
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Last Week Burn %</p>
                            <p className="text-2xl font-black text-slate-900 mt-2">{Math.round(lastWeekPct)}%</p>
                            <p className="text-xs text-slate-600 mt-1">Previous week rate</p>
                          </div>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-emerald-100/60 to-cyan-100/60 rounded-xl border border-emerald-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Week-over-Week Change</p>
                              <p className="text-sm text-slate-700 mt-1">Discount burn rate trend</p>
                            </div>
                            <div className={`text-right ${weekChange < 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              <p className="text-2xl font-black">{weekChange > 0 ? '+' : ''}{Math.round(weekChange * 10) / 10}%</p>
                              <p className="text-sm font-bold">{weekChange < 0 ? '↓ Improving' : '↑ Increasing'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Monthly Comparison */}
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-purple-50/70 border border-blue-200/60 shadow-xl shadow-blue-300/20 backdrop-blur-sm overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">📅 Monthly Comparison</h3>
                      <p className="text-xs font-medium text-slate-700 mt-1">This month vs Last month analysis</p>
                    </div>
                  </div>
                  {(() => {
                    const sorted = [...trends].sort((a, b) => {
                      const dateA = a.day_bucket ? new Date(a.day_bucket).getTime() : 0;
                      const dateB = b.day_bucket ? new Date(b.day_bucket).getTime() : 0;
                      return dateA - dateB;
                    });
                    const today = new Date();
                    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

                    const thisMonth = sorted.filter(t => {
                      const d = t.day_bucket ? new Date(t.day_bucket) : null;
                      return d && d >= thisMonthStart && d <= today;
                    });
                    const lastMonth = sorted.filter(t => {
                      const d = t.day_bucket ? new Date(t.day_bucket) : null;
                      return d && d >= lastMonthStart && d <= lastMonthEnd;
                    });

                    const thisMonthRevenue = thisMonth.reduce((sum, t) => sum + Number(t.revenue || 0), 0);
                    const lastMonthRevenue = lastMonth.reduce((sum, t) => sum + Number(t.revenue || 0), 0);
                    const thisMonthBurn = thisMonth.reduce((sum, t) => sum + Number(t.discount_burn || 0), 0);
                    const lastMonthBurn = lastMonth.reduce((sum, t) => sum + Number(t.discount_burn || 0), 0);
                    const thisMonthOrders = thisMonth.reduce((sum, t) => sum + Number(t.coupon_orders || 0), 0);
                    const lastMonthOrders = lastMonth.reduce((sum, t) => sum + Number(t.coupon_orders || 0), 0);

                    const thisMonthPct = thisMonthRevenue > 0 ? (thisMonthBurn / thisMonthRevenue * 100) : 0;
                    const lastMonthPct = lastMonthRevenue > 0 ? (lastMonthBurn / lastMonthRevenue * 100) : 0;
                    const monthChange = thisMonthPct - lastMonthPct;
                    const orderChange = ((thisMonthOrders - lastMonthOrders) / lastMonthOrders * 100);

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/70 rounded-xl border border-blue-200">
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">This Month Burn %</p>
                            <p className="text-2xl font-black text-slate-900 mt-2">{Math.round(thisMonthPct)}%</p>
                            <p className="text-xs text-slate-600 mt-1">Current month rate</p>
                          </div>
                          <div className="p-4 bg-white/70 rounded-xl border border-blue-200">
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Last Month Burn %</p>
                            <p className="text-2xl font-black text-slate-900 mt-2">{Math.round(lastMonthPct)}%</p>
                            <p className="text-xs text-slate-600 mt-1">Previous month rate</p>
                          </div>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-blue-100/60 to-purple-100/60 rounded-xl border border-blue-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Month-over-Month Change</p>
                              <p className="text-sm text-slate-700 mt-1">Discount burn rate trend</p>
                            </div>
                            <div className={`text-right ${monthChange < 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              <p className="text-2xl font-black">{monthChange > 0 ? '+' : ''}{Math.round(monthChange * 10) / 10}%</p>
                              <p className="text-sm font-bold">{monthChange < 0 ? '↓ Improving' : '↑ Increasing'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-200/60">
                          <p className="text-xs font-bold text-blue-700 mb-2">📦 Orders & Revenue:</p>
                          <p className="text-sm text-slate-700"><strong>{thisMonthOrders.toLocaleString('en-IN')}</strong> orders {orderChange > 0 ? '↑' : '↓'} <strong>{Math.abs(orderChange).toFixed(1)}%</strong> | Revenue: <strong>{fmt(thisMonthRevenue)}</strong></p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* 3. Top Performing Coupons */}
            {topCoupons.length > 0 && (
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-violet-50/70 via-indigo-50/50 to-cyan-50/70 border border-violet-200/60 shadow-xl shadow-violet-300/20 backdrop-blur-sm overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4 relative">
                  <div>
                    <h3 className="text-xl font-black bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">🏆 Top 10 Performing Coupons</h3>
                    <p className="text-xs font-medium text-slate-700 mt-1">Ranked by total discount burn</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black bg-gradient-to-r from-violet-600 to-cyan-600 bg-clip-text text-transparent">{topCoupons.length}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-violet-700">Coupons</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart layout="vertical" data={topCoupons.slice(0, 10).reverse()} margin={{ top: 5, right: 30, left: 200, bottom: 5 }}>
                    <defs>
                      <linearGradient id="topCoupons" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.95}/>
                        <stop offset="50%" stopColor="#a855f7" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.95}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                    <XAxis type="number" stroke="#7c3aed" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis dataKey="code" type="category" stroke="#7c3aed" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <Tooltip
                      formatter={(value: any) => fmt(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '2px solid #a855f7',
                        borderRadius: '14px',
                        boxShadow: '0 20px 40px rgba(168, 85, 247, 0.25)',
                      }}
                    />
                    <Bar
                      dataKey="total_discount_burn"
                      fill="url(#topCoupons)"
                      radius={[0, 10, 10, 0]}
                      stroke="#a855f7"
                      strokeWidth={1}
                      label={{ position: 'right', fill: '#7c3aed', fontSize: 12, fontWeight: 'bold', formatter: (value: any) => fmt(value) }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 4. Retailer-wise Applied Coupons Analytics */}
            {retailerAnalytics?.retailer_wise && retailerAnalytics.retailer_wise.length > 0 && (
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-green-50/50 to-emerald-50/70 border border-emerald-200/60 shadow-xl shadow-emerald-300/20 backdrop-blur-sm overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-green-400/20 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-6 relative">
                  <div>
                    <h3 className="text-xl font-black bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">🏪 Seller Performance - Applied Coupons</h3>
                    <p className="text-xs font-medium text-slate-700 mt-1">Showing top retailers by coupon adoption</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white/80 rounded-xl border border-emerald-200/60 backdrop-blur-sm">
                      <p className="text-xs font-bold text-emerald-700 uppercase mb-2">👥 Active Retailers</p>
                      <p className="text-2xl font-black text-slate-900">{retailerAnalytics.retailer_wise.length}</p>
                      <p className="text-xs text-slate-600 mt-1">Using coupons</p>
                    </div>
                    <div className="p-4 bg-white/80 rounded-xl border border-green-200/60 backdrop-blur-sm">
                      <p className="text-xs font-bold text-green-700 uppercase mb-2">💰 Total Discount</p>
                      <p className="text-2xl font-black text-slate-900">{fmt(retailerAnalytics.retailer_wise.reduce((sum: number, r: any) => sum + (Number(r.total_discount_applied) || 0), 0))}</p>
                      <p className="text-xs text-slate-600 mt-1">Applied</p>
                    </div>
                  </div>

                  {/* Chart */}
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={retailerAnalytics.retailer_wise.slice(0, 8)} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="retailerGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.95}/>
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.9}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                      <XAxis dataKey="retailer_name" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#10b981" style={{ fontSize: '12px', fontWeight: 600 }} />
                      <Tooltip
                        formatter={(value: any) => value}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: '2px solid #10b981',
                          borderRadius: '12px',
                        }}
                      />
                      <Bar dataKey="applied_coupons_count" fill="url(#retailerGradient)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Retailer Rankings Table */}
                <div className="overflow-x-auto rounded-lg border border-emerald-200/60 bg-white/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-emerald-100 to-green-100 border-b border-emerald-200/60 text-slate-900 text-xs uppercase tracking-wide font-bold">
                        <th className="px-4 py-3 text-left">Rank</th>
                        <th className="px-4 py-3 text-left">Seller Name</th>
                        <th className="px-4 py-3 text-center">Coupons Applied</th>
                        <th className="px-4 py-3 text-center">Orders Count</th>
                        <th className="px-4 py-3 text-right">Discount Value</th>
                        <th className="px-4 py-3 text-right">Order Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100">
                      {retailerAnalytics.retailer_wise.slice(0, 10).map((retailer: any, idx: number) => (
                        <tr key={idx} className="hover:bg-emerald-50/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-emerald-700">#{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{retailer.retailer_name}</td>
                          <td className="px-4 py-3 text-center"><span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold text-sm">{retailer.applied_coupons_count}</span></td>
                          <td className="px-4 py-3 text-center text-slate-700">{retailer.total_orders}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(retailer.total_discount_applied)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{fmt(retailer.total_order_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. Buyer Conversion & Adoption Analytics */}
            {retailerAnalytics?.buyer_metrics && (
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-blue-50/70 border border-blue-200/60 shadow-xl shadow-blue-300/20 backdrop-blur-sm overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-6 relative">
                  <div>
                    <h3 className="text-xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">📈 Buyer Conversion & Coupon Adoption</h3>
                    <p className="text-xs font-medium text-slate-700 mt-1">Business intelligence on customer behavior with coupons</p>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 relative">
                  <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl border border-blue-200/60 backdrop-blur-sm">
                    <p className="text-xs font-bold text-blue-700 uppercase mb-2">👥 Buyers Using Coupons</p>
                    <p className="text-2xl font-black text-slate-900">{retailerAnalytics.buyer_metrics.total_unique_buyers_with_applied_coupons || '—'}</p>
                    <p className="text-xs text-slate-600 mt-1">Placed orders</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl border border-indigo-200/60 backdrop-blur-sm">
                    <p className="text-xs font-bold text-indigo-700 uppercase mb-2">📦 Coupon Orders</p>
                    <p className="text-2xl font-black text-slate-900">{retailerAnalytics.buyer_metrics.total_orders_with_applied_coupons || '—'}</p>
                    <p className="text-xs text-slate-600 mt-1">With coupons applied</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-100 to-green-50 rounded-xl border border-green-200/60 backdrop-blur-sm">
                    <p className="text-xs font-bold text-green-700 uppercase mb-2">🎯 Buyer Conversion</p>
                    <p className="text-2xl font-black text-slate-900">
                      {retailerAnalytics.buyer_metrics.total_all_unique_buyers
                        ? `${(Number(retailerAnalytics.buyer_metrics.total_unique_buyers_with_applied_coupons || 0) * 100 / Number(retailerAnalytics.buyer_metrics.total_all_unique_buyers)).toFixed(1)}%`
                        : '—'}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Of total buyers</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl border border-purple-200/60 backdrop-blur-sm">
                    <p className="text-xs font-bold text-purple-700 uppercase mb-2">💳 Order Adoption</p>
                    <p className="text-2xl font-black text-slate-900">{retailerAnalytics.buyer_metrics.coupon_adoption_rate || '0'}%</p>
                    <p className="text-xs text-slate-600 mt-1">Of all orders</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl border border-orange-200/60 backdrop-blur-sm">
                    <p className="text-xs font-bold text-orange-700 uppercase mb-2">💰 Avg Discount</p>
                    <p className="text-2xl font-black text-slate-900">{fmt(retailerAnalytics.buyer_metrics.avg_discount_per_order || 0)}</p>
                    <p className="text-xs text-slate-600 mt-1">Per order</p>
                  </div>
                </div>

                {/* Top Buyers Table */}
                {retailerAnalytics.top_buyers && retailerAnalytics.top_buyers.length > 0 && (
                  <div className="relative">
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-blue-700 uppercase">🌟 Top Buyers - Coupon Champions</h4>
                      <p className="text-xs text-slate-600 mt-1">Buyers who are actively using and benefiting from coupons</p>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-blue-200/60 bg-white/50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b border-blue-200/60 text-slate-900 text-xs uppercase tracking-wide font-bold">
                            <th className="px-4 py-3 text-left">Rank</th>
                            <th className="px-4 py-3 text-left">Buyer Business</th>
                            <th className="px-4 py-3 text-center">Coupons Used</th>
                            <th className="px-4 py-3 text-center">Orders Count</th>
                            <th className="px-4 py-3 text-right">Order Value</th>
                            <th className="px-4 py-3 text-right">Coupon Value</th>
                            <th className="px-4 py-3 text-right">Coupon %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100">
                          {retailerAnalytics.top_buyers.slice(0, 8).map((buyer: any, idx: number) => (
                            <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                              <td className="px-4 py-3 font-bold text-blue-700">#{idx + 1}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900">{buyer.buyer_business_name}</td>
                              <td className="px-4 py-3 text-center"><span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold text-sm">{buyer.coupons_applied_count}</span></td>
                              <td className="px-4 py-3 text-center text-slate-700">{buyer.orders_count}</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(buyer.total_order_value)}</td>
                              <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(buyer.total_discount_saved)}</td>
                              <td className="px-4 py-3 text-right font-bold"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">{buyer.coupon_percentage}%</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. Coupon Status Distribution */}
            {metrics && (
              <div className="grid grid-cols-2 gap-6">
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-violet-50/70 via-indigo-50/50 to-violet-50/70 border border-violet-200/60 shadow-xl shadow-violet-300/20 backdrop-blur-sm overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-40 h-40 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />
                  <h3 className="text-xl font-black bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent mb-2 relative">📊 Coupon Status Distribution</h3>
                  <p className="text-xs font-medium text-slate-700 mb-4 relative">Reservation status breakdown</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Applied', value: Number(metrics.applied_count || 0), fill: '#8b5cf6' },
                          { name: 'Reserved', value: Number(metrics.reserved_count || 0), fill: '#a855f7' },
                          { name: 'Expired', value: Number(metrics.expired_count || 0), fill: '#06b6d4' },
                          { name: 'Cancelled', value: Number(metrics.cancelled_count || 0), fill: '#f59e0b' },
                          { name: 'Rejected', value: Number(metrics.rejected_count || 0), fill: '#6366f1' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={true}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        <Cell fill="#8b5cf6" />
                        <Cell fill="#a855f7" />
                        <Cell fill="#06b6d4" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#6366f1" />
                      </Pie>
                      <Tooltip formatter={(value: any) => [num(value), 'Count']} contentStyle={{ borderRadius: '14px', border: '2px solid #8b5cf6', boxShadow: '0 20px 40px rgba(236, 72, 153, 0.25)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

              </div>
            )}

            {/* 7. Applied Coupon Orders WOW Trend */}
            {orderCouponTrends && orderCouponTrends.length > 0 && (
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-rose-50/70 via-pink-50/50 to-rose-50/70 border border-rose-200/60 shadow-xl shadow-rose-300/20 backdrop-blur-sm overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-pink-400/20 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-6 relative">
                  <div>
                    <h3 className="text-xl font-black bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 bg-clip-text text-transparent">📈 Applied Coupon Orders - WOW Trend</h3>
                    <p className="text-xs font-medium text-slate-700 mt-1">Week-over-Week trend of applied coupon orders</p>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative">
                  <div className="p-4 bg-white/80 rounded-xl border border-rose-200/60 backdrop-blur-sm">
                    <p className="text-xs font-bold text-rose-700 uppercase mb-2">📦 Total Orders</p>
                    <p className="text-2xl font-black text-slate-900">
                      {orderCouponTrends.reduce((sum: number, t: any) => sum + Number(t.order_count || 0), 0)}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">With coupons</p>
                  </div>
                  <div className="p-4 bg-white/80 rounded-xl border border-pink-200/60 backdrop-blur-sm">
                    <p className="text-xs font-bold text-pink-700 uppercase mb-2">💰 Total Amount</p>
                    <p className="text-2xl font-black text-slate-900">
                      {fmt(orderCouponTrends.reduce((sum: number, t: any) => sum + Number(t.order_amount || 0), 0))}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Order value</p>
                  </div>
                  <div className="p-4 bg-white/80 rounded-xl border border-rose-200/60 backdrop-blur-sm">
                    <p className="text-xs font-bold text-rose-700 uppercase mb-2">🎁 Total Discount</p>
                    <p className="text-2xl font-black text-slate-900">
                      {fmt(orderCouponTrends.reduce((sum: number, t: any) => sum + Number(t.applied_coupon_amount || 0), 0))}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Applied</p>
                  </div>
                  <div className="p-4 bg-white/80 rounded-xl border border-pink-200/60 backdrop-blur-sm">
                    <p className="text-xs font-bold text-pink-700 uppercase mb-2">📊 Avg/Day</p>
                    <p className="text-2xl font-black text-slate-900">
                      {orderCouponTrends.length > 0
                        ? (orderCouponTrends.reduce((sum: number, t: any) => sum + Number(t.order_count || 0), 0) / orderCouponTrends.length).toFixed(1)
                        : '0'}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Orders per day</p>
                  </div>
                </div>

                {/* WOW Trend Chart */}
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart
                    data={orderCouponTrends.map((t: any) => ({
                      ...t,
                      date: t.day_bucket ? new Date(t.day_bucket).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : t.hour_bucket,
                      order_count: Number(t.order_count),
                      applied_coupon_amount: Number(t.applied_coupon_amount),
                      order_amount: Number(t.order_amount)
                    }))}
                    margin={{ top: 20, right: 80, left: 60, bottom: 60 }}
                  >
                    <defs>
                      <linearGradient id="orderTrendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="discountTrendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#ec4899" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
                    <XAxis
                      dataKey="date"
                      stroke="#be185d"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                      tick={{ fill: '#be185d' }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#f43f5e"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                      tick={{ fill: '#f43f5e' }}
                      label={{ value: 'Orders Count', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: '12px', fontWeight: 'bold', fill: '#f43f5e' } }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#ec4899"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                      tick={{ fill: '#ec4899' }}
                      label={{ value: 'Amount (₹)', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: '12px', fontWeight: 'bold', fill: '#ec4899' } }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '2px solid #f43f5e',
                        borderRadius: '12px',
                        padding: '16px',
                        boxShadow: '0 10px 25px rgba(244, 63, 94, 0.25)',
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === '💰 Order Amount') return [fmt(value), '💰 Order Amount'];
                        if (name === '🎁 Discount Applied') return [fmt(value), '🎁 Discount Applied'];
                        return [num(value), '📦 Order Count'];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      height={30}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="order_count"
                      stroke="#f43f5e"
                      strokeWidth={3}
                      dot={{ fill: '#f43f5e', r: 5 }}
                      activeDot={{ r: 7 }}
                      name="📦 Order Count"
                      isAnimationActive={true}
                      animationDuration={800}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="applied_coupon_amount"
                      stroke="#ec4899"
                      strokeWidth={3}
                      dot={{ fill: '#ec4899', r: 5 }}
                      activeDot={{ r: 7 }}
                      name="🎁 Discount Applied"
                      isAnimationActive={true}
                      animationDuration={800}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}


            {/* No Data Message */}
            {trends.length === 0 && topCoupons.length === 0 && (
              <div className="relative p-12 rounded-2xl text-center bg-gradient-to-br from-violet-50/70 via-indigo-50/50 to-cyan-50/70 border border-violet-200/60 shadow-xl shadow-violet-300/20 backdrop-blur-sm overflow-hidden">
                <h3 className="text-xl font-black bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-2">📊 No Analytics Data Available</h3>
                <p className="text-slate-700 font-medium">Select a date range to view comprehensive business analytics</p>
              </div>
            )}
          </div>
        ) : topTab === 'COUPON' && subTab === 2 ? (
          <div className="space-y-6">
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/10 blur-3xl -z-10" />
              <h2 className="text-4xl font-black bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">📋 Coupon Order Details</h2>
              <p className="text-sm font-medium text-slate-700 mt-2">All orders that used a coupon, across coupons, buyers and sellers</p>
              <div className="mt-3 h-[3px] w-32 rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />
            </div>

            <div className="relative rounded-2xl bg-gradient-to-br from-violet-50/80 via-indigo-50/60 to-cyan-50/80 border border-violet-200/60 shadow-lg shadow-violet-300/20 backdrop-blur-sm p-5 overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-violet-400/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[260px] max-w-md group">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500 group-focus-within:text-violet-700 transition-colors" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/></svg>
                  <input
                    type="text"
                    placeholder="Search PO #, coupon, buyer, seller, phone…"
                    value={orderDetailsSearch}
                    onChange={(e) => setOrderDetailsSearch(e.target.value)}
                    className="w-full rounded-xl border-2 border-violet-200 bg-white/90 backdrop-blur pl-10 pr-9 py-2.5 text-sm text-slate-900 placeholder-violet-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-200 transition-all shadow-sm hover:shadow-md hover:border-violet-300"
                  />
                  {orderDetailsSearch && (
                    <button
                      type="button"
                      onClick={() => setOrderDetailsSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-bold flex items-center justify-center transition-colors"
                      aria-label="Clear search"
                    >×</button>
                  )}
                </div>

                {/* Status */}
                <div className="relative">
                  <select
                    value={orderDetailsStatus}
                    onChange={(e) => setOrderDetailsStatus(e.target.value)}
                    className="appearance-none rounded-xl border-2 border-violet-200 bg-white/90 backdrop-blur pl-4 pr-9 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-200 cursor-pointer shadow-sm hover:shadow-md hover:border-violet-300 transition-all font-medium"
                  >
                    <option value="">All statuses</option>
                    <option value="APPLIED">✅ Applied</option>
                    <option value="RESERVED">⏳ Reserved</option>
                    <option value="EXPIRED">⌛ Expired</option>
                    <option value="CANCELLED">🚫 Cancelled</option>
                    <option value="REJECTED">❌ Rejected</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6"/></svg>
                </div>

                {/* Date range */}
                <div className="flex items-center gap-2 rounded-xl border-2 border-violet-200 bg-white/90 backdrop-blur px-3 py-2 shadow-sm hover:shadow-md hover:border-violet-300 transition-all focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-200">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[10px] font-black uppercase tracking-wider">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 10h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"/></svg>
                    Created
                  </div>
                  <input
                    type="date"
                    value={orderDetailsStartDate}
                    onChange={(e) => setOrderDetailsStartDate(e.target.value)}
                    className="text-sm font-medium text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                  />
                  <span className="text-violet-500 text-sm font-black">→</span>
                  <input
                    type="date"
                    value={orderDetailsEndDate}
                    onChange={(e) => setOrderDetailsEndDate(e.target.value)}
                    className="text-sm font-medium text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                  />
                  {(orderDetailsStartDate || orderDetailsEndDate) && (
                    <button
                      type="button"
                      onClick={() => { setOrderDetailsStartDate(''); setOrderDetailsEndDate(''); }}
                      className="ml-1 w-5 h-5 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-bold flex items-center justify-center transition-colors"
                      aria-label="Clear date filter"
                    >×</button>
                  )}
                </div>

                {/* Records pill + Download */}
                <div className="ml-auto flex items-center gap-2">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 text-white shadow-lg shadow-violet-400/30">
                    <span className="text-lg font-black tabular-nums">{orderDetails.length}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-90">record{orderDetails.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={orderDetails.length === 0 || orderDetailsLoading}
                      onClick={() => setDownloadMenuOpen(v => !v)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-emerald-400/30 hover:shadow-xl hover:shadow-emerald-400/50 hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                      title="Download data"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16"/>
                      </svg>
                      <span className="text-[11px] font-black uppercase tracking-wider">Download</span>
                      <svg className={`w-3 h-3 transition-transform ${downloadMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6"/></svg>
                    </button>
                    {downloadMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setDownloadMenuOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-violet-200 shadow-2xl shadow-violet-400/20 overflow-hidden z-50 backdrop-blur">
                          <button
                            type="button"
                            onClick={() => { downloadOrderDetailsCSV(orderDetails); setDownloadMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-colors text-left group"
                          >
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-400/40 group-hover:scale-110 transition-transform">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-6 4h6M7 21h10a2 2 0 0 0 2-2V7l-5-5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2Z"/></svg>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">CSV</p>
                              <p className="text-[11px] text-slate-600">Comma-separated values</p>
                            </div>
                          </button>
                          <div className="h-px bg-violet-100" />
                          <button
                            type="button"
                            onClick={() => { downloadOrderDetailsXLSX(orderDetails); setDownloadMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-violet-50 hover:to-cyan-50 transition-colors text-left group"
                          >
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center shadow-md shadow-violet-400/40 group-hover:scale-110 transition-transform">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M9 6v12M15 6v12M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">XLSX</p>
                              <p className="text-[11px] text-slate-600">Microsoft Excel workbook</p>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick presets */}
              <div className="relative mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-700 mr-1">Quick:</span>
                {[
                  { label: 'Today', days: 0 },
                  { label: 'Last 7 days', days: 7 },
                  { label: 'Last 15 days', days: 15 },
                  { label: 'Last 30 days', days: 30 },
                ].map(p => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - p.days);
                  const startStr = formatDateLocal(start);
                  const endStr = formatDateLocal(end);
                  const isActive = orderDetailsStartDate === startStr && orderDetailsEndDate === endStr;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => { setOrderDetailsStartDate(startStr); setOrderDetailsEndDate(endStr); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md shadow-violet-400/40 scale-105'
                          : 'bg-white/80 border border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-400 hover:shadow-md'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
                {(orderDetailsStartDate || orderDetailsEndDate || orderDetailsStatus || orderDetailsSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderDetailsStartDate('');
                      setOrderDetailsEndDate('');
                      setOrderDetailsStatus('');
                      setOrderDetailsSearch('');
                    }}
                    className="ml-auto px-3 py-1.5 rounded-full text-xs font-bold text-violet-700 hover:text-violet-900 bg-white/80 border border-violet-200 hover:bg-violet-50 hover:border-violet-400 transition-all flex items-center gap-1.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 6L18 18M6 18L18 6"/></svg>
                    Reset all
                  </button>
                )}
              </div>
            </div>

            <div className="relative rounded-2xl bg-gradient-to-br from-violet-50/70 via-indigo-50/50 to-cyan-50/70 border border-violet-200/60 shadow-xl shadow-violet-300/20 backdrop-blur-sm overflow-hidden">
              {orderDetailsLoading ? (
                <div className="py-20 text-center text-gray-700">Loading order details…</div>
              ) : orderDetailsError ? (
                <div className="py-20 text-center text-red-600">
                  <p className="font-medium">Could not load order details</p>
                  <p className="text-xs mt-1">{orderDetailsError}</p>
                </div>
              ) : orderDetails.length === 0 ? (
                <div className="py-20 text-center text-gray-700">No coupon orders found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-violet-100 to-indigo-100 border-b border-violet-300 text-slate-900 text-xs uppercase tracking-wide font-bold">
                        <th className="px-4 py-3 text-left">PO #</th>
                        <th className="px-4 py-3 text-right">Order Amount</th>
                        <th className="px-4 py-3 text-right">Applied Coupon Amt</th>
                        <th className="px-4 py-3 text-left">Coupon Status</th>
                        <th className="px-4 py-3 text-left">Order Status</th>
                        <th className="px-4 py-3 text-left">Coupon Name</th>
                        <th className="px-4 py-3 text-left">Buyer Phone</th>
                        <th className="px-4 py-3 text-left">Buyer Business</th>
                        <th className="px-4 py-3 text-left">Seller Phone</th>
                        <th className="px-4 py-3 text-left">Seller Business</th>
                        <th className="px-4 py-3 text-left">Order Created</th>
                        <th className="px-4 py-3 text-left">Coupon Applied</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-violet-200">
                      {orderDetails.map((r, i) => (
                        <tr
                          key={i}
                          onClick={() => setSelectedPoNumber(r.poNumber)}
                          className="cursor-pointer hover:bg-violet-100/80 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-violet-700 hover:underline">{r.poNumber}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(Number(r.orderAmount))}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(Number(r.appliedCouponAmount))}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={r.couponStatus} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={r.orderStatus} />
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-violet-800">{r.couponName ?? '—'}</td>
                          <td className="px-4 py-3 font-mono text-slate-900">{r.buyerPhone ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-900 font-medium">{r.buyerBusinessName ?? '—'}</td>
                          <td className="px-4 py-3 font-mono text-gray-800">{r.sellerPhone ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium">{r.sellerBusinessName ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{fmtDate(r.orderCreatedAt)}</td>
                          <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{fmtDate(r.couponAppliedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : topTab === 'VOUCHER' && subTab === 0 ? (
          <>
            {/* Voucher Details Section */}
            {vouchersLoading ? (
              <div className="py-16 text-center text-gray-700 text-sm">Loading vouchers…</div>
            ) : vouchersError ? (
              <div className="py-16 text-center text-red-500 text-sm">
                <p className="font-medium">Could not load vouchers</p>
                <p className="text-xs mt-1">{vouchersError}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl border border-purple-200">
                    <p className="text-xs font-bold text-purple-700 uppercase">Total Vouchers</p>
                    <p className="text-2xl font-black text-slate-900 mt-2">{activeVouchers.length + scheduledVouchers.length + inactiveVouchers.length}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-100 to-green-50 rounded-xl border border-green-200">
                    <p className="text-xs font-bold text-green-700 uppercase">Active</p>
                    <p className="text-2xl font-black text-slate-900 mt-2">{activeVouchers.length}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl border border-amber-200">
                    <p className="text-xs font-bold text-amber-700 uppercase">Scheduled</p>
                    <p className="text-2xl font-black text-slate-900 mt-2">{scheduledVouchers.length}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-red-100 to-red-50 rounded-xl border border-red-200">
                    <p className="text-xs font-bold text-red-700 uppercase">Inactive</p>
                    <p className="text-2xl font-black text-slate-900 mt-2">{inactiveVouchers.length}</p>
                  </div>
                </div>

                {/* All Vouchers Details Table */}
                <div className="rounded-lg border border-purple-300 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-100 to-purple-200 border-b border-purple-300 text-slate-900 text-xs uppercase tracking-wide font-bold">
                        <th className="px-4 py-3 text-left">CODE</th>
                        <th className="px-4 py-3 text-left">BUYER</th>
                        <th className="px-4 py-3 text-left">STATUS</th>
                        <th className="px-4 py-3 text-left">DISCOUNT</th>
                        <th className="px-4 py-3 text-left">USAGE</th>
                        <th className="px-4 py-3 text-left">USAGE %</th>
                        <th className="px-4 py-3 text-left">START DATE</th>
                        <th className="px-4 py-3 text-left">EXPIRY DATE</th>
                        <th className="px-4 py-3 text-left">DAYS LEFT</th>
                        <th className="px-4 py-3 text-left">CREATED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-200">
                      {[...activeVouchers, ...scheduledVouchers, ...inactiveVouchers].length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                            No vouchers found
                          </td>
                        </tr>
                      ) : (
                        [...activeVouchers, ...scheduledVouchers, ...inactiveVouchers].map((v) => {
                          const now = new Date();
                          const expiryDate = new Date(v.end_time);
                          const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          const usagePercentage = v.usage_limit ? ((v.usage_count / v.usage_limit) * 100).toFixed(1) : 'N/A';

                          let statusBadge = 'INACTIVE';
                          let statusColor = 'bg-red-100 text-red-700';
                          if (v.isActive && expiryDate > now) {
                            statusBadge = 'ACTIVE';
                            statusColor = 'bg-green-100 text-green-700';
                          } else if (new Date(v.start_time) > now) {
                            statusBadge = 'SCHEDULED';
                            statusColor = 'bg-amber-100 text-amber-700';
                          }

                          return (
                            <tr key={v.id} className="bg-purple-50/30 hover:bg-purple-100/60 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-purple-700">{v.code}</td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-semibold text-slate-900">{(v as any).buyer_business_name || '—'}</div>
                                <div className="text-xs text-slate-600">{(v as any).buyer_phone || '—'}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full ${statusColor}`}>
                                  {statusBadge}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-900">
                                {v.discount_type === 'PERCENTAGE' ? `${v.discount_value}%` : `₹${v.discount_value}`}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                <div className="font-semibold text-slate-900">{v.usage_count}/{v.usage_limit || '∞'}</div>
                              </td>
                              <td className="px-4 py-3">
                                {usagePercentage !== 'N/A' ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-purple-600 h-2 rounded-full transition-all"
                                        style={{ width: `${Math.min(Number(usagePercentage), 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-bold text-slate-700">{usagePercentage}%</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-600">N/A</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">{fmtDate(v.start_time)}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{fmtDate(v.end_time)}</td>
                              <td className="px-4 py-3 text-sm font-semibold">
                                {daysLeft > 0 ? (
                                  <span className="text-green-700">{daysLeft} days</span>
                                ) : (
                                  <span className="text-red-700">Expired</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-700">{fmtDate(v.created_at)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : topTab === 'VOUCHER' && subTab === 1 ? (
          <>
            {/* Voucher Filter Tabs */}
            <div className="mb-6 border-b border-purple-200 pb-4">
              <div className="flex gap-6">
                {[
                  { label: 'Active Vouchers', filter: 'active' },
                  { label: 'Scheduled Vouchers', filter: 'scheduled' },
                  { label: 'Inactive Vouchers', filter: 'inactive' },
                ].map((t, i) => (
                  <button
                    key={t.label}
                    onClick={() => setVoucherFilterTab(i)}
                    className={`pb-2 text-sm font-bold border-b-2 transition-all duration-300 khilna-tab
                      ${voucherFilterTab === i
                        ? 'border-purple-600 text-purple-950 drop-shadow-lg drop-shadow-purple-500/30'
                        : 'border-transparent text-slate-700 hover:text-purple-600 hover:border-b-purple-200/50'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vouchers Table */}
            {vouchersLoading ? (
              <div className="py-16 text-center text-gray-700 text-sm">Loading vouchers…</div>
            ) : vouchersError ? (
              <div className="py-16 text-center text-red-500 text-sm">
                <p className="font-medium">Could not load vouchers</p>
                <p className="text-xs mt-1">{vouchersError}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-purple-300">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-100 to-purple-200 border-b border-purple-300 text-slate-900 text-xs uppercase tracking-wide font-bold">
                      <th className="px-4 py-3 text-left">CODE</th>
                      <th className="px-4 py-3 text-left">NAME</th>
                      <th className="px-4 py-3 text-left">BUYER PHONE</th>
                      <th className="px-4 py-3 text-left">BUYER BUSINESS</th>
                      <th className="px-4 py-3 text-left">DESCRIPTION</th>
                      <th className="px-4 py-3 text-left">DISCOUNT</th>
                      <th className="px-4 py-3 text-left">VALID TILL</th>
                      <th className="px-4 py-3 text-left">USAGE</th>
                      <th className="px-4 py-3 text-left">CREATED</th>
                      <th className="px-4 py-3 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-200">
                    {(() => {
                      const displayVouchers =
                        voucherFilterTab === 0 ? activeVouchers :
                        voucherFilterTab === 1 ? scheduledVouchers :
                        inactiveVouchers;

                      const tabLabel =
                        voucherFilterTab === 0 ? 'active' :
                        voucherFilterTab === 1 ? 'scheduled' :
                        'inactive';

                      return displayVouchers.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                            No {tabLabel} vouchers found
                          </td>
                        </tr>
                      ) : (
                        displayVouchers.map((v) => (
                        <tr key={v.id} className="khilna-row bg-purple-50/30 hover:bg-purple-100/60 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-purple-700">{v.code}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{v.coupon_name}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedBuyerId((v as any).buyerId || null)}
                              className="text-sm font-mono font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                            >
                              {(v as any).buyer_phone || '—'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800 font-medium">{(v as any).buyer_business_name || '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-700 max-w-xs truncate" title={v.internal_description || ''}>
                            {v.internal_description || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold text-slate-900">
                              {v.discount_type === 'PERCENTAGE' ? `${v.discount_value}%` : `₹${v.discount_value}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{fmtDate(v.end_time)}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {v.usage_count}/{v.usage_limit || '∞'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700">{fmtDate(v.created_at)}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={async () => {
                                try {
                                  // If in active or scheduled tab (0 or 1), deactivate; if inactive (2), activate
                                  const shouldActivate = voucherFilterTab === 2;
                                  const res = await fetch('/api/vouchers/toggle-status', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ voucherId: v.id, isActive: shouldActivate }),
                                  });
                                  const json = await res.json();
                                  if (!res.ok || json.error) {
                                    alert('Error: ' + (json.error || 'Failed to update voucher'));
                                  } else {
                                    fetchVouchers();
                                  }
                                } catch (err) {
                                  alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
                                }
                              }}
                              className={`relative px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg overflow-hidden group ${
                                voucherFilterTab === 2
                                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                                  : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                              }`}
                            >
                              {/* Shimmer effect on hover */}
                              <div className={`absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300 ${
                                voucherFilterTab === 2 ? 'bg-green-200' : 'bg-red-200'
                              }`} />

                              {/* Content */}
                              <span className="relative z-10 flex items-center justify-center gap-1">
                                <span className="text-sm group-hover:scale-110 transition-transform duration-300 inline-block">
                                  {voucherFilterTab === 2 ? '🟢' : '🔴'}
                                </span>
                                <span className="hidden sm:inline font-bold">
                                  {voucherFilterTab === 2 ? 'Activate' : 'Deactivate'}
                                </span>
                              </span>
                            </button>
                          </td>
                        </tr>
                      ))
                    );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Voucher Details</h3>
            <p className="text-slate-700">Voucher details will appear here</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CouponDetailsModal
        couponCode={selectedCode ?? ''}
        isOpen={selectedCode !== null}
        onClose={() => setSelectedCode(null)}
        dateFilter={dateFilter}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
      />

      <CreateCouponModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchOffers();
        }}
      />

      <CreateVoucherModal
        isOpen={showCreateVoucherModal}
        onClose={() => setShowCreateVoucherModal(false)}
        onSuccess={() => {
          setShowCreateVoucherModal(false);
          fetchVouchers();
        }}
      />

      <BuyerDetailsModal
        buyerId={selectedBuyerId}
        isOpen={selectedBuyerId !== null}
        onClose={() => setSelectedBuyerId(null)}
      />

      <PurchaseOrderItemsModal
        poNumber={selectedPoNumber}
        isOpen={selectedPoNumber !== null}
        onClose={() => setSelectedPoNumber(null)}
      />

    </div>
  );
}
