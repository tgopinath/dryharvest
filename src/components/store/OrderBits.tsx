import { Badge } from '@/components/ui';
import { ORDER_STATUS_LABEL, cn, formatDate } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  const tone = ({ PENDING_PAYMENT: 'yellow', PLACED: 'blue', CONFIRMED: 'blue', PACKED: 'blue', SHIPPED: 'blue', DELIVERED: 'green', CANCELLED: 'gray', RETURN_REQUESTED: 'yellow', RETURNED: 'gray' } as const)[status as 'PLACED'] ?? 'neutral';
  return <Badge tone={tone}>{ORDER_STATUS_LABEL[status] ?? status}</Badge>;
}
export function PaymentBadge({ status }: { status: string }) {
  const tone = ({ PAID: 'green', PENDING: 'yellow', FAILED: 'red', REFUNDED: 'gray', PARTIALLY_REFUNDED: 'yellow' } as const)[status as 'PAID'] ?? 'neutral';
  return <Badge tone={tone}>{status.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</Badge>;
}

const STEPS = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'] as const;

export function OrderProgress({ status, events }: { status: string; events: { status: string | null; createdAt: Date }[] }) {
  if (['CANCELLED', 'PENDING_PAYMENT'].includes(status)) return null;
  const idx = status === 'RETURN_REQUESTED' || status === 'RETURNED' ? 4 : STEPS.indexOf(status as (typeof STEPS)[number]);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const at = events.find((e) => e.status === s)?.createdAt;
        return (
          <li key={s} className="text-center" aria-current={i === idx ? 'step' : undefined}>
            <div className={cn('h-1.5 rounded-full', i <= idx ? 'bg-brand' : 'bg-brand-ink/10')} />
            <p className={cn('mt-2 text-xs font-semibold', i <= idx ? 'text-brand-deep' : 'text-brand-ink/45')}>{ORDER_STATUS_LABEL[s]}</p>
            {at && <p className="text-[11px] text-brand-ink/50">{formatDate(at)}</p>}
          </li>
        );
      })}
    </ol>
  );
}
