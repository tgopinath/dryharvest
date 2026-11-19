'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';

type Props = { sizes: string[]; categories?: { slug: string; name: string }[]; sorts: Record<string, string>; total: number; mode: 'sidebar' | 'toolbar' };

export function Filters({ sizes, categories, sorts, total, mode }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const selectedSizes = sp.getAll('size');

  const update = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete('page');
    router.push(`${path}?${p.toString()}`, { scroll: false });
  };
  const activeCount = selectedSizes.length + (sp.get('min') ? 1 : 0) + (sp.get('max') ? 1 : 0) + (sp.get('stock') ? 1 : 0) + (sp.get('category') ? 1 : 0) + (sp.get('kind') ? 1 : 0);

  const panel = (
    <form
      className="space-y-7"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        update((p) => {
          for (const k of ['min', 'max']) { const v = String(fd.get(k) ?? ''); if (v) p.set(k, v); else p.delete(k); }
        });
        setOpen(false);
      }}
    >
      {categories && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold">Category</legend>
          <ul className="space-y-1.5 text-sm">
            <li><label className="flex items-center gap-2"><input type="radio" name="category" className="accent-brand" checked={!sp.get('category')} onChange={() => update((p) => p.delete('category'))} /> All</label></li>
            {categories.map((c) => (
              <li key={c.slug}><label className="flex items-center gap-2"><input type="radio" name="category" className="accent-brand" checked={sp.get('category') === c.slug} onChange={() => update((p) => p.set('category', c.slug))} /> {c.name}</label></li>
            ))}
          </ul>
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-3 text-sm font-bold">Price (₹)</legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="f-min">Minimum price</label>
          <input id="f-min" name="min" type="number" min={0} inputMode="numeric" defaultValue={sp.get('min') ?? ''} placeholder="Min" className="h-9 w-full rounded-lg border border-brand-ink/15 px-2 text-sm" />
          <span aria-hidden>–</span>
          <label className="sr-only" htmlFor="f-max">Maximum price</label>
          <input id="f-max" name="max" type="number" min={0} inputMode="numeric" defaultValue={sp.get('max') ?? ''} placeholder="Max" className="h-9 w-full rounded-lg border border-brand-ink/15 px-2 text-sm" />
        </div>
        <Button size="sm" variant="secondary" className="mt-2 w-full">Apply price</Button>
      </fieldset>
      {sizes.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold">Pack size</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const on = selectedSizes.includes(s);
              return (
                <label key={s} className={cn('cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand', on ? 'border-brand bg-brand-pale text-brand-deep' : 'border-brand-ink/15 bg-white')}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => update((p) => { const all = p.getAll('size'); p.delete('size'); (on ? all.filter((x) => x !== s) : [...all, s]).forEach((x) => p.append('size', x)); })} />
                  {s}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-3 text-sm font-bold">Availability</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand" checked={!!sp.get('stock')} onChange={(e) => update((p) => (e.target.checked ? p.set('stock', '1') : p.delete('stock')))} /> In stock only</label>
      </fieldset>
      {activeCount > 0 && <button type="button" onClick={() => router.push(path)} className="text-sm font-semibold text-brand underline">Clear all filters</button>}
    </form>
  );

  if (mode === 'sidebar') return <aside className="hidden lg:block" aria-label="Filters">{panel}</aside>;
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-ink/60" aria-live="polite">{total} product{total === 1 ? '' : 's'}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setOpen(true)}><SlidersHorizontal className="size-4" /> Filters{activeCount ? ` (${activeCount})` : ''}</Button>
          <label htmlFor="sort" className="sr-only">Sort by</label>
          <select id="sort" value={sp.get('sort') ?? 'featured'} onChange={(e) => update((p) => p.set('sort', e.target.value))} className="h-8 rounded-full border border-brand-ink/15 bg-white px-3 text-sm font-medium">
            {Object.entries(sorts).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-brand-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between"><p className="font-display text-xl">Filters</p><button aria-label="Close filters" onClick={() => setOpen(false)}><X className="size-5" /></button></div>
            {panel}
          </div>
        </div>
      )}
    </>
  );
}
