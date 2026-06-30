'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Layers,
  MapPin,
  Moon,
  Phone,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sun,
  User,
  Users,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

/* ------------------------------------------------------------------ types */

interface KycRow {
  verificationId: string;
  created_at: string;
  buyerId: string;
  businessName: string | null;
  phone: string | null;
  name: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  district: string | null;
  pincode: string | null;
  assignedEmployee: string | null;
  employeePhone: string | null;
  imageUrl1: string | null;
  imageUrl2: string | null;
  videoUrl: string | null;
  status: string | null;
  message: string | null;
  label: string | null;
}

interface Kpis {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  resubmit: number;
}

type Bucket = 'approved' | 'rejected' | 'pending' | 'resubmit';

/* ------------------------------------------------------------- status map */

function bucketOf(status: string | null): Bucket {
  const s = (status || '').trim().toUpperCase();
  if (s === 'VERIFIED') return 'approved';
  if (s === 'FAILED' || s === 'REJECTED') return 'rejected';
  if (s === 'RESUBMIT') return 'resubmit';
  return 'pending';
}

const BUCKET_META: Record<Bucket, { label: string; dot: string; text: string; bg: string; ring: string }> = {
  approved: { label: 'Approved', dot: '#10b981', text: '#047857', bg: 'rgba(16,185,129,0.12)', ring: 'rgba(16,185,129,0.35)' },
  rejected: { label: 'Rejected', dot: '#ef4444', text: '#b91c1c', bg: 'rgba(239,68,68,0.12)', ring: 'rgba(239,68,68,0.35)' },
  pending: { label: 'Pending', dot: '#f59e0b', text: '#b45309', bg: 'rgba(245,158,11,0.12)', ring: 'rgba(245,158,11,0.35)' },
  resubmit: { label: 'Resubmit', dot: '#3b82f6', text: '#1d4ed8', bg: 'rgba(59,130,246,0.12)', ring: 'rgba(59,130,246,0.35)' },
};

/* ----------------------------------------------------------------- themes */

const LIGHT: Record<string, string> = {
  '--bg': '#f6f7fb',
  '--bg2': '#eceef5',
  '--surface': 'rgba(255,255,255,0.72)',
  '--surface-2': 'rgba(255,255,255,0.55)',
  '--surface-solid': '#ffffff',
  '--border': 'rgba(15,23,42,0.08)',
  '--border-strong': 'rgba(15,23,42,0.14)',
  '--text': '#0f172a',
  '--muted': '#64748b',
  '--faint': '#94a3b8',
  '--accent': '#6366f1',
  '--accent2': '#8b5cf6',
  '--shadow': '0 10px 30px -12px rgba(15,23,42,0.18)',
  '--row-hover': 'rgba(99,102,241,0.06)',
};

const DARK: Record<string, string> = {
  '--bg': '#0a0b10',
  '--bg2': '#10121a',
  '--surface': 'rgba(22,24,33,0.72)',
  '--surface-2': 'rgba(30,33,45,0.5)',
  '--surface-solid': '#15171f',
  '--border': 'rgba(255,255,255,0.08)',
  '--border-strong': 'rgba(255,255,255,0.16)',
  '--text': '#f1f5f9',
  '--muted': '#94a3b8',
  '--faint': '#64748b',
  '--accent': '#818cf8',
  '--accent2': '#a78bfa',
  '--shadow': '0 20px 50px -20px rgba(0,0,0,0.7)',
  '--row-hover': 'rgba(129,140,248,0.10)',
};

/* --------------------------------------------------------------- count-up */

function useCountUp(value: number, duration = 700) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

/* --------------------------------------------------------------- toasts */

type Toast = { id: number; kind: 'success' | 'error' | 'info'; title: string; desc?: string };

/* ===================================================================== */
/*  PAGE                                                                   */
/* ===================================================================== */

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom' },
] as const;

const STATUS_OPTIONS: { id: string; label: string }[] = [
  { id: '', label: 'All Statuses' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'resubmit', label: 'Resubmit' },
];

const REJECT_REASONS = ['Invalid Document', 'Blurred Image', 'Fake Business', 'Wrong Address', 'Duplicate Account', 'Other'];
const RESUBMIT_REASONS = ['Image Not Clear', 'Missing Details', 'Video Not Proper', 'Address Verification Failed', 'Re-upload Required', 'Other'];

export default function KycVerificationPage() {
  const router = useRouter();
  // Login gate — matches the rest of the dashboard: no token → /login.
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('authToken')) {
      router.replace('/login');
    } else {
      setAuthed(true);
    }
  }, [router]);

  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('kyc-theme');
    if (saved) setDark(saved === 'dark');
    else setDark(window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  }, []);
  const toggleTheme = () => {
    setDark((d) => {
      localStorage.setItem('kyc-theme', !d ? 'dark' : 'light');
      return !d;
    });
  };
  const theme = dark ? DARK : LIGHT;

  // data
  const [rows, setRows] = useState<KycRow[]>([]);
  const [kpis, setKpis] = useState<Kpis>({ total: 0, approved: 0, rejected: 0, pending: 0, resubmit: 0 });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [range, setRange] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [employee, setEmployee] = useState('');
  const [label, setLabel] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // pagination + sort
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // modals / drawer / viewers
  const [drawerRow, setDrawerRow] = useState<KycRow | null>(null);
  const [viewer, setViewer] = useState<{ images: string[]; index: number } | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject' | 'resubmit'; row: KycRow } | null>(null);

  // toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const pushToast = useCallback((kind: Toast['kind'], title: string, desc?: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, title, desc }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  /* ---- fetch ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      p.set('range', range);
      if (range === 'custom') {
        if (customFrom) p.set('from', customFrom);
        if (customTo) p.set('to', customTo);
      }
      if (phone) p.set('phone', phone);
      if (name) p.set('name', name);
      if (employee) p.set('employee', employee);
      if (label) p.set('label', label);
      if (statusFilter) p.set('status', statusFilter);
      if (search) p.set('search', search);
      p.set('page', String(page));
      p.set('pageSize', String(pageSize));
      p.set('sortBy', sortBy);
      p.set('sortDir', sortDir);

      const res = await fetch(`/api/kyc-verification?${p.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      setRows(json.rows);
      setKpis(json.kpis);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [range, customFrom, customTo, phone, name, employee, label, statusFilter, search, page, pageSize, sortBy, sortDir]);

  // debounce text filters; immediate for structural ones
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!authed) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchData, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchData, authed]);

  // reset to page 1 when a filter changes
  useEffect(() => {
    setPage(1);
  }, [range, customFrom, customTo, phone, name, employee, label, statusFilter, search, pageSize]);

  const clearFilters = () => {
    setRange('30d');
    setCustomFrom('');
    setCustomTo('');
    setPhone('');
    setName('');
    setEmployee('');
    setLabel('');
    setStatusFilter('');
    setSearch('');
  };

  const activeFilterCount =
    (range !== '30d' ? 1 : 0) +
    [phone, name, employee, label, statusFilter, search].filter(Boolean).length;

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  /* ---- selection ---- */
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.verificationId));
  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) rows.forEach((r) => next.delete(r.verificationId));
      else rows.forEach((r) => next.add(r.verificationId));
      return next;
    });
  };
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* ---- export ---- */
  const exportRows = useMemo(() => (selected.size ? rows.filter((r) => selected.has(r.verificationId)) : rows), [rows, selected]);
  const exportFlat = () =>
    exportRows.map((r) => ({
      'Created At': r.created_at,
      'Buyer ID': r.buyerId,
      'Business Name': r.businessName,
      'Buyer Name': r.name,
      Phone: r.phone,
      Address: r.addressLine1,
      City: r.city,
      State: r.state,
      District: r.district,
      Pincode: r.pincode,
      'Assigned Employee': r.assignedEmployee,
      'Employee Phone': r.employeePhone,
      'Verification Type': r.label,
      Status: BUCKET_META[bucketOf(r.status)].label,
      'Raw Status': r.status,
      Message: r.message,
      'Image 1': r.imageUrl1,
      'Image 2': r.imageUrl2,
      Video: r.videoUrl,
    }));

  const exportCSV = () => {
    const flat = exportFlat();
    if (!flat.length) return;
    const headers = Object.keys(flat[0]);
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.join(','), ...flat.map((r) => headers.map((h) => esc((r as Record<string, unknown>)[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `kyc-verifications-${Date.now()}.csv`);
    pushToast('success', 'CSV exported', `${flat.length} rows downloaded`);
  };
  const exportExcel = () => {
    const flat = exportFlat();
    if (!flat.length) return;
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KYC');
    XLSX.writeFile(wb, `kyc-verifications-${Date.now()}.xlsx`);
    pushToast('success', 'Excel exported', `${flat.length} rows downloaded`);
  };

  /* ---- actions ---- */
  const submitAction = async (
    type: 'approve' | 'reject' | 'resubmit',
    row: KycRow,
    reasonCategory?: string,
    remarks?: string,
  ) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const res = await fetch('/api/kyc-verification/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ verificationId: row.verificationId, action: type, reasonCategory, remarks }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Action failed');
    // optimistic local update
    setRows((prev) => prev.map((r) => (r.verificationId === row.verificationId ? { ...r, status: json.status } : r)));
    const labels = { approve: 'KYC Approved Successfully', reject: 'KYC Rejected Successfully', resubmit: 'Resubmission Requested Successfully' };
    pushToast('success', labels[type], row.businessName || row.name || '');
    // refresh KPIs in background
    fetchData();
  };

  if (!authed) return null;

  return (
    <div
      style={theme as React.CSSProperties}
      className="relative min-h-screen w-full"
    >
      {/* ambient background */}
      <div className="fixed inset-0 -z-10" style={{ background: `radial-gradient(1200px 600px at 12% -10%, ${dark ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.10)'}, transparent 60%), radial-gradient(1000px 500px at 100% 0%, ${dark ? 'rgba(139,92,246,0.14)' : 'rgba(139,92,246,0.08)'}, transparent 55%), linear-gradient(180deg, var(--bg), var(--bg2))` }} />

      <div className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8" style={{ color: 'var(--text)' }}>
        <Header dark={dark} toggleTheme={toggleTheme} onRefresh={fetchData} loading={loading} />

        <KpiRow kpis={kpis} loading={loading} active={statusFilter} onPick={(b) => setStatusFilter((s) => (s === b ? '' : b))} />

        <FilterBar
          range={range} setRange={setRange}
          customFrom={customFrom} setCustomFrom={setCustomFrom}
          customTo={customTo} setCustomTo={setCustomTo}
          phone={phone} setPhone={setPhone}
          name={name} setName={setName}
          employee={employee} setEmployee={setEmployee}
          labelVal={label} setLabelVal={setLabel}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          search={search} setSearch={setSearch}
          activeFilterCount={activeFilterCount}
          onClear={clearFilters}
        />

        <TableCard
          rows={rows}
          loading={loading}
          error={error}
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          setPage={setPage}
          setPageSize={setPageSize}
          sortBy={sortBy}
          sortDir={sortDir}
          toggleSort={toggleSort}
          selected={selected}
          allOnPageSelected={allOnPageSelected}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          onRowOpen={setDrawerRow}
          onImage={(imgs: string[], i: number) => setViewer({ images: imgs, index: i })}
          onVideo={setVideoUrl}
          onAction={(type: 'approve' | 'reject' | 'resubmit', row: KycRow) => setActionModal({ type, row })}
          onExportCSV={exportCSV}
          onExportExcel={exportExcel}
          onRefresh={fetchData}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </div>

      {/* overlays */}
      <AnimatePresence>
        {drawerRow && <DetailDrawer row={drawerRow} onClose={() => setDrawerRow(null)} onImage={(imgs, i) => setViewer({ images: imgs, index: i })} onVideo={setVideoUrl} />}
      </AnimatePresence>
      <AnimatePresence>
        {viewer && <ImageViewer images={viewer.images} index={viewer.index} onIndex={(i) => setViewer({ images: viewer.images, index: i })} onClose={() => setViewer(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {videoUrl && <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {actionModal && (
          <ActionModal
            type={actionModal.type}
            row={actionModal.row}
            onClose={() => setActionModal(null)}
            onSubmit={async (cat, remarks) => {
              await submitAction(actionModal.type, actionModal.row, cat, remarks);
              setActionModal(null);
            }}
          />
        )}
      </AnimatePresence>

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

/* ===================================================================== */
/*  HEADER                                                                 */
/* ===================================================================== */

function Header({ dark, toggleTheme, onRefresh, loading }: { dark: boolean; toggleTheme: () => void; onRefresh: () => void; loading: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', boxShadow: '0 12px 30px -10px var(--accent)' }}>
          <ShieldCheck className="h-6 w-6 text-white" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">KYC Verification</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Review, approve and manage buyer business verifications</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Btn onClick={onRefresh} variant="ghost"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</Btn>
        <button onClick={toggleTheme} aria-label="Toggle theme" className="flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:scale-105" style={{ background: 'var(--surface)', border: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={dark ? 'moon' : 'sun'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              {dark ? <Moon className="h-4.5 w-4.5" style={{ color: 'var(--accent2)' }} /> : <Sun className="h-4.5 w-4.5" style={{ color: 'var(--accent)' }} />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
}

/* ===================================================================== */
/*  KPI CARDS                                                              */
/* ===================================================================== */

function KpiRow({ kpis, loading, active, onPick }: { kpis: Kpis; loading: boolean; active: string; onPick: (b: string) => void }) {
  const cards: { id: string; pick?: Bucket; label: string; value: number; icon: React.ReactNode; from: string; to: string }[] = [
    { id: 'total', label: 'Total Applications', value: kpis.total, icon: <Layers className="h-5 w-5" />, from: '#6366f1', to: '#8b5cf6' },
    { id: 'approved', pick: 'approved', label: 'Approved', value: kpis.approved, icon: <CheckCircle2 className="h-5 w-5" />, from: '#10b981', to: '#059669' },
    { id: 'rejected', pick: 'rejected', label: 'Rejected', value: kpis.rejected, icon: <XCircle className="h-5 w-5" />, from: '#ef4444', to: '#dc2626' },
    { id: 'pending', pick: 'pending', label: 'Pending', value: kpis.pending, icon: <Clock className="h-5 w-5" />, from: '#f59e0b', to: '#d97706' },
    { id: 'resubmit', pick: 'resubmit', label: 'Resubmit Required', value: kpis.resubmit, icon: <RotateCcw className="h-5 w-5" />, from: '#3b82f6', to: '#2563eb' },
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c, i) => (
        <KpiCard key={c.id} label={c.label} value={c.value} icon={c.icon} from={c.from} to={c.to} loading={loading} delay={i * 0.05} active={!!c.pick && active === c.pick} clickable={!!c.pick} onClick={() => c.pick && onPick(c.pick)} />
      ))}
    </div>
  );
}

function KpiCard({ label, value, icon, from, to, loading, delay, active, clickable, onClick }: { label: string; value: number; icon: React.ReactNode; from: string; to: string; loading: boolean; delay: number; active: boolean; clickable: boolean; onClick: () => void }) {
  const display = useCountUp(value);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={clickable ? { y: -4 } : {}}
      className={`group relative overflow-hidden rounded-2xl p-4 text-left transition-shadow ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ background: 'var(--surface)', border: `1px solid ${active ? to : 'var(--border)'}`, backdropFilter: 'blur(14px)', boxShadow: active ? `0 0 0 1px ${to}, 0 16px 40px -16px ${to}` : 'var(--shadow)' }}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} />
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>{icon}</div>
        <ChevronRight className={`h-4 w-4 transition-all ${clickable ? 'opacity-0 group-hover:translate-x-0.5 group-hover:opacity-60' : 'opacity-0'}`} style={{ color: 'var(--muted)' }} />
      </div>
      <div className="mt-3 text-[28px] font-bold leading-none tracking-tight">
        {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded-md" style={{ background: 'var(--border-strong)' }} /> : display.toLocaleString('en-IN')}
      </div>
      <div className="mt-1.5 text-[13px] font-medium" style={{ color: 'var(--muted)' }}>{label}</div>
    </motion.button>
  );
}

/* ===================================================================== */
/*  FILTER BAR                                                             */
/* ===================================================================== */

function FilterBar(props: {
  range: string; setRange: (v: string) => void;
  customFrom: string; setCustomFrom: (v: string) => void;
  customTo: string; setCustomTo: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  name: string; setName: (v: string) => void;
  employee: string; setEmployee: (v: string) => void;
  labelVal: string; setLabelVal: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  activeFilterCount: number; onClear: () => void;
}) {
  const { range, setRange, customFrom, setCustomFrom, customTo, setCustomTo, phone, setPhone, name, setName, employee, setEmployee, labelVal, setLabelVal, statusFilter, setStatusFilter, search, setSearch, activeFilterCount, onClear } = props;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mb-5 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', backdropFilter: 'blur(14px)', boxShadow: 'var(--shadow)' }}>
      <div className="flex flex-wrap items-center gap-2">
        {/* date presets */}
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          {DATE_PRESETS.map((p) => {
            const on = range === p.id;
            return (
              <button key={p.id} onClick={() => setRange(p.id)} className="relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors" style={{ color: on ? '#fff' : 'var(--muted)' }}>
                {on && <motion.div layoutId="datepill" className="absolute inset-0 rounded-lg" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                <span className="relative z-10">{p.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {range === 'custom' && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="flex items-center gap-2 overflow-hidden">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg px-2.5 py-2 text-[13px] outline-none" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <span style={{ color: 'var(--faint)' }}>→</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg px-2.5 py-2 text-[13px] outline-none" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="ml-auto flex items-center gap-2">
          <StatusSelect value={statusFilter} onChange={setStatusFilter} />
          <AnimatePresence>
            {activeFilterCount > 0 && (
              <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} whileHover={{ scale: 1.03 }} onClick={onClear} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium" style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                <X className="h-3.5 w-3.5" /> Clear ({activeFilterCount})
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <FloatingInput icon={<Phone className="h-4 w-4" />} label="Buyer Phone" value={phone} onChange={setPhone} />
        <FloatingInput icon={<User className="h-4 w-4" />} label="Buyer / Business Name" value={name} onChange={setName} />
        <FloatingInput icon={<Users className="h-4 w-4" />} label="Assigned Employee" value={employee} onChange={setEmployee} />
        <FloatingInput icon={<ShieldCheck className="h-4 w-4" />} label="Verification Type" value={labelVal} onChange={setLabelVal} />
      </div>
      <div className="mt-2.5">
        <FloatingInput icon={<Search className="h-4 w-4" />} label="Global search — business, name, phone, location, employee, type…" value={search} onChange={setSearch} wide />
      </div>
    </motion.div>
  );
}

function FloatingInput({ icon, label, value, onChange, wide }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; wide?: boolean }) {
  const [focus, setFocus] = useState(false);
  const active = focus || value.length > 0;
  return (
    <div className={`relative ${wide ? 'w-full' : ''}`}>
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: active ? 'var(--accent)' : 'var(--faint)' }}>{icon}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={label}
        className="peer w-full rounded-xl py-2.5 pl-9 pr-8 text-[13px] outline-none transition-all"
        style={{ background: 'var(--surface-solid)', border: `1px solid ${focus ? 'var(--accent)' : 'var(--border)'}`, color: 'var(--text)', boxShadow: focus ? `0 0 0 3px ${'var(--accent)'}22` : 'none' }}
      />
      <AnimatePresence>
        {value && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--faint)' }}>
            <X className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const current = STATUS_OPTIONS.find((o) => o.id === value) || STATUS_OPTIONS[0];
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all hover:scale-[1.02]" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)', color: 'var(--text)' }}>
        {value && <span className="h-2 w-2 rounded-full" style={{ background: BUCKET_META[value as Bucket]?.dot }} />}
        {current.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--muted)' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }} className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl p-1 shadow-xl" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}>
            {STATUS_OPTIONS.map((o) => (
              <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--row-hover)]" style={{ color: 'var(--text)' }}>
                {o.id ? <span className="h-2 w-2 rounded-full" style={{ background: BUCKET_META[o.id as Bucket]?.dot }} /> : <span className="h-2 w-2 rounded-full" style={{ background: 'var(--faint)' }} />}
                {o.label}
                {value === o.id && <Check className="ml-auto h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ===================================================================== */
/*  TABLE                                                                  */
/* ===================================================================== */

const COLUMNS: { key: string; label: string; sortable?: boolean; w?: number }[] = [
  { key: 'created_at', label: 'Created At', sortable: true, w: 170 },
  { key: 'businessName', label: 'Business', sortable: true, w: 220 },
  { key: 'phone', label: 'Phone', sortable: true, w: 130 },
  { key: 'location', label: 'Location', w: 200 },
  { key: 'employee', label: 'Assigned Employee', sortable: true, w: 180 },
  { key: 'label', label: 'Verification Type', sortable: true, w: 190 },
  { key: 'status', label: 'Status', sortable: true, w: 130 },
  { key: 'message', label: 'Message', w: 200 },
  { key: 'media', label: 'Media', w: 130 },
  { key: 'actions', label: 'Actions', w: 150 },
];

function TableCard(props: any) {
  const {
    rows, loading, error, total, page, pageSize, totalPages, setPage, setPageSize,
    sortBy, sortDir, toggleSort, selected, allOnPageSelected, toggleSelect, toggleSelectAll,
    onRowOpen, onImage, onVideo, onAction, onExportCSV, onExportExcel, onRefresh, pageSizeOptions,
  } = props as {
    rows: KycRow[]; loading: boolean; error: string | null; total: number; page: number; pageSize: number; totalPages: number;
    setPage: (n: number) => void; setPageSize: (n: number) => void; sortBy: string; sortDir: 'asc' | 'desc'; toggleSort: (k: string) => void;
    selected: Set<string>; allOnPageSelected: boolean; toggleSelect: (id: string) => void; toggleSelectAll: () => void;
    onRowOpen: (r: KycRow) => void; onImage: (imgs: string[], i: number) => void; onVideo: (u: string) => void;
    onAction: (t: 'approve' | 'reject' | 'resubmit', r: KycRow) => void; onExportCSV: () => void; onExportExcel: () => void; onRefresh: () => void; pageSizeOptions: number[];
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="overflow-hidden rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', backdropFilter: 'blur(14px)', boxShadow: 'var(--shadow)' }}>
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>{total.toLocaleString('en-IN')}</span> applications
          {selected.size > 0 && (
            <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--accent)', color: '#fff' }}>
              {selected.size} selected
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Btn onClick={onExportCSV} variant="ghost"><Download className="h-4 w-4" /> CSV</Btn>
          <Btn onClick={onExportExcel} variant="ghost"><FileSpreadsheet className="h-4 w-4" /> Excel</Btn>
        </div>
      </div>

      {/* table */}
      <div className="relative max-h-[64vh] overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr style={{ background: 'var(--surface-solid)' }}>
              <th className="sticky left-0 z-20 px-3 py-3" style={{ background: 'var(--surface-solid)', borderBottom: '1px solid var(--border-strong)' }}>
                <Checkbox checked={allOnPageSelected} onChange={toggleSelectAll} />
              </th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-3 py-3 text-left font-semibold" style={{ minWidth: c.w, color: 'var(--muted)', borderBottom: '1px solid var(--border-strong)' }}>
                  {c.sortable ? (
                    <button onClick={() => toggleSort(c.key)} className="group inline-flex items-center gap-1 transition-colors hover:text-[var(--accent)]">
                      {c.label}
                      {sortBy === c.key ? <ChevronDown className={`h-3.5 w-3.5 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} style={{ color: 'var(--accent)' }} /> : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
            ) : error ? (
              <tr><td colSpan={COLUMNS.length + 1} className="py-16 text-center" style={{ color: '#ef4444' }}><AlertCircle className="mx-auto mb-2 h-8 w-8" />{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={COLUMNS.length + 1}><EmptyState onRefresh={onRefresh} /></td></tr>
            ) : (
              rows.map((r, i) => (
                <Row key={r.verificationId} row={r} index={i} selected={selected.has(r.verificationId)} onSelect={() => toggleSelect(r.verificationId)} onOpen={() => onRowOpen(r)} onImage={onImage} onVideo={onVideo} onAction={onAction} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--muted)' }}>
          Rows per page
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-lg px-2 py-1 outline-none" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5 text-[13px]">
          <span style={{ color: 'var(--muted)' }}>Page <span style={{ color: 'var(--text)' }} className="font-semibold">{page}</span> of {totalPages}</span>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:scale-105 disabled:opacity-30" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}><ChevronLeft className="h-4 w-4" /></button>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:scale-105 disabled:opacity-30" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </motion.div>
  );
}

function Row({ row, index, selected, onSelect, onOpen, onImage, onVideo, onAction }: { row: KycRow; index: number; selected: boolean; onSelect: () => void; onOpen: () => void; onImage: (imgs: string[], i: number) => void; onVideo: (u: string) => void; onAction: (t: 'approve' | 'reject' | 'resubmit', r: KycRow) => void }) {
  const [hover, setHover] = useState(false);
  const images = [row.imageUrl1, row.imageUrl2].filter(Boolean) as string[];
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpen}
      className="cursor-pointer"
      style={{ background: hover ? 'var(--row-hover)' : 'transparent', boxShadow: hover ? 'inset 3px 0 0 0 var(--accent)' : 'none', transition: 'background 0.15s, box-shadow 0.15s' }}
    >
      <td className="sticky left-0 z-[1] px-3 py-2.5" style={{ background: hover ? 'var(--surface-solid)' : 'var(--surface-solid)', borderBottom: '1px solid var(--border)' }} onClick={stop}>
        <Checkbox checked={selected} onChange={onSelect} />
      </td>
      <Cell><span className="whitespace-nowrap font-medium" style={{ color: 'var(--muted)' }}>{row.created_at}</span></Cell>
      <Cell>
        <div className="font-semibold" style={{ color: 'var(--text)' }}>{row.businessName || '—'}</div>
        <div className="text-xs" style={{ color: 'var(--faint)' }}>{row.name || '—'}</div>
      </Cell>
      <Cell><span style={{ color: 'var(--text)' }}>{row.phone || '—'}</span></Cell>
      <Cell>
        <div style={{ color: 'var(--text)' }}>{row.city || '—'}{row.state ? `, ${row.state}` : ''}</div>
        <div className="text-xs" style={{ color: 'var(--faint)' }}>{[row.district, row.pincode].filter(Boolean).join(' · ') || '—'}</div>
      </Cell>
      <Cell>
        <div style={{ color: 'var(--text)' }}>{row.assignedEmployee || '—'}</div>
        <div className="text-xs" style={{ color: 'var(--faint)' }}>{row.employeePhone || '—'}</div>
      </Cell>
      <Cell><span className="inline-block max-w-[180px] truncate rounded-md px-2 py-1 text-xs" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }} title={row.label || ''}>{row.label || '—'}</span></Cell>
      <Cell><StatusBadge status={row.status} /></Cell>
      <Cell><span className="line-clamp-2 max-w-[200px] text-xs" style={{ color: 'var(--muted)' }} title={row.message || ''}>{row.message || '—'}</span></Cell>
      <Cell onClick={stop}>
        <div className="flex items-center gap-1.5">
          {images.length > 0 ? images.map((img, i) => (
            <button key={i} onClick={() => onImage(images, i)} className="h-9 w-9 overflow-hidden rounded-lg ring-1 transition-transform hover:scale-110" style={{ borderColor: 'var(--border)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          )) : <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--faint)' }}><ImageIcon className="h-4 w-4" /></span>}
          {row.videoUrl && (
            <button onClick={() => onVideo(row.videoUrl!)} className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-transform hover:scale-110" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}><Play className="h-4 w-4 fill-current" /></button>
          )}
        </div>
      </Cell>
      <Cell onClick={stop}>
        <div className="flex items-center gap-1">
          <IconAction title="Approve" color="#10b981" onClick={() => onAction('approve', row)}><Check className="h-4 w-4" /></IconAction>
          <IconAction title="Reject" color="#ef4444" onClick={() => onAction('reject', row)}><X className="h-4 w-4" /></IconAction>
          <IconAction title="Resubmit" color="#3b82f6" onClick={() => onAction('resubmit', row)}><RotateCcw className="h-4 w-4" /></IconAction>
        </div>
      </Cell>
    </motion.tr>
  );
}

function Cell({ children, onClick }: { children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) {
  return <td className="px-3 py-2.5 align-top" style={{ borderBottom: '1px solid var(--border)' }} onClick={onClick}>{children}</td>;
}

function IconAction({ title, color, onClick, children }: { title: string; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }} title={title} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}1a`, color, border: `1px solid ${color}33` }}>
      {children}
    </motion.button>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const b = bucketOf(status);
  const m = BUCKET_META[b];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: m.bg, color: m.text, boxShadow: `0 0 0 1px ${m.ring}` }}>
      <span className="relative flex h-2 w-2">
        {b === 'pending' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: m.dot }} />}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: m.dot }} />
      </span>
      {m.label}
    </span>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="flex h-4.5 w-4.5 items-center justify-center rounded-[5px] transition-all" style={{ width: 18, height: 18, background: checked ? 'var(--accent)' : 'var(--surface-solid)', border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}` }}>
      {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
    </button>
  );
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}><div className="h-4 w-4 animate-pulse rounded" style={{ background: 'var(--border-strong)' }} /></td>
      {COLUMNS.map((c) => (
        <td key={c.key} className="px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="h-4 animate-pulse rounded" style={{ width: `${40 + ((c.label.length * 7) % 50)}%`, background: 'var(--border-strong)' }} />
        </td>
      ))}
    </tr>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative mb-5">
        <div className="absolute inset-0 animate-pulse rounded-full opacity-30 blur-2xl" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }} />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <ShieldCheck className="h-9 w-9" style={{ color: 'var(--accent)' }} />
        </div>
      </motion.div>
      <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>KYC Applications Not Found</h3>
      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Try adjusting your filters or date range.</p>
      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onRefresh} className="mt-5 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', boxShadow: '0 12px 30px -10px var(--accent)' }}>
        <RefreshCw className="h-4 w-4" /> Refresh
      </motion.button>
    </div>
  );
}

/* ===================================================================== */
/*  DETAIL DRAWER                                                          */
/* ===================================================================== */

function DetailDrawer({ row, onClose, onImage, onVideo }: { row: KycRow; onClose: () => void; onImage: (imgs: string[], i: number) => void; onVideo: (u: string) => void }) {
  useEsc(onClose);
  const images = [row.imageUrl1, row.imageUrl2].filter(Boolean) as string[];
  const b = bucketOf(row.status);
  const m = BUCKET_META[b];
  const timeline = [
    { icon: <FileSpreadsheet className="h-3.5 w-3.5" />, title: 'Application submitted', time: row.created_at, color: 'var(--accent)' },
    { icon: <Users className="h-3.5 w-3.5" />, title: `Assigned to ${row.assignedEmployee || 'employee'}`, time: '', color: '#8b5cf6' },
    { icon: <Activity className="h-3.5 w-3.5" />, title: `Current status: ${m.label}`, time: row.message || '', color: m.dot },
  ];
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col" style={{ background: 'var(--surface-solid)', borderLeft: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}><Building2 className="h-5 w-5 text-white" /></div>
            <div>
              <div className="font-bold" style={{ color: 'var(--text)' }}>{row.businessName || '—'}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>{row.buyerId.slice(0, 8)}…</div>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--row-hover)]"><X className="h-4.5 w-4.5" style={{ color: 'var(--muted)' }} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="flex items-center justify-between rounded-xl p-3" style={{ background: m.bg, boxShadow: `0 0 0 1px ${m.ring}` }}>
            <span className="text-sm font-medium" style={{ color: m.text }}>Verification Status</span>
            <StatusBadge status={row.status} />
          </div>

          <Section title="Business Details" icon={<Building2 className="h-4 w-4" />}>
            <Field label="Business Name" value={row.businessName} />
            <Field label="Verification Type" value={row.label} />
            <Field label="Address" value={[row.addressLine1, row.city, row.district, row.state, row.pincode].filter(Boolean).join(', ')} />
          </Section>

          <Section title="Buyer Information" icon={<User className="h-4 w-4" />}>
            <Field label="Buyer Name" value={row.name} />
            <Field label="Phone" value={row.phone} />
            <Field label="Buyer ID" value={row.buyerId} mono />
          </Section>

          <Section title="Employee Information" icon={<Users className="h-4 w-4" />}>
            <Field label="Assigned Employee" value={row.assignedEmployee} />
            <Field label="Employee Phone" value={row.employeePhone} />
          </Section>

          {(images.length > 0 || row.videoUrl) && (
            <Section title="Documents & Media" icon={<ImageIcon className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <button key={i} onClick={() => onImage(images, i)} className="h-20 w-20 overflow-hidden rounded-xl ring-1 transition-transform hover:scale-105" style={{ borderColor: 'var(--border)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
                {row.videoUrl && (
                  <button onClick={() => onVideo(row.videoUrl!)} className="flex h-20 w-20 items-center justify-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}><Play className="h-7 w-7 fill-current" /></button>
                )}
              </div>
            </Section>
          )}

          {row.message && (
            <Section title="Remarks" icon={<AlertCircle className="h-4 w-4" />}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{row.message}</p>
            </Section>
          )}

          <Section title="Activity Timeline" icon={<Activity className="h-4 w-4" />}>
            <div className="relative space-y-4 pl-2">
              {timeline.map((t, i) => (
                <div key={i} className="relative flex gap-3">
                  {i < timeline.length - 1 && <span className="absolute left-[11px] top-6 h-full w-px" style={{ background: 'var(--border)' }} />}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: t.color }}>{t.icon}</span>
                  <div className="pb-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t.title}</div>
                    {t.time && <div className="text-xs" style={{ color: 'var(--faint)' }}>{t.time}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </motion.div>
    </>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--faint)' }}>{icon}{title}</div>
      <div className="space-y-2 rounded-xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>{children}</div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs" style={{ color: 'var(--faint)' }}>{label}</span>
      <span className={`text-right text-[13px] font-medium ${mono ? 'font-mono text-xs' : ''}`} style={{ color: 'var(--text)' }}>{value || '—'}</span>
    </div>
  );
}

/* ===================================================================== */
/*  IMAGE VIEWER                                                           */
/* ===================================================================== */

function ImageViewer({ images, index, onIndex, onClose }: { images: string[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  useEsc(onClose);
  useEffect(() => setZoom(1), [index]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && index < images.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [index, images.length, onIndex]);
  const src = images[index];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="absolute right-5 top-5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <ViewerBtn onClick={() => setZoom((z) => Math.min(4, z + 0.5))}><ZoomIn className="h-5 w-5" /></ViewerBtn>
        <ViewerBtn onClick={() => setZoom((z) => Math.max(1, z - 0.5))}><ZoomOut className="h-5 w-5" /></ViewerBtn>
        <ViewerBtn onClick={() => downloadUrl(src, `kyc-image-${index + 1}.jpg`)}><ArrowDownToLine className="h-5 w-5" /></ViewerBtn>
        <ViewerBtn onClick={onClose}><X className="h-5 w-5" /></ViewerBtn>
      </div>
      {index > 0 && <ViewerNav side="left" onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }} />}
      {index < images.length - 1 && <ViewerNav side="right" onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }} />}
      <motion.img key={src} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }} src={src} alt="" onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl" style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s', cursor: zoom > 1 ? 'grab' : 'default' }} />
      {images.length > 1 && <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-sm text-white" style={{ background: 'rgba(255,255,255,0.12)' }}>{index + 1} / {images.length}</div>}
    </motion.div>
  );
}

function ViewerBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-all hover:scale-110" style={{ background: 'rgba(255,255,255,0.12)' }}>{children}</button>;
}
function ViewerNav({ side, onClick }: { side: 'left' | 'right'; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} className={`absolute top-1/2 -translate-y-1/2 ${side === 'left' ? 'left-5' : 'right-5'} flex h-12 w-12 items-center justify-center rounded-full text-white transition-all hover:scale-110`} style={{ background: 'rgba(255,255,255,0.12)' }}>
      {side === 'left' ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
    </button>
  );
}

/* ===================================================================== */
/*  VIDEO MODAL                                                            */
/* ===================================================================== */

function VideoModal({ url, onClose }: { url: string; onClose: () => void }) {
  useEsc(onClose);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <button onClick={onClose} className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl text-white transition-all hover:scale-110" style={{ background: 'rgba(255,255,255,0.12)' }}><X className="h-5 w-5" /></button>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="overflow-hidden rounded-2xl shadow-2xl">
        <video src={url} controls autoPlay className="max-h-[85vh] max-w-[85vw] bg-black" />
      </motion.div>
    </motion.div>
  );
}

/* ===================================================================== */
/*  ACTION MODAL                                                           */
/* ===================================================================== */

function ActionModal({ type, row, onClose, onSubmit }: { type: 'approve' | 'reject' | 'resubmit'; row: KycRow; onClose: () => void; onSubmit: (cat: string | undefined, remarks: string) => Promise<void> }) {
  useEsc(onClose);
  const [category, setCategory] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const config = {
    approve: { title: 'Approve KYC', color: '#10b981', icon: <CheckCircle2 className="h-6 w-6" />, reasons: null as string[] | null, cta: 'Approve' },
    reject: { title: 'Reject KYC', color: '#ef4444', icon: <XCircle className="h-6 w-6" />, reasons: REJECT_REASONS, cta: 'Reject Application' },
    resubmit: { title: 'Request Resubmission', color: '#3b82f6', icon: <RotateCcw className="h-6 w-6" />, reasons: RESUBMIT_REASONS, cta: 'Request Resubmit' },
  }[type];

  const handle = async () => {
    setErr('');
    if (config.reasons && !category) { setErr('Please select a reason category'); return; }
    setSubmitting(true);
    try {
      await onSubmit(config.reasons ? category : undefined, remarks);
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed');
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
      <motion.div initial={{ scale: 0.92, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-2xl" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)', boxShadow: '0 30px 70px -20px rgba(0,0,0,0.5)' }}>
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center px-6 py-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="flex h-16 w-16 items-center justify-center rounded-full text-white" style={{ background: config.color }}>
                <Check className="h-8 w-8" strokeWidth={3} />
              </motion.div>
              <h3 className="mt-4 text-lg font-bold" style={{ color: 'var(--text)' }}>{config.title} Done</h3>
              <button onClick={onClose} className="mt-5 rounded-xl px-5 py-2 text-sm font-semibold text-white" style={{ background: config.color }}>Close</button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-3 px-6 pt-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: config.color }}>{config.icon}</div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{config.title}</h3>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{row.businessName || row.name}</p>
                </div>
              </div>

              <div className="space-y-3 px-6 py-5">
                {type === 'approve' ? (
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Are you sure you want to approve this KYC application? This will mark the buyer as verified.</p>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--faint)' }}>Reason Category <span style={{ color: config.color }}>*</span></label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {config.reasons!.map((r) => (
                        <button key={r} onClick={() => setCategory(r)} className="rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-all" style={{ background: category === r ? `${config.color}1a` : 'var(--surface-2)', color: category === r ? config.color : 'var(--text)', border: `1px solid ${category === r ? config.color : 'var(--border)'}` }}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--faint)' }}>Remarks {type === 'approve' ? '(optional)' : ''}</label>
                  <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="Add a note…" className="w-full resize-none rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all focus:ring-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
                {err && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-xs" style={{ color: '#ef4444' }}><AlertCircle className="h-3.5 w-3.5" />{err}</motion.div>}
              </div>

              <div className="flex justify-end gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--border)' }}>
                <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>Cancel</button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} disabled={submitting} onClick={handle} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: config.color }}>
                  {submitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {config.cta}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ===================================================================== */
/*  TOASTS                                                                 */
/* ===================================================================== */

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  const tone = { success: '#10b981', error: '#ef4444', info: '#6366f1' };
  const icon = { success: <CheckCircle2 className="h-5 w-5" />, error: <XCircle className="h-5 w-5" />, info: <AlertCircle className="h-5 w-5" /> };
  return (
    <div className="fixed right-5 top-5 z-[80] flex w-[340px] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, x: 60, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60, scale: 0.9 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} className="flex items-start gap-3 overflow-hidden rounded-xl p-3.5 shadow-xl" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: tone[t.kind] }}>{icon[t.kind]}</div>
            <div className="flex-1 pt-0.5">
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t.title}</div>
              {t.desc && <div className="text-xs" style={{ color: 'var(--muted)' }}>{t.desc}</div>}
            </div>
            <button onClick={() => onDismiss(t.id)} style={{ color: 'var(--faint)' }}><X className="h-4 w-4" /></button>
            <motion.div initial={{ width: '100%' }} animate={{ width: 0 }} transition={{ duration: 4.2, ease: 'linear' }} className="absolute bottom-0 left-0 h-0.5" style={{ background: tone[t.kind] }} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ===================================================================== */
/*  SHARED                                                                 */
/* ===================================================================== */

function Btn({ children, onClick, variant = 'ghost' }: { children: React.ReactNode; onClick: () => void; variant?: 'ghost' | 'solid' }) {
  return (
    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClick} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors" style={variant === 'solid' ? { background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff' } : { background: 'var(--surface-solid)', border: '1px solid var(--border)', color: 'var(--text)' }}>
      {children}
    </motion.button>
  );
}

function useEsc(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function downloadUrl(url: string, filename: string) {
  fetch(url)
    .then((r) => r.blob())
    .then((b) => downloadBlob(b, filename))
    .catch(() => window.open(url, '_blank'));
}
