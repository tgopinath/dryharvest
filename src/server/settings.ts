import 'server-only';
import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { db, schema } from '@/db';

export type StoreSettings = {
  name: string; tagline: string; email: string; phone: string; whatsapp: string; address: string;
  legalName: string; gstin: string; state: string; fssaiLicense: string; announcement: string;
  instagram: string; facebook: string; youtube: string;
};
export type ShippingSettings = {
  flatRate: number; // paise
  freeAbove: number | null; // paise; null = never free
  codEnabled: boolean;
  codFee: number; // paise
  codMaxOrder: number | null;
  serviceablePincodePrefixes: string[]; // empty = all India
  dispatchNote: string;
};
export type HeroClaim = { id: string; title: string; text: string; icon: 'leaf' | 'truck' | 'star' | 'shield'; verified: boolean; visible: boolean };
export type Policies = { shipping: string; returns: string; privacy: string; terms: string; refund: string };
export type AboutContent = { heading: string; body: string };

type Defaults = { store: StoreSettings; shipping: ShippingSettings; heroClaims: HeroClaim[]; policies: Policies; about: AboutContent };
export const DEFAULT_SETTINGS: Defaults = {
  store: {
    name: 'NutriDry Naturals', tagline: 'Naturally Dried. Naturally Better.', email: '', phone: '', whatsapp: '', address: '',
    legalName: '', gstin: '', state: 'Tamil Nadu', fssaiLicense: '', announcement: 'Demo showcase: products are not for sale, and no orders, payments or accounts are taken.', instagram: '', facebook: '', youtube: '',
  },
  shipping: {
    flatRate: 6000, freeAbove: 99900, codEnabled: false, codFee: 4900, codMaxOrder: 300000,
    serviceablePincodePrefixes: [], dispatchNote: 'Orders are usually dispatched within 1–2 business days.',
  },
  // Claims are hidden until an admin confirms they are verified (Admin → CMS → Hero claims).
  heroClaims: [
    { id: 'quality', title: 'Carefully selected', text: 'Ingredients chosen batch by batch.', icon: 'leaf', verified: false, visible: false },
    { id: 'delivery', title: 'Delivered to your door', text: 'Shipping across India.', icon: 'truck', verified: false, visible: false },
    { id: 'rating', title: 'Rated by customers', text: 'Based on verified reviews.', icon: 'star', verified: false, visible: false },
  ],
  policies: {
    shipping: 'TODO: Add your shipping policy (dispatch times, courier partners, delivery zones, charges).',
    returns: 'TODO: Add your return policy. Food products are typically non-returnable once opened; damaged or incorrect items may be replaced when reported within 48 hours of delivery with photos.',
    refund: 'TODO: Add your refund policy (refund timelines and the original payment method).',
    privacy: 'TODO: Add your privacy policy (what data you collect, why, how long you keep it, and how customers can request deletion).',
    terms: 'TODO: Add your terms of service.',
  },
  about: {
    heading: 'Naturally dried, carefully packed.',
    body: 'TODO: Tell your story — where your produce comes from, how you dry it and who is behind NutriDry Naturals.',
  },
};
export type SettingsKey = keyof typeof DEFAULT_SETTINGS;
type SettingsMap = typeof DEFAULT_SETTINGS;

export const getSetting = cache(async <K extends SettingsKey>(key: K): Promise<SettingsMap[K]> => {
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, key) });
  const def = DEFAULT_SETTINGS[key];
  if (!row) return def;
  if (Array.isArray(def)) return row.value as SettingsMap[K];
  return { ...def, ...(row.value as object) } as SettingsMap[K];
});

export async function saveSetting<K extends SettingsKey>(key: K, value: SettingsMap[K]) {
  await db
    .insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
}
