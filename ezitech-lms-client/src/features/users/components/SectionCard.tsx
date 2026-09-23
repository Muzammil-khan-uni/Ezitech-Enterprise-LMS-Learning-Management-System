import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '@/components/ui';
import { fadeUp } from './profileUtils';

export type Tint = 'brand' | 'accent' | 'emerald' | 'sky' | 'rose';

const tintClasses: Record<Tint, string> = {
  brand: 'bg-brand-50 text-brand-600 dark:text-brand-300',
  accent: 'bg-accent-400/15 text-accent-600 dark:text-accent-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
};

export default function SectionCard({
  id,
  icon,
  title,
  subtitle,
  action,
  tint = 'brand',
  className,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  tint?: Tint;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      id={id}
      variants={fadeUp}
      className={clsx('scroll-mt-24 p-4 transition-colors duration-300 hover:border-brand-200 sm:p-6', className)}
    >
      <div className="flex items-start gap-3">
        <motion.div
          whileHover={{ rotate: -8, scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className={clsx('flex size-10 shrink-0 items-center justify-center rounded-xl', tintClasses[tint])}
        >
          {icon}
        </motion.div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-bold text-ink-900 sm:text-lg">{title}</h2>
          {subtitle && <p className="text-xs text-ink-500 sm:text-sm">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function IconButton({
  label,
  onClick,
  tone = 'neutral',
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: 'neutral' | 'danger';
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      className={clsx(
        'focus-ring flex size-9 items-center justify-center rounded-lg text-ink-400 transition-colors disabled:opacity-50',
        tone === 'danger'
          ? 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300'
          : 'hover:bg-brand-50 hover:text-brand-600 dark:hover:text-brand-300'
      )}
    >
      {children}
    </motion.button>
  );
}

export function AddPrompt({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="focus-ring group flex w-full items-center gap-3 rounded-xl border border-dashed border-ink-300 bg-ink-50/60 px-4 py-4 text-start text-sm font-semibold text-ink-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:hover:text-brand-300"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-brand-500 shadow-soft">
        {icon}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      <Plus className="size-4 shrink-0 transition-transform group-hover:rotate-90" />
    </motion.button>
  );
}

export function InfoRow({
  icon,
  label,
  actions,
  children,
}: {
  icon: ReactNode;
  label: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-ink-50/70 p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-brand-600 shadow-soft dark:text-brand-300">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{label}</div>
        <div className="break-words text-sm font-semibold text-ink-800">{children}</div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
    </div>
  );
}
