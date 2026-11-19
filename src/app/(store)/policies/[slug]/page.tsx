import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSetting, type Policies } from '@/server/settings';
import { PageHeader } from '@/components/store/Listing';

const TITLES: Record<keyof Policies, string> = {
  shipping: 'Shipping policy', returns: 'Returns & replacements', refund: 'Refund policy', privacy: 'Privacy policy', terms: 'Terms of service',
};
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = TITLES[(await params).slug as keyof Policies];
  return t ? { title: t } : {};
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in TITLES)) notFound();
  const policies = await getSetting('policies');
  return (
    <div className="container-x max-w-3xl py-12">
      <PageHeader title={TITLES[slug as keyof Policies]} crumbs={[{ href: '/', label: 'Home' }, { href: `/policies/${slug}`, label: TITLES[slug as keyof Policies] }]} />
      <div className="prose-dh leading-relaxed text-brand-ink/80">{policies[slug as keyof Policies]}</div>
    </div>
  );
}
