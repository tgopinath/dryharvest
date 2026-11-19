import * as React from 'react';
import { cn } from '@/lib/utils';

type BtnVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'yellow';
const variants: Record<BtnVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-deep',
  yellow: 'bg-brand-yellow text-brand-ink hover:bg-[#e9ad1f]',
  secondary: 'bg-brand-pale text-brand-deep hover:bg-[#dfeedb]',
  outline: 'border border-brand-ink/15 bg-white text-brand-ink hover:border-brand hover:text-brand',
  ghost: 'text-brand-ink hover:bg-brand-ink/5',
  danger: 'bg-red-700 text-white hover:bg-red-800',
};
const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' };

export function buttonClass(variant: BtnVariant = 'primary', size: keyof typeof sizes = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap',
    variants[variant], sizes[size], className,
  );
}

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: keyof typeof sizes }>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => (
    <button ref={ref} className={buttonClass(variant, size, className)} {...props} />
  ),
);
Button.displayName = 'Button';

export const inputClass =
  'block w-full rounded-xl border border-brand-ink/15 bg-white px-3.5 py-2.5 text-sm text-brand-ink placeholder:text-brand-ink/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-brand-ink/5 aria-[invalid=true]:border-red-600';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(inputClass, className)} {...p} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(inputClass, 'min-h-24', className)} {...p} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(inputClass, 'pr-8', className)} {...p} />
));
Select.displayName = 'Select';

export function Field({ label, htmlFor, hint, error, children, className }: { label: string; htmlFor?: string; hint?: string; error?: string | null; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-brand-ink">{label}</label>
      {children}
      {error ? <p className="text-xs text-red-700">{error}</p> : hint ? <p className="text-xs text-brand-ink/60">{hint}</p> : null}
    </div>
  );
}

export function Badge({ tone = 'neutral', className, children }: { tone?: 'neutral' | 'green' | 'yellow' | 'red' | 'blue' | 'gray'; className?: string; children: React.ReactNode }) {
  const t = {
    neutral: 'bg-brand-ink/5 text-brand-ink/80', green: 'bg-brand-pale text-brand-deep', yellow: 'bg-[#FDF0CC] text-[#7a5600]',
    red: 'bg-red-50 text-red-800', blue: 'bg-sky-50 text-sky-800', gray: 'bg-gray-100 text-gray-600',
  }[tone];
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', t, className)}>{children}</span>;
}

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-brand-ink/10 bg-white', className)} {...p} />;
}

export function Alert({ tone = 'info', children, className }: { tone?: 'info' | 'error' | 'success' | 'warn'; children: React.ReactNode; className?: string }) {
  const t = { info: 'bg-brand-pale text-brand-deep border-brand/20', error: 'bg-red-50 text-red-800 border-red-200', success: 'bg-brand-pale text-brand-deep border-brand/30', warn: 'bg-[#FDF6E3] text-[#6b4c00] border-[#F5BC32]/50' }[tone];
  return <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-xl border px-4 py-3 text-sm', t, className)}>{children}</div>;
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-ink/15 bg-white/60 px-6 py-14 text-center">
      <svg aria-hidden width="44" height="44" viewBox="0 0 48 48" className="mb-3 text-brand/60"><path fill="currentColor" d="M40 6C22 6 10 16 10 30c0 3 .6 5.6 1.6 8L6 43.6 8.4 46l5.4-5.4C16.4 42 19.6 43 23 43c14 0 21-13 17-37Zm-21 30-2.8-2.8C24 25.4 30 20 36 16c-5 5-10 11-17 20Z"/></svg>
      <p className="font-display text-xl">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-brand-ink/65">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={cn('inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} />;
}
