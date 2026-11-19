'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/account', label: 'Profile' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/reviews', label: 'My reviews' },
];
export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map((i) => {
        const on = i.href === '/account' ? path === i.href : path.startsWith(i.href);
        return <Link key={i.href} href={i.href} aria-current={on ? 'page' : undefined} className={cn('whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold', on ? 'bg-brand text-white' : 'hover:bg-white')}>{i.label}</Link>;
      })}
    </nav>
  );
}
