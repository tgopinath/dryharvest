'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchBox } from './SearchBox';

type Cat = { slug: string; name: string; tagline: string | null };
const links = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
];

export function DesktopNav({ categories }: { categories: Cat[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const item = (href: string, label: string) => (
    <Link href={href} aria-current={path === href ? 'page' : undefined} className={cn('relative py-2 text-sm font-medium hover:text-brand', path === href && 'text-brand after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-brand')}>{label}</Link>
  );
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-7">
        {links.map((l) => <li key={l.href}>{item(l.href, l.label)}</li>)}
        <li ref={ref} className="relative" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
          <button aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)} className={cn('flex items-center gap-1 py-2 text-sm font-medium hover:text-brand', path.startsWith('/categor') && 'text-brand')}>
            Categories <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <div className="absolute left-1/2 top-10 z-50 w-[560px] -translate-x-1/2 rounded-2xl border border-brand-ink/10 bg-white p-3 shadow-soft">
              <ul className="grid grid-cols-2 gap-1">
                {categories.map((c) => (
                  <li key={c.slug}><Link href={`/category/${c.slug}`} className="block rounded-xl px-3 py-2 hover:bg-brand-pale"><span className="block text-sm font-semibold">{c.name}</span><span className="text-xs text-brand-ink/55">{c.tagline}</span></Link></li>
                ))}
              </ul>
              <Link href="/categories" className="mt-2 block rounded-xl bg-brand-cream px-3 py-2 text-center text-sm font-semibold text-brand">View all categories</Link>
            </div>
          )}
        </li>
        <li>{item('/about', 'About')}</li>
        <li>{item('/contact', 'Contact')}</li>
      </ul>
    </nav>
  );
}

export function MobileNav({ categories, isStaff, loggedIn }: { categories: Cat[]; isStaff: boolean; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const path = usePathname();
  useEffect(() => { setOpen(false); setSearch(false); }, [path]);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);
  return (
    <>
      <button aria-label="Search" onClick={() => setSearch((s) => !s)} className="flex size-10 items-center justify-center rounded-full hover:bg-brand-ink/5 md:hidden"><Search className="size-5" /></button>
      <button aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} className="flex size-10 items-center justify-center rounded-full hover:bg-brand-ink/5 lg:hidden"><Menu className="size-5" /></button>
      {search && <div className="absolute inset-x-0 top-full border-b border-brand-ink/10 bg-white p-3 md:hidden"><SearchBox autoFocus /></div>}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-brand-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col overflow-y-auto bg-white p-5">
            <div className="mb-4 flex items-center justify-between"><span className="font-display text-xl">Menu</span><button aria-label="Close menu" onClick={() => setOpen(false)} className="flex size-10 items-center justify-center rounded-full hover:bg-brand-ink/5"><X className="size-5" /></button></div>
            <nav aria-label="Mobile" className="space-y-1">
              {[...links, { href: '/categories', label: 'All categories' }, { href: '/about', label: 'About' }, { href: '/contact', label: 'Contact' }].map((l) => (
                <Link key={l.href} href={l.href} className="block rounded-xl px-3 py-2.5 font-semibold hover:bg-white">{l.label}</Link>
              ))}
              <p className="px-3 pb-1 pt-4 text-xs font-semibold text-brand-ink/50">Categories</p>
              {categories.map((c) => <Link key={c.slug} href={`/category/${c.slug}`} className="block rounded-xl px-3 py-2 text-sm hover:bg-white">{c.name}</Link>)}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
