import type { Metadata } from 'next';
import Link from 'next/link';
import { getSetting } from '@/server/settings';
import { buttonClass } from '@/components/ui';
import { PageHeader } from '@/components/store/Listing';

export const metadata: Metadata = { title: 'About us' };
export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const about = await getSetting('about');
  return (
    <div className="container-x max-w-3xl py-12">
      <PageHeader title={about.heading} crumbs={[{ href: '/', label: 'Home' }, { href: '/about', label: 'About' }]} />
      <div className="prose-dh text-lg leading-relaxed text-brand-ink/80">{about.body}</div>
      <div className="mt-10 flex gap-3"><Link href="/shop" className={buttonClass()}>Shop the range</Link><Link href="/contact" className={buttonClass('outline')}>Get in touch</Link></div>
    </div>
  );
}
