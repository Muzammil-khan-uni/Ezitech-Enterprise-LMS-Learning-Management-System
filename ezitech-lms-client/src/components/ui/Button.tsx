import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<'button'>>,
    Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-brand text-white shadow-lift hover:brightness-110 focus-visible:ring-brand-400',
  secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  ghost: 'bg-transparent text-ink-600 hover:bg-ink-100',
  outline: 'bg-surface text-ink-700 border border-ink-200 hover:border-brand-300 hover:text-brand-700',
  danger: 'bg-rose-600 text-white shadow-soft hover:bg-rose-700',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5 gap-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 gap-2 rounded-xl',
  lg: 'text-base px-6 py-3 gap-2.5 rounded-xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, iconLeft, iconRight, className, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -1, scale: disabled ? 1 : 1.015 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center font-semibold transition-colors duration-200 focus-ring disabled:opacity-60 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : iconLeft}
        {children}
        {!isLoading && iconRight}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

export default Button;
