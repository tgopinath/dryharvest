import Link from 'next/link';

export function LeafMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M20 37c-.6-6 .4-12 4-18" stroke="#123D27" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M21 22C14 23 7 18 6 8c8-1 15 3 15 14Z" fill="#176B36" />
      <path d="M23 19c1-9 7-15 15-15 0 9-6 15-15 15Z" fill="#2E8B4E" />
      <path d="M21 22C16 19 11 15 9 10" stroke="#EDF5E9" strokeWidth="1" fill="none" opacity=".7" />
    </svg>
  );
}

export function Logo({ tagline = true }: { tagline?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="DryHarvest home">
      <LeafMark className="size-9" />
      <span className="leading-none">
        <span className="block font-display text-[1.6rem] font-semibold text-brand-deep">DryHarvest</span>
        {tagline && <span className="mt-0.5 hidden text-[10px] font-medium text-brand-ink/60 sm:block">Naturally Dried. Naturally Better.</span>}
      </span>
    </Link>
  );
}
