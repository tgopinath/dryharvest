import Link from 'next/link';
import { requireUser } from '@/server/auth';
import { logout } from '@/app/actions/auth';
import { AccountNav } from '@/components/store/AccountNav';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/account');
  return (
    <div className="container-x py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm text-brand-ink/60">My account</p><h1 className="text-4xl text-brand-deep">Hello, {user.name.split(' ')[0]}</h1></div>
        <div className="flex gap-2">
          {user.role !== 'CUSTOMER' && <Link href="/admin" className="rounded-full bg-brand-deep px-4 py-2 text-sm font-semibold text-white">Admin dashboard</Link>}
          <form action={logout}><button className="rounded-full border border-brand-ink/15 px-4 py-2 text-sm font-semibold hover:border-brand">Log out</button></form>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
