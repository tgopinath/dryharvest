'use client';
import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Heart } from 'lucide-react';
import { toggleWishlist } from '@/app/actions/wishlist';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

export function WishlistButton({ productId, initial = false, className, withLabel }: { productId: string; initial?: boolean; className?: string; withLabel?: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const path = usePathname();
  const toast = useToast();
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? 'Remove from wishlist' : 'Save to wishlist'}
      disabled={pending}
      onClick={() => start(async () => {
        const r = await toggleWishlist(productId);
        if (r.needsLogin) { router.push(`/login?next=${encodeURIComponent(path)}`); return; }
        if (r.ok) { setOn(!!r.inWishlist); toast(r.inWishlist ? 'Saved to wishlist' : 'Removed from wishlist'); }
      })}
      className={cn('inline-flex items-center gap-2 rounded-full transition-colors', withLabel ? 'h-12 border border-brand-ink/15 bg-white px-5 text-sm font-semibold hover:border-brand' : 'size-9 justify-center bg-white/90 shadow-sm hover:bg-white', className)}
    >
      <Heart className={cn('size-[18px]', on ? 'fill-red-600 text-red-600' : 'text-brand-ink/70')} />
      {withLabel && (on ? 'Saved' : 'Save')}
    </button>
  );
}
