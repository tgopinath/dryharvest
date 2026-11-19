import Link from 'next/link';
import { getCategories } from '@/server/catalog';
import { getSetting } from '@/server/settings';
import { LeafMark } from './Logo';

export async function Footer() {
  const [cats, store] = await Promise.all([getCategories(), getSetting('store')]);
  return (
    <footer className="mt-24 bg-brand-deep text-white/80">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2"><LeafMark className="size-9" /><span className="font-display text-2xl text-white">DryHarvest</span></div>
          <p className="mt-3 max-w-xs text-sm">{store.tagline}</p>
          <dl className="mt-5 space-y-1 text-sm">
            {store.email && <div><dt className="sr-only">Email</dt><dd><a className="hover:text-white" href={`mailto:${store.email}`}>{store.email}</a></dd></div>}
            {store.phone && <div><dt className="sr-only">Phone</dt><dd><a className="hover:text-white" href={`tel:${store.phone}`}>{store.phone}</a></dd></div>}
            {store.address && <div><dt className="sr-only">Address</dt><dd className="whitespace-pre-line">{store.address}</dd></div>}
            {store.fssaiLicense && <div className="pt-2 text-xs text-white/60">FSSAI Lic. No. {store.fssaiLicense}</div>}
          </dl>
        </div>
        <nav aria-label="Shop">
          <p className="font-display text-lg text-white">Shop</p>
          <ul className="mt-3 space-y-2 text-sm">{cats.slice(0, 7).map((c) => <li key={c.slug}><Link className="hover:text-white" href={`/category/${c.slug}`}>{c.name}</Link></li>)}<li><Link className="hover:text-white" href="/categories">All categories</Link></li></ul>
        </nav>
        <nav aria-label="Help">
          <p className="font-display text-lg text-white">Help</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/contact">Contact us</Link></li>
            <li><Link className="hover:text-white" href="/policies/shipping">Shipping policy</Link></li>
            <li><Link className="hover:text-white" href="/policies/returns">Returns &amp; replacements</Link></li>
            <li><Link className="hover:text-white" href="/policies/refund">Refund policy</Link></li>
          </ul>
        </nav>
        <nav aria-label="Company">
          <p className="font-display text-lg text-white">Company</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/about">About DryHarvest</Link></li>
            <li><Link className="hover:text-white" href="/policies/privacy">Privacy policy</Link></li>
            <li><Link className="hover:text-white" href="/policies/terms">Terms of service</Link></li>
            {store.instagram && <li><a className="hover:text-white" href={store.instagram} rel="noopener noreferrer" target="_blank">Instagram</a></li>}
            {store.facebook && <li><a className="hover:text-white" href={store.facebook} rel="noopener noreferrer" target="_blank">Facebook</a></li>}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-white/55 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {store.legalName || 'DryHarvest'}. All rights reserved.{store.gstin && ` GSTIN ${store.gstin}.`}</p>
          <p>Prices in INR, inclusive of applicable taxes.</p>
        </div>
      </div>
    </footer>
  );
}
