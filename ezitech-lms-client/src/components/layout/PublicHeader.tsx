import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from '@/features/notifications/components/NotificationBell';
import { Button } from '@/components/ui';

export default function PublicHeader() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV_LINKS = [
    { to: '/courses', label: t('nav.browseCourses') },
    { to: '/learning-paths', label: t('nav.learningPaths') },
    { to: '/plans', label: t('nav.plans') },
  ];

  return (
    <header className="glass sticky top-0 z-20 border-b border-ink-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="bg-gradient-brand flex size-9 items-center justify-center rounded-xl text-white shadow-lift">
            <Sparkles className="size-[18px]" />
          </div>
          <span className="font-display text-lg font-extrabold tracking-tight text-ink-900">
            Ezitech<span className="text-gradient">LMS</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-ink-600 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="transition-colors hover:text-brand-600">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex sm:items-center sm:gap-1.5">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <Link to="/">
                <Button size="sm" variant="secondary" className="ms-1 hidden sm:inline-flex">
                  {t('common.goToApp')}
                </Button>
              </Link>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm" className="ms-1 hidden sm:inline-flex">
                {t('auth.login')}
              </Button>
            </Link>
          )}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={t('common.menu')}
            className="focus-ring flex size-10 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 md:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-ink-100 md:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-2 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100 hover:text-brand-700"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex items-center gap-2 border-t border-ink-100 px-2 pt-3">
                <ThemeToggle />
                <LanguageSwitcher />
                {!isAuthenticated && (
                  <Link to="/login" className="ml-auto">
                    <Button size="sm">{t('auth.login')}</Button>
                  </Link>
                )}
                {isAuthenticated && (
                  <Link to="/" className="ml-auto">
                    <Button size="sm" variant="secondary">
                      {t('common.goToApp')}
                    </Button>
                  </Link>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
