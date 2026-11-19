'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db, schema } from '@/db';
import { getCurrentUser } from '@/server/auth';
import { hasPurchased } from '@/server/orders';
import { fieldErrors, formObject, type FormState } from '@/lib/validation';
import { rateLimit } from '@/server/ratelimit';

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1, 'Choose a rating').max(5),
  title: z.string().trim().max(100).optional(),
  body: z.string().trim().min(10, 'Write at least 10 characters').max(2000),
});

/** Only customers with an order containing the product can review. Reviews go live after moderation. */
export async function submitReview(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Log in to write a review.' };
  if (!(await rateLimit('review', 10, 60 * 60_000))) return { error: 'Too many reviews. Try again later.' };
  const parsed = reviewSchema.safeParse(formObject(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const verified = await hasPurchased(user.id, parsed.data.productId);
  if (!verified) return { error: 'You can review products you have ordered.' };
  await db
    .insert(schema.reviews)
    .values({ ...parsed.data, userId: user.id, verifiedPurchase: true, status: 'PENDING' })
    .onConflictDoUpdate({
      target: [schema.reviews.productId, schema.reviews.userId],
      set: { rating: parsed.data.rating, title: parsed.data.title, body: parsed.data.body, status: 'PENDING', createdAt: new Date() },
    });
  revalidatePath('/account/reviews');
  return { ok: true, message: 'Thanks! Your review will appear once it has been checked.' };
}
