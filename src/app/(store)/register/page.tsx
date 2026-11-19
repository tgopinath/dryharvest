import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { AuthShell } from '@/components/store/AuthShell';
import { RegisterForm } from '@/components/store/AuthForms';

export const metadata: Metadata = { title: 'Create account', robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await getCurrentUser()) redirect('/account');
  return <AuthShell title="Create your account" text="Save addresses, track orders and check out faster." next={next} error={error}><RegisterForm next={next} /></AuthShell>;
}
