'use client';
import { Button } from '@/components/ui';

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="text-3xl">This page didn’t load</h1>
      <p className="mx-auto mt-2 max-w-md text-brand-ink/65">Something went wrong on our side. Try again, and if it keeps happening, contact us with reference {error.digest ?? 'n/a'}.</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
