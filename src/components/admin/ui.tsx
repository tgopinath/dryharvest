import Link from 'next/link';
import { cn } from '@/lib/utils';

export function AdminHeader({ title, text, actions }: { title: string; text?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-brand-deep">{title}</h1>{text && <p className="mt-1 text-sm text-brand-ink/60">{text}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-brand-ink/10 bg-white', className)}>
      {title && <div className="flex items-center justify-between gap-3 border-b border-brand-ink/8 px-5 py-3.5"><h2 className="font-sans text-sm font-bold tracking-normal">{title}</h2>{actions}</div>}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Table({ head, children, empty, compact }: { head: React.ReactNode[]; children: React.ReactNode; empty?: string | false; compact?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-ink/10 bg-white">
      <table className={cn('w-full text-sm', compact ? '' : 'min-w-[640px]')}>
        <thead><tr className="border-b border-brand-ink/10 bg-brand-ink/[.02] text-left text-xs font-semibold text-brand-ink/60">{head.map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-brand-ink/6">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-sm text-brand-ink/55">{empty}</p>}
    </div>
  );
}
export const Td = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn('px-4 py-3 align-middle', className)} {...p} />;

export function SearchBar({ placeholder, defaultValue, children }: { placeholder: string; defaultValue?: string; children?: React.ReactNode }) {
  return (
    <form className="mb-4 flex flex-wrap items-center gap-2" role="search">
      <label className="sr-only" htmlFor="admin-q">Search</label>
      <input id="admin-q" name="q" defaultValue={defaultValue} placeholder={placeholder} className="h-10 w-full max-w-xs rounded-xl border border-brand-ink/15 bg-white px-3 text-sm" />
      {children}
      <button className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white">Filter</button>
    </form>
  );
}

export function AdminPager({ page, pages, base, params }: { page: number; pages: number; base: string; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => { const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]); sp.set('page', String(p)); return `${base}?${sp}`; };
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-brand-ink/60">Page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link className="rounded-lg border border-brand-ink/15 bg-white px-3 py-1.5" href={href(page - 1)}>Previous</Link>}
        {page < pages && <Link className="rounded-lg border border-brand-ink/15 bg-white px-3 py-1.5" href={href(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'warn' }) {
  return (
    <div className="rounded-2xl border border-brand-ink/10 bg-white p-5">
      <p className="text-sm text-brand-ink/60">{label}</p>
      <p className={cn('mt-1 text-3xl font-bold tracking-tight', tone === 'warn' && 'text-[#9a6200]')}>{value}</p>
      {sub && <p className="mt-1 text-xs text-brand-ink/55">{sub}</p>}
    </div>
  );
}
