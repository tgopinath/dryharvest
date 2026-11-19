import type { Metadata } from 'next';
import { requireUser } from '@/server/auth';
import { ProfileForm, PasswordForm } from '@/components/store/AccountForms';

export const metadata: Metadata = { title: 'My account', robots: { index: false } };

export default async function AccountPage() {
  const u = await requireUser();
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-3xl border border-brand-ink/10 bg-white p-6"><h2 className="mb-4 text-2xl">Profile</h2><ProfileForm name={u.name} phone={u.phone} email={u.email} /></section>
      <section className="rounded-3xl border border-brand-ink/10 bg-white p-6"><h2 className="mb-4 text-2xl">Password</h2><PasswordForm hasPassword={u.hasPassword} /></section>
    </div>
  );
}
