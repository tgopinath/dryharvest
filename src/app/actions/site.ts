'use server';
import { z } from 'zod';
import { db, schema } from '@/db';
import { rateLimit } from '@/server/ratelimit';
import { emailSchema, fieldErrors, formObject, type FormState } from '@/lib/validation';

export async function subscribe(_: FormState, fd: FormData): Promise<FormState> {
  if (!(await rateLimit('newsletter', 5, 60 * 60_000))) return { error: 'Too many attempts. Try again later.' };
  const parsed = emailSchema.safeParse(fd.get('email'));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.insert(schema.newsletterSubscribers).values({ email: parsed.data }).onConflictDoNothing();
  return { ok: true, message: 'You are subscribed. Watch your inbox for new harvests.' };
}

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(100),
  email: emailSchema,
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(4000),
});

export async function sendContact(_: FormState, fd: FormData): Promise<FormState> {
  if (fd.get('website')) return { ok: true, message: 'Thanks!' }; // honeypot
  if (!(await rateLimit('contact', 5, 60 * 60_000))) return { error: 'Too many messages. Try again later.' };
  const parsed = contactSchema.safeParse(formObject(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  await db.insert(schema.contactMessages).values(parsed.data);
  return { ok: true, message: 'Message sent. We usually reply within one business day.' };
}
