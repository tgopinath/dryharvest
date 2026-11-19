import Link from 'next/link';
import { Heart, ShoppingBag, User } from 'lucide-react';
import { getCurrentUser } from '@/server/auth';
import { getCartCount } from '@/server/cart';
import { getCategories } from '@/server/catalog';
import { getSetting } from '@/server/settings';
import { Logo } from './Logo';
import { SearchBox } from './SearchBox';
import { DesktopNav, MobileNav } from './HeaderNav';

export async function Header() {
  const [user, count, cats, store] = await Promise.all([getCurrentUser(), getCartCount(), getCategories(), getSetting('store')]);
  const categories = cats.map((c) => ({ slug: c.slug, name: c.name, tagline: c.tagline }));
  return (
    <>
      {store.announcement && <div className="bg-brand-deep px-4 py-2 text-center text-xs font-medium text-white">{store.announcement}</div>}
      <header className="sticky top-0 z-40 border-b border-brand-ink/8 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="container-x relative flex h-16 items-center gap-4 lg:h-[72px] lg:gap-8">
          <Logo />
          <DesktopNav categories={categories} />
          <SearchBox className="ml-auto hidden w-full max-w-xs md:block" />
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <MobileNav categories={categories} isStaff={!!user && user.role !== 'CUSTOMER'} loggedIn={!!user} />
            <Link href={user ? '/account' : '/login'} aria-label={user ? 'My account' : 'Log in'} className="hidden size-10 items-center justify-center rounded-full hover:bg-brand-ink/5 sm:flex"><User className="size-5" /></Link>
            <Link href="/account/wishlist" aria-label="Wishlist" className="hidden size-10 items-center justify-center rounded-full hover:bg-brand-ink/5 sm:flex"><Heart className="size-5" /></Link>
            <Link href="/cart" className="ml-1 flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-deep" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
              <ShoppingBag className="size-4" /><span className="hidden sm:inline">Cart</span><span className="min-w-5 rounded-full bg-white/20 px-1.5 text-center text-xs">{count}</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
