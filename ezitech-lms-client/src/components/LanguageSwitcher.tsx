import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe, Check, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ur', label: 'اردو', short: 'UR' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleChange(code: string) {
    i18n.changeLanguage(code);
    localStorage.setItem('uiLanguage', code);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Language"
        className="focus-ring flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-600 transition-colors hover:bg-ink-100"
      >
        <Globe className="size-4" />
        {current.short}
        <ChevronDown className={`size-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="glass absolute end-0 top-11 z-20 w-40 overflow-hidden rounded-xl border border-ink-100 py-1 shadow-lift"
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleChange(lang.code)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                {lang.label}
                {lang.code === current.code && <Check className="size-4 text-brand-600" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
