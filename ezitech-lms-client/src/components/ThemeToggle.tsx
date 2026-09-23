import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`focus-ring relative flex size-10 items-center justify-center overflow-hidden rounded-xl text-ink-600 transition-colors hover:bg-ink-100 ${className ?? ''}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'moon' : 'sun'}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {isDark ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
