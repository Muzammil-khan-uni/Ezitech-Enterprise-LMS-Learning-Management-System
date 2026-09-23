import { ReactNode } from 'react';
import { clsx } from 'clsx';

type Tone = 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const toneClasses: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 dark:text-brand-300 dark:ring-brand-500/30',
  accent: 'bg-accent-400/15 text-accent-600 ring-1 ring-inset ring-accent-400/30 dark:text-accent-400',
  success:
    'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
  warning:
    'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
  danger:
    'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
  neutral: 'bg-ink-100 text-ink-600 ring-1 ring-inset ring-ink-200',
};

export default function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
        toneClasses[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
