import { redirect } from 'next/navigation';
export default async function OrderRedirect({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<Record<string, string>> }) {
  const { number } = await params;
  const q = new URLSearchParams(await searchParams).toString();
  redirect(`/account/orders/${encodeURIComponent(number)}${q ? `?${q}` : ''}`);
}
