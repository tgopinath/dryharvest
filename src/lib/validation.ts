import { z } from 'zod';

export const phoneSchema = z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');
export const pincodeSchema = z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit pincode');
export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(200);
export const passwordSchema = z.string().min(8, 'Use at least 8 characters').max(200);

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the recipient name').max(100),
  phone: phoneSchema,
  line1: z.string().trim().min(3, 'Enter house / street').max(200),
  line2: z.string().trim().max(200).optional().nullable(),
  landmark: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().min(2, 'Enter the city').max(80),
  state: z.string().trim().min(2, 'Choose a state').max(80),
  pincode: pincodeSchema,
});

export type FormState = { ok?: boolean; error?: string | null; fieldErrors?: Record<string, string>; message?: string | null };

export function fieldErrors(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[i.path.join('.')] ??= i.message;
  return out;
}

export function formObject(fd: FormData) {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string') o[k] = v;
  return o;
}
