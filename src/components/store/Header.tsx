import { getCategories } from '@/server/catalog';
import { getSetting } from '@/server/settings';
import { Logo } from './Logo';
import { SearchBox } from './SearchBox';
import { DesktopNav, MobileNav } from './HeaderNav';

export async function Header() {
  const [cats, store] = await Promise.all([getCategories(), getSetting('store')]);
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
            <MobileNav categories={categories} isStaff={false} loggedIn={false} />
            <span className="hidden whitespace-nowrap rounded-full bg-brand-yellow px-3 py-1.5 text-xs font-bold text-brand-deep sm:inline">Demo store</span>
          </div>
        </div>
      </header>
    </>
  );
}
