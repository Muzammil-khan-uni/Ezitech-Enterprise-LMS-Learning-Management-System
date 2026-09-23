import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { clsx } from 'clsx';
export interface ToastItem {
  id: number;
  type: 'success' | 'error';
  message: string;
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:end-6 sm:bottom-6 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            role={toast.type === 'error' ? 'alert' : 'status'}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={clsx(
              'pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-surface p-3.5 shadow-lift sm:w-96',
              toast.type === 'success'
                ? 'border-emerald-200 dark:border-emerald-500/30'
                : 'border-rose-200 dark:border-rose-500/30'
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-500" />
            )}
            <p className="min-w-0 flex-1 text-sm font-medium text-ink-800">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss"
              className="focus-ring flex size-6 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
