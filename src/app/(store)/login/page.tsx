import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { AuthShell } from '@/components/store/AuthShell';
import { LoginForm } from '@/components/store/AuthForms';

export const metadata: Metadata = { title: 'Log in', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await getCurrentUser()) redirect(next?.startsWith('/') ? next : '/account');
  return <AuthShell title="Welcome back" text="Log in to check out, track orders and manage your addresses." next={next} error={error}><LoginForm next={next} /></AuthShell>;
}
