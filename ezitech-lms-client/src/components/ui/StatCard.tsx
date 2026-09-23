import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

export default function StatCard({
  label,
  value,
  icon,
  tone = 'brand',
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: 'brand' | 'accent' | 'success';
  delay?: number;
}) {
  const toneBg: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    accent: 'bg-accent-400/15 text-accent-600',
    success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className={clsx('flex size-12 shrink-0 items-center justify-center rounded-xl', toneBg[tone])}>{icon}</div>
      <div className="min-w-0">
        <div className="font-display text-2xl font-bold text-ink-900 tabular-nums">{value}</div>
        <div className="truncate text-sm font-medium text-ink-500" title={label}>{label}</div>
      </div>
    </motion.div>
  );
}
