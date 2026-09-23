import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-2xl border border-ink-100 bg-surface p-5 shadow-lift sm:p-6 ${
              size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-xl' : 'max-w-md'
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink-900">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="focus-ring flex size-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100"
              >
                <X className="size-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
