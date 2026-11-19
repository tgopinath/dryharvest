import type { Metadata } from 'next';
import { Listing, PageHeader, type SP } from '@/components/store/Listing';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (typeof sp.q === 'string' ? sp.q : '').slice(0, 80);
  return (
    <div className="container-x py-10">
      <PageHeader title={q ? `Results for “${q}”` : 'Search'} crumbs={[{ href: '/', label: 'Home' }, { href: '/search', label: 'Search' }]} />
      <Listing sp={sp} basePath="/search" q={q} />
    </div>
  );
}
