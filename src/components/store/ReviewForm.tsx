'use client';
import { useActionState, useState } from 'react';
import { Star } from 'lucide-react';
import { submitReview } from '@/app/actions/reviews';
import { Alert, Button, Field, Input, Spinner, Textarea } from '@/components/ui';
import type { FormState } from '@/lib/validation';
import { cn } from '@/lib/utils';

export function ReviewForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitReview, {});
  const [rating, setRating] = useState(0);
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-brand-ink/10 bg-white p-5">
      <p className="font-display text-xl">Write a review</p>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="productId" value={productId} />
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand rounded">
              <input type="radio" name="rating" value={n} className="sr-only" onChange={() => setRating(n)} required />
              <Star aria-label={`${n} star${n > 1 ? 's' : ''}`} className={cn('size-7', n <= rating ? 'fill-brand-yellow text-brand-yellow' : 'text-brand-ink/25')} />
            </label>
          ))}
        </div>
        {fe.rating && <p className="text-xs text-red-700">{fe.rating}</p>}
      </fieldset>
      <Field label="Title (optional)" htmlFor="rv-title"><Input id="rv-title" name="title" maxLength={100} /></Field>
      <Field label="Your review" htmlFor="rv-body" error={fe.body}><Textarea id="rv-body" name="body" required minLength={10} maxLength={2000} /></Field>
      <Button disabled={pending}>{pending && <Spinner />}Submit review</Button>
    </form>
  );
}
