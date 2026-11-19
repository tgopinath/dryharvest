import type { Metadata } from 'next';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/server/auth';
import { AddressBook } from '@/components/store/AccountForms';

export const metadata: Metadata = { title: 'Addresses', robots: { index: false } };

export default async function AddressesPage() {
  const u = await requireUser('/account/addresses');
  const list = await db.query.addresses.findMany({ where: eq(schema.addresses.userId, u.id), orderBy: [desc(schema.addresses.isDefault), desc(schema.addresses.createdAt)] });
  return <section><h2 className="mb-4 text-2xl">Saved addresses</h2><AddressBook addresses={list} /></section>;
}
