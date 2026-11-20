import Link from 'next/link';
import { asc, desc, eq } from 'drizzle-orm';
import { Leaf, Package, ShieldCheck, Headphones, Truck, Star } from 'lucide-react';
import { db, schema } from '@/db';
import { getSetting, type HeroClaim } from '@/server/settings';
import { getCategories, getCategoryCounts, queryProducts } from '@/server/catalog';
import { getCurrentUser } from '@/server/auth';
import { hydrateCards } from '@/server/catalog';
import { ProductGrid } from '@/components/store/ProductCard';
import { ProductArt, CAT_ART } from '@/components/store/ProductArt';
import { buttonClass } from '@/components/ui';
import { Stars } from '@/components/store/Price';
import { NewsletterForm } from '@/components/store/Forms';

export const dynamic = 'force-dynamic';

type Section = typeof schema.homeSections.$inferSelect;

export default async function HomePage() {
  const [sections, claims, cats, counts, user] = await Promise.all([
    db.query.homeSections.findMany({ where: eq(schema.homeSections.isVisible, true), orderBy: [asc(schema.homeSections.sortOrder)] }),
    getSetting('heroClaims'),
    getCategories(),
    getCategoryCounts(),
    getCurrentUser(),
  ]);

  const blocks = await Promise.all(sections.map(async (s) => {
    switch (s.key) {
      case 'hero': return <Hero key={s.key} s={s} claims={claims.filter((c) => c.verified && c.visible)} />;
      case 'trust': return <TrustStrip key={s.key} />;
      case 'categories': return <CategoryGrid key={s.key} s={s} cats={cats.map((c) => ({ ...c, count: counts.get(c.id) ?? 0 }))} />;
      case 'why': return <Why key={s.key} s={s} />;
      case 'reviews': return <Reviews key={s.key} s={s} />;
      case 'newsletter': return <Newsletter key={s.key} s={s} />;
      default: {
        const collection = (s.data as { collection?: string } | null)?.collection;
        if (!collection) return null;
        const r = await queryProducts({ collection, perPage: 8, sort: 'featured' });
        if (!r.items.length) return null;
        const items = user ? await hydrateCards(r.items.map((i) => i.id), user.id) : r.items;
        return <CollectionRow key={s.key} s={s} items={items} href={`/shop?collection=${collection}`} alt={sections.indexOf(s) % 2 === 1} />;
      }
    }
  }));

  return <>{blocks}</>;
}

function SectionHead({ s, href, linkText = 'View all' }: { s: Pick<Section, 'title' | 'eyebrow' | 'subtitle'>; href?: string; linkText?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {s.eyebrow && <p className="mb-1 text-sm font-semibold text-[#B07D00]">{s.eyebrow}</p>}
        <h2 className="text-3xl font-bold sm:text-4xl">{s.title}</h2>
        {s.subtitle && <p className="mt-2 text-brand-ink/65">{s.subtitle}</p>}
      </div>
      {href && <Link href={href} className="shrink-0 text-sm font-semibold text-brand underline-offset-4 hover:underline">{linkText}</Link>}
    </div>
  );
}

const CLAIM_ICON = { leaf: Leaf, truck: Truck, star: Star, shield: ShieldCheck };

function Hero({ s, claims }: { s: Section; claims: HeroClaim[] }) {
  const d = (s.data ?? {}) as { primaryCta?: { label: string; href: string }; secondaryCta?: { label: string; href: string }; imageUrl?: string };
  const pos = ['left-2 top-4 sm:-left-4', 'right-2 bottom-24 sm:-right-2', 'left-6 bottom-2'];
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="container-x grid items-center gap-10 py-12 lg:grid-cols-[1fr_1.1fr] lg:py-20">
        <div className="max-w-xl">
          {s.eyebrow && <p className="inline-flex rounded-full bg-brand-pale px-3.5 py-1.5 text-sm font-semibold text-brand-deep">{s.eyebrow}</p>}
          <h1 className="mt-5 text-[2.6rem] font-bold leading-[1.04] text-brand-deep sm:text-6xl lg:text-[4.1rem]">{s.title}</h1>
          {s.subtitle && <p className="mt-5 max-w-lg text-lg leading-relaxed text-brand-ink/70">{s.subtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            {d.primaryCta && <Link href={d.primaryCta.href} className={buttonClass('primary', 'lg')}>{d.primaryCta.label}</Link>}
            {d.secondaryCta && <Link href={d.secondaryCta.href} className={buttonClass('yellow', 'lg')}>{d.secondaryCta.label}</Link>}
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[620px]">
          {d.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.imageUrl} alt="" className="aspect-[5/4] w-full rounded-[2rem] object-cover" />
          ) : <HeroArt />}
          {claims.map((c, i) => {
            const Icon = CLAIM_ICON[c.icon] ?? Leaf;
            return (
              <div key={c.id} className={`absolute ${pos[i % pos.length]} hidden max-w-[220px] items-start gap-2.5 rounded-2xl bg-white/95 p-3 shadow-soft sm:flex`}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-pale text-brand"><Icon className="size-4" /></span>
                <span><span className="block text-sm font-bold">{c.title}</span><span className="text-xs text-brand-ink/60">{c.text}</span></span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Illustrated studio composition used until a real hero photograph is uploaded in Admin → CMS. */
function HeroArt() {
  const bowls: [string, string][] = [
    ['Dried Mango Slices', 'left-[4%] top-[30%] w-[38%]'],
    ['Sun-Dried Tomatoes', 'left-[34%] top-[8%] w-[30%]'],
    ['Moringa Leaf Powder', 'right-[2%] top-[22%] w-[30%]'],
    ['Hibiscus Flower Tea', 'left-[36%] bottom-[2%] w-[32%]'],
    ['Banana Chips', 'right-[6%] bottom-[8%] w-[26%]'],
    ['Dried Okra Slices', 'left-[10%] bottom-[0%] w-[24%]'],
  ];
  return (
    <div aria-hidden className="relative aspect-[5/4] w-full rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_55%,#EDF5E9_0%,#FBFAF4_70%)]">
      {bowls.map(([n, cls]) => (
        <div key={n} className={`absolute aspect-square overflow-hidden rounded-full border-[6px] border-white bg-white shadow-soft ${cls}`}>
          <ProductArt name={n} pouch={false} label={false}  />
        </div>
      ))}
      <svg viewBox="0 0 40 40" className="absolute left-[26%] top-[6%] size-10 rotate-[-20deg] text-brand"><path d="M21 22C14 23 7 18 6 8c8-1 15 3 15 14Z" fill="currentColor" /></svg>
      <svg viewBox="0 0 40 40" className="absolute right-[30%] top-[2%] size-8 rotate-[30deg] text-[#2E8B4E]"><path d="M23 19c1-9 7-15 15-15 0 9-6 15-15 15Z" fill="currentColor" /></svg>
    </div>
  );
}

function TrustStrip() {
  const items = [
    { icon: Leaf, t: 'Carefully selected ingredients', d: 'Chosen batch by batch' },
    { icon: Package, t: 'Quality packaging', d: 'Resealable, hygienic pouches' },
    { icon: ShieldCheck, t: 'Secure payments', d: 'UPI, cards and netbanking' },
    { icon: Headphones, t: 'Customer support', d: 'Real people, quick replies' },
  ];
  return (
    <section aria-label="Why shop with us" className="container-x relative z-10 -mt-4 lg:-mt-8">
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-brand-ink/10 bg-brand-ink/10 lg:grid-cols-4">
        {items.map(({ icon: Icon, t, d }) => (
          <li key={t} className="flex items-center gap-3 bg-white p-4 sm:p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-pale text-brand"><Icon className="size-5" /></span>
            <span><span className="block text-sm font-bold">{t}</span><span className="text-xs text-brand-ink/55">{d}</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CategoryGrid({ s, cats }: { s: Section; cats: (typeof schema.categories.$inferSelect & { count: number })[] }) {
  return (
    <section className="container-x pt-20">
      <SectionHead s={s} href="/categories" linkText="All categories" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {cats.map((c) => (
          <li key={c.id}>
            <Link href={`/category/${c.slug}`} className="group block h-full rounded-2xl border border-brand-ink/8 bg-[#F6F1E6] p-3 text-center transition-colors hover:border-brand/40 hover:bg-brand-pale">
              <div className="mx-auto aspect-square w-4/5 overflow-hidden rounded-full">
                {c.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                  : <ProductArt name={CAT_ART[c.slug] ?? c.name} pouch={false} label={false} className="transition-transform duration-500 group-hover:scale-[1.06]" />}
              </div>
              <p className="mt-3 text-sm font-bold leading-tight">{c.name}</p>
              <p className="mt-0.5 text-xs text-brand-ink/55">{c.tagline}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CollectionRow({ s, items, href, alt }: { s: Section; items: Awaited<ReturnType<typeof queryProducts>>['items']; href: string; alt: boolean }) {
  return (
    <section className={alt ? 'mt-20 bg-white py-16' : 'container-x pt-20'}>
      <div className={alt ? 'container-x' : ''}>
        <SectionHead s={s} href={href} />
        <ProductGrid items={items.slice(0, 8)} />
      </div>
    </section>
  );
}

function Why({ s }: { s: Section }) {
  const pts = ((s.data as { points?: { title: string; text: string }[] } | null)?.points) ?? [];
  return (
    <section className="container-x pt-20">
      <div className="grid gap-10 rounded-[2rem] bg-brand-deep p-8 text-white sm:p-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          {s.eyebrow && <p className="text-sm font-semibold text-brand-yellow">{s.eyebrow}</p>}
          <h2 className="mt-1 text-4xl font-bold">{s.title}</h2>
          {s.subtitle && <p className="mt-3 text-white/70">{s.subtitle}</p>}
          <Link href="/about" className={buttonClass('yellow', 'md', 'mt-6')}>Our story</Link>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2">
          {pts.map((p) => (
            <li key={p.title} className="border-t border-white/15 pt-4">
              <p className="font-display text-xl">{p.title}</p>
              <p className="mt-1 text-sm text-white/70">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

async function Reviews({ s }: { s: Section }) {
  const list = await db.query.reviews.findMany({
    where: eq(schema.reviews.status, 'APPROVED'),
    with: { user: { columns: { name: true } }, product: { columns: { name: true, slug: true } } },
    orderBy: [desc(schema.reviews.rating), desc(schema.reviews.createdAt)],
    limit: 3,
  });
  if (!list.length) return null; // Never show placeholder testimonials.
  return (
    <section className="container-x pt-20">
      <SectionHead s={s} />
      <ul className="grid gap-4 md:grid-cols-3">
        {list.map((r) => (
          <li key={r.id} className="flex flex-col rounded-2xl border border-brand-ink/10 bg-white p-6">
            <Stars value={r.rating} />
            {r.title && <p className="mt-3 font-display text-lg">{r.title}</p>}
            <p className="mt-2 line-clamp-5 text-sm leading-relaxed text-brand-ink/75">{r.body}</p>
            <p className="mt-auto pt-4 text-xs text-brand-ink/55">
              {r.user.name.split(' ')[0]} {r.verifiedPurchase && '· Verified buyer'} · <Link className="underline" href={`/product/${r.product.slug}`}>{r.product.name}</Link>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Newsletter({ s }: { s: Section }) {
  return (
    <section className="container-x pt-20">
      <div className="flex flex-col items-start gap-6 rounded-[2rem] bg-brand-pale p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-lg">
          {s.eyebrow && <p className="text-sm font-semibold text-brand">{s.eyebrow}</p>}
          <h2 className="mt-1 text-3xl font-bold text-brand-deep sm:text-4xl">{s.title}</h2>
          {s.subtitle && <p className="mt-2 text-brand-ink/65">{s.subtitle}</p>}
        </div>
        <NewsletterForm />
      </div>
    </section>
  );
}
