'use client';
import { useActionState } from 'react';
import { subscribe, sendContact } from '@/app/actions/site';
import { Alert, Button, Field, Input, Spinner, Textarea } from '@/components/ui';
import type { FormState } from '@/lib/validation';

export function NewsletterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribe, {});
  if (state.ok) return <Alert tone="success" className="w-full max-w-md">{state.message}</Alert>;
  return (
    <form action={action} className="w-full max-w-md">
      <div className="flex gap-2">
        <label htmlFor="nl-email" className="sr-only">Email address</label>
        <Input id="nl-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="h-12 rounded-full px-5" />
        <Button size="lg" disabled={pending}>{pending ? <Spinner /> : 'Subscribe'}</Button>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
    </form>
  );
}

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(sendContact, {});
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="c-name" error={fe.name}><Input id="c-name" name="name" required autoComplete="name" aria-invalid={!!fe.name} /></Field>
        <Field label="Email" htmlFor="c-email" error={fe.email}><Input id="c-email" name="email" type="email" required autoComplete="email" aria-invalid={!!fe.email} /></Field>
        <Field label="Phone (optional)" htmlFor="c-phone"><Input id="c-phone" name="phone" type="tel" autoComplete="tel" /></Field>
        <Field label="Order number (optional)" htmlFor="c-subject"><Input id="c-subject" name="subject" placeholder="e.g. DH261119-123456" /></Field>
      </div>
      <Field label="How can we help?" htmlFor="c-msg" error={fe.message}><Textarea id="c-msg" name="message" rows={5} required aria-invalid={!!fe.message} /></Field>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Button size="lg" disabled={pending}>{pending && <Spinner />}Send message</Button>
    </form>
  );
}
