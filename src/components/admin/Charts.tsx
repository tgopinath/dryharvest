'use client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

const INK = '#17271C';
const GRID = 'rgba(23,39,28,.08)';
const inr = (p: number) => `₹${Math.round(p / 100).toLocaleString('en-IN')}`;
const short = (p: number) => { const r = p / 100; return r >= 1e5 ? `₹${(r / 1e5).toFixed(1)}L` : r >= 1e3 ? `₹${(r / 1e3).toFixed(0)}k` : `₹${r}`; };

function Tip({ active, payload, label, extra }: { active?: boolean; payload?: { value: number; payload: Record<string, number | string> }[]; label?: string; extra?: (p: Record<string, number | string>) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-brand-ink/10 bg-white px-3 py-2 text-xs shadow-soft">
      <p className="font-semibold">{label}</p>
      <p className="text-brand-ink/80">Revenue {inr(payload[0].value)}</p>
      {extra && <p className="text-brand-ink/60">{extra(payload[0].payload)}</p>}
    </div>
  );
}

export function SalesTrend({ data }: { data: { day: string; revenue: number; orders: number }[] }) {
  return (
    <div className="h-64" role="img" aria-label="Daily revenue over the last 30 days">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: INK, opacity: 0.55 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tickFormatter={short} tick={{ fontSize: 11, fill: INK, opacity: 0.55 }} tickLine={false} axisLine={false} width={52} />
          <Tooltip content={<Tip extra={(p) => `${p.orders} order${p.orders === 1 ? '' : 's'}`} />} cursor={{ stroke: INK, strokeOpacity: 0.2 }} />
          <Line type="monotone" dataKey="revenue" stroke="#176B36" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryBars({ data }: { data: { name: string; revenue: number }[] }) {
  return (
    <div style={{ height: Math.max(160, data.length * 34) }} role="img" aria-label="Revenue by category">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tickFormatter={short} tick={{ fontSize: 11, fill: INK, opacity: 0.55 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: INK }} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip />} cursor={{ fill: 'rgba(23,39,28,.04)' }} />
          <Bar dataKey="revenue" fill="#176B36" radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
