'use client';
import { useState } from 'react';
import { ProductArt } from './ProductArt';
import { cn } from '@/lib/utils';

export function Gallery({ images, name }: { images: { url: string; alt: string | null }[]; name: string }) {
  const [i, setI] = useState(0);
  if (!images.length) {
    return <div className="aspect-square overflow-hidden rounded-3xl border border-brand-ink/10 bg-white"><ProductArt name={name} /></div>;
  }
  const cur = images[Math.min(i, images.length - 1)];
  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-3xl border border-brand-ink/10 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cur.url} alt={cur.alt || name} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-2" aria-label="Product images">
          {images.map((im, k) => (
            <li key={im.url}>
              <button type="button" onClick={() => setI(k)} aria-label={`Show image ${k + 1}`} aria-current={k === i} className={cn('aspect-square w-full overflow-hidden rounded-xl border-2 bg-white', k === i ? 'border-brand' : 'border-transparent opacity-80 hover:opacity-100')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
