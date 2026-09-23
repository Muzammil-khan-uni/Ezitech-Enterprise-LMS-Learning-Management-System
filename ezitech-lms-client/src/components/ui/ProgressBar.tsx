import { motion } from 'framer-motion';
import { clsx } from 'clsx';

export default function ProgressBar({
  value,
  className,
  trackClassName,
}: {
  value: number;
  className?: string;
  trackClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full bg-ink-100', trackClassName)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={clsx('h-full rounded-full bg-gradient-brand', className)}
      />
    </div>
  );
}
