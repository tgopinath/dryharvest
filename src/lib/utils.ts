import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** paise -> "₹1,299" or "₹54.70" */
export function formatINR(paise: number | null | undefined) {
  if (paise == null) return '—';
  return (paise % 100 === 0 ? inr0 : inr2).format(paise / 100);
}
/** "129.50" -> 12950 */
export function rupeesToPaise(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[,₹\s]/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
export function paiseToRupees(p: number | null | undefined) {
  return p == null ? '' : (p / 100).toFixed(2).replace(/\.00$/, '');
}

/** Discount only when MRP is genuinely above price. */
export function discountPercent(price: number, mrp: number) {
  if (!mrp || mrp <= price) return 0;
  return Math.floor(((mrp - price) / mrp) * 100);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function formatDate(d: Date | string | null | undefined, withTime = false) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Asia/Kolkata',
  });
}

export function titleCase(s: string) {
  return s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  PLACED: 'Order placed',
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return requested',
  RETURNED: 'Returned',
};

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];

export function csvEscape(v: unknown) {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCSV(rows: Record<string, unknown>[], columns?: string[]) {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(','))].join('\n');
}
