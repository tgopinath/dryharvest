import type { Metadata } from 'next';
import Link from 'next/link';
import { and, eq, lte, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireStaff, can, type Permission } from '@/server/auth';
import { AdminNav, type NavItem } from '@/components/admin/AdminNav';
import { LeafMark } from '@/components/store/Logo';
import { logout } from '@/app/actions/auth';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · DryHarvest Admin' }, robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const [[pending], [openReq], [lowStock], [unread], [pendingReviews]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.orders).where(sql`${schema.orders.status} in ('PLACED','CONFIRMED','PACKED')`),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.orderRequests).where(eq(schema.orderRequests.status, 'OPEN')),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.variants).where(and(eq(schema.variants.isActive, true), lte(schema.variants.stock, schema.variants.reorderLevel))),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.contactMessages).where(eq(schema.contactMessages.isRead, false)),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.reviews).where(eq(schema.reviews.status, 'PENDING')),
  ]);
  const all: (NavItem & { perm: Permission })[] = [
    { href: '/admin', label: 'Dashboard', icon: 'LayoutDashboard', perm: 'dashboard:view' },
    { href: '/admin/orders', label: 'Orders', icon: 'ShoppingCart', perm: 'orders:view', badge: pending.n },
    { href: '/admin/requests', label: 'Cancellations & returns', icon: 'Undo2', perm: 'orders:view', badge: openReq.n },
    { href: '/admin/products', label: 'Products', icon: 'Package', perm: 'products:view' },
    { href: '/admin/categories', label: 'Categories', icon: 'FolderTree', perm: 'categories:edit' },
    { href: '/admin/inventory', label: 'Inventory', icon: 'Boxes', perm: 'inventory:view', badge: lowStock.n },
    { href: '/admin/customers', label: 'Customers', icon: 'Users', perm: 'customers:view' },
    { href: '/admin/suppliers', label: 'Suppliers', icon: 'Truck', perm: 'suppliers:edit' },
    { href: '/admin/coupons', label: 'Coupons', icon: 'TicketPercent', perm: 'coupons:edit' },
    { href: '/admin/reviews', label: 'Reviews', icon: 'MessageSquareText', perm: 'reviews:moderate', badge: pendingReviews.n },
    { href: '/admin/messages', label: 'Messages', icon: 'Inbox', perm: 'customers:view', badge: unread.n },
    { href: '/admin/cms', label: 'Homepage & content', icon: 'LayoutTemplate', perm: 'cms:edit' },
    { href: '/admin/reports', label: 'Reports & exports', icon: 'BarChart3', perm: 'reports:view' },
    { href: '/admin/users', label: 'Staff & roles', icon: 'ShieldCheck', perm: 'users:manage' },
    { href: '/admin/settings', label: 'Settings', icon: 'Settings', perm: 'settings:edit' },
    { href: '/admin/audit', label: 'Audit log', icon: 'History', perm: 'audit:view' },
  ];
  const items = all.filter((i) => can(user.role, i.perm)).map(({ perm: _p, ...i }) => i);
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="bg-brand-deep lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:p-4">
        <Link href="/admin" className="mb-6 hidden items-center gap-2 px-2 pt-1 lg:flex"><LeafMark className="size-8" /><span className="font-display text-xl text-white">DryHarvest</span><span className="rounded bg-white/10 px-1.5 text-[10px] font-semibold text-white/70">Admin</span></Link>
        <AdminNav items={items} />
        <div className="mt-auto hidden border-t border-white/10 pt-4 text-xs text-white/60 lg:block">
          <p className="truncate font-semibold text-white">{user.name}</p>
          <p>{user.role.toLowerCase()}</p>
          <div className="mt-3 flex gap-3"><Link href="/" className="hover:text-white">View store</Link><form action={logout}><button className="hover:text-white">Log out</button></form></div>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 pb-16 pt-16 sm:px-8 lg:pt-8">{children}</main>
    </div>
  );
}
