'use client';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray';
}

export default function MetricCard({ label, value, sub, color = 'blue' }: MetricCardProps) {
  return (
    <div className="khilna-card rounded-lg p-6 flex flex-col gap-3 border border-purple-200 bg-white hover:border-purple-300 transition-all duration-300 group fade-in">
      <span className="text-xs font-medium uppercase tracking-widest text-gray-600 group-hover:text-slate-800 transition-colors">{label}</span>
      <span className="text-4xl font-light text-slate-900 tracking-tight">{value}</span>
      {sub && <span className="text-xs text-gray-600 mt-1">{sub}</span>}
    </div>
  );
}
