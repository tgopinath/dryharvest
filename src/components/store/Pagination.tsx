import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Pagination({ page, pages, basePath, params }: { page: number; pages: number; basePath: string; params: Record<string, string | string[] | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === 'page' || v == null) continue;
      (Array.isArray(v) ? v : [v]).forEach((x) => sp.append(k, x));
    }
    if (p > 1) sp.set('page', String(p));
    const q = sp.toString();
    return q ? `${basePath}?${q}` : basePath;
  };
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
      {page > 1 && <Link href={href(page - 1)} className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-brand-ink/5" rel="prev">Previous</Link>}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-brand-ink/40">…</span>}
          <Link href={href(n)} aria-current={n === page ? 'page' : undefined} className={cn('flex size-9 items-center justify-center rounded-full text-sm font-semibold', n === page ? 'bg-brand text-white' : 'hover:bg-brand-ink/5')}>{n}</Link>
        </span>
      ))}
      {page < pages && <Link href={href(page + 1)} className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-brand-ink/5" rel="next">Next</Link>}
    </nav>
  );
}
