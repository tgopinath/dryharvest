'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { login, register } from '@/app/actions/auth';
import { Alert, Button, Field, Input, Spinner } from '@/components/ui';
import type { FormState } from '@/lib/validation';

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? ''} />
      <Field label="Email" htmlFor="l-email"><Input id="l-email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Password" htmlFor="l-pw"><Input id="l-pw" name="password" type="password" autoComplete="current-password" required /></Field>
      <Button size="lg" className="w-full" disabled={pending}>{pending && <Spinner />}Log in</Button>
      <p className="text-center text-sm text-brand-ink/65">New here? <Link className="font-semibold text-brand underline" href={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link></p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(register, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? ''} />
      <Field label="Full name" htmlFor="r-name" error={fe.name}><Input id="r-name" name="name" autoComplete="name" required aria-invalid={!!fe.name} /></Field>
      <Field label="Email" htmlFor="r-email" error={fe.email}><Input id="r-email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} /></Field>
      <Field label="Mobile number (optional)" htmlFor="r-phone" error={fe.phone} hint="For delivery updates"><Input id="r-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" aria-invalid={!!fe.phone} /></Field>
      <Field label="Password" htmlFor="r-pw" error={fe.password} hint="At least 8 characters"><Input id="r-pw" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={!!fe.password} /></Field>
      <Button size="lg" className="w-full" disabled={pending}>{pending && <Spinner />}Create account</Button>
      <p className="text-xs text-brand-ink/55">By creating an account you agree to our <Link className="underline" href="/policies/terms">terms</Link> and <Link className="underline" href="/policies/privacy">privacy policy</Link>.</p>
      <p className="text-center text-sm text-brand-ink/65">Already have an account? <Link className="font-semibold text-brand underline" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Log in</Link></p>
    </form>
  );
}
