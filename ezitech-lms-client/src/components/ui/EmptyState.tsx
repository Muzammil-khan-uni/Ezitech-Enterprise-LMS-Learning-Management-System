import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-surface/60 px-6 py-14 text-center"
    >
      <div className="mb-4 flex size-16 animate-float items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold text-ink-800">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
