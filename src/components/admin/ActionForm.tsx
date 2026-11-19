'use client';
import { useActionState } from 'react';
import { Alert } from '@/components/ui';

type R = { ok: boolean; error?: string; message?: string };
/** Small wrapper: server action + inline success/error message. */
export function ActionForm({ action, children, className }: { action: (s: R, fd: FormData) => Promise<R>; children: React.ReactNode; className?: string }) {
  const [state, run, pending] = useActionState<R, FormData>(action, { ok: false });
  return (
    <form action={run} className={className} aria-busy={pending}>
      {state.error && <Alert tone="error" className="mb-3">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success" className="mb-3">{state.message}</Alert>}
      <fieldset disabled={pending} className="contents">{children}</fieldset>
    </form>
  );
}
