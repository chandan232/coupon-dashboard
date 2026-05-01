'use client';

const STATUS_STYLES: Record<string, string> = {
  APPLIED:       'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
  ACTIVE:        'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
  LIVE:          'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
  COMPLETED:     'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
  RESERVED:      'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
  PENDING:       'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
  SCHEDULED:     'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-300',
  'IN PROGRESS': 'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-300',
  IN_PROGRESS:   'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-300',
  TRANSIT:       'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300',
  PARTIAL:       'bg-orange-100 text-orange-800 ring-1 ring-orange-300',
  EXPIRED:       'bg-red-100 text-red-800 ring-1 ring-red-300',
  CANCELLED:     'bg-orange-100 text-orange-800 ring-1 ring-orange-300',
  REJECTED:      'bg-red-100 text-red-800 ring-1 ring-red-300',
  DRAFT:         'bg-gray-200 text-gray-800 ring-1 ring-gray-300',
  INACTIVE:      'bg-gray-200 text-gray-800 ring-1 ring-gray-300',
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status?.toUpperCase()] ?? 'bg-purple-100 text-slate-900 khilna-button';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold transition-all duration-300 ${cls}`}>
      {status}
    </span>
  );
}
