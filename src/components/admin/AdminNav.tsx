'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, Package, FolderTree, ShoppingCart, Undo2, Boxes, Users, Truck, TicketPercent, MessageSquareText, LayoutTemplate, BarChart3, ShieldCheck, Settings, History, Inbox, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = { LayoutDashboard, Package, FolderTree, ShoppingCart, Undo2, Boxes, Users, Truck, TicketPercent, MessageSquareText, LayoutTemplate, BarChart3, ShieldCheck, Settings, History, Inbox };
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

export function AdminNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const list = (
    <ul className="space-y-0.5">
      {items.map((i) => {
        const Icon = ICONS[i.icon];
        const on = i.href === '/admin' ? path === '/admin' : path.startsWith(i.href);
        return (
          <li key={i.href}>
            <Link href={i.href} onClick={() => setOpen(false)} aria-current={on ? 'page' : undefined} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium', on ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white')}>
              <Icon className="size-4" />{i.label}
              {!!i.badge && <span className="ml-auto rounded-full bg-brand-yellow px-1.5 text-[11px] font-bold text-brand-ink">{i.badge}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
  return (
    <>
      <button className="fixed left-3 top-3 z-50 flex size-10 items-center justify-center rounded-full bg-brand-deep text-white lg:hidden" aria-label="Open admin menu" onClick={() => setOpen(true)}><Menu className="size-5" /></button>
      <nav aria-label="Admin" className="hidden lg:block">{list}</nav>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-brand-deep p-4">
            <button className="mb-4 ml-auto flex size-9 items-center justify-center text-white" aria-label="Close menu" onClick={() => setOpen(false)}><X className="size-5" /></button>
            {list}
          </div>
        </div>
      )}
    </>
  );
}
