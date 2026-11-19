import Link from 'next/link';
import { buttonClass } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="text-4xl">We couldn’t find that page</h1>
      <p className="mt-2 text-brand-ink/65">It may have moved, or the product is no longer available.</p>
      <div className="mt-6 flex justify-center gap-3"><Link href="/shop" className={buttonClass()}>Browse the shop</Link><Link href="/" className={buttonClass('outline')}>Go home</Link></div>
    </div>
  );
}
