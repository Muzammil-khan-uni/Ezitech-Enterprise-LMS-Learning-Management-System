import { HTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, keyof HTMLMotionProps<'div'>>, HTMLMotionProps<'div'> {
  hoverLift?: boolean;
  glass?: boolean;
}

export default function Card({ hoverLift = false, glass = false, className, children, ...props }: CardProps) {
  return (
    <motion.div
      className={clsx(
        'rounded-2xl border border-ink-100 bg-surface shadow-soft',
        glass && 'glass border-white/60',
        hoverLift && 'transition-shadow duration-300',
        className
      )}
      whileHover={hoverLift ? { y: -4, boxShadow: 'var(--shadow-lift)' } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
