import { InputHTMLAttributes, forwardRef, ReactNode, useId } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, icon, error, id, className, ...props }, ref) => {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink-700">
        {label}
      </label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>}
        <input
          id={inputId}
          ref={ref}
          className={clsx(
            'w-full rounded-xl border bg-ink-50/60 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 transition-all duration-200',
            'focus-ring focus-visible:bg-surface',
            icon ? 'ps-10 pe-3.5' : 'px-3.5',
            error ? 'border-rose-300 focus-visible:ring-rose-300' : 'border-ink-200 hover:border-ink-300',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';

export default Input;
