'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn, formatINR } from '@/lib/utils';

type Item = { slug: string; name: string; category: string; price: number | null; imageUrl: string | null };

export function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const router = useRouter();
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setItems([]); return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: ctl.signal });
        const j = await r.json();
        setItems(j.items); setOpen(true); setActive(-1);
      } catch { /* aborted */ }
    }, 180);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const go = (href: string) => { setOpen(false); router.push(href); };

  return (
    <div ref={box} className={cn('relative', className)}>
      <form role="search" onSubmit={(e) => { e.preventDefault(); if (active >= 0 && items[active]) go(`/product/${items[active].slug}`); else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`); }}>
        <label htmlFor={`${listId}-in`} className="sr-only">Search products</label>
        <input
          id={`${listId}-in`}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); setOpen(true); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
            else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Search mango, moringa, vathal…"
          className="h-10 w-full rounded-full border border-brand-ink/12 bg-white pl-4 pr-10 text-sm placeholder:text-brand-ink/45 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
        />
        <button type="submit" aria-label="Search" className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full text-brand-ink/60 hover:text-brand"><Search className="size-4" /></button>
      </form>
      {open && q.trim().length >= 2 && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-brand-ink/10 bg-white py-1 shadow-soft">
          {items.length === 0 && <li className="px-4 py-3 text-sm text-brand-ink/60">No matches for “{q}”. Press Enter to search everything.</li>}
          {items.map((it, i) => (
            <li key={it.slug} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(`/product/${it.slug}`)} className={cn('flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm', i === active && 'bg-brand-pale')}>
                <span><span className="block font-semibold">{it.name}</span><span className="text-xs text-brand-ink/55">{it.category}</span></span>
                {it.price != null && <span className="text-xs font-semibold text-brand-ink/70">from {formatINR(it.price)}</span>}
              </button>
            </li>
          ))}
          {items.length > 0 && (
            <li><button type="button" onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)} className="w-full border-t border-brand-ink/5 px-4 py-2 text-left text-xs font-semibold text-brand">See all results for “{q}”</button></li>
          )}
        </ul>
      )}
    </div>
  );
}
