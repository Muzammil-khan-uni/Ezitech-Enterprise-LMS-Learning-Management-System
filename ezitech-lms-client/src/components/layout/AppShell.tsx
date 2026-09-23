import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  GraduationCap,
  Route as RouteIcon,
  BookMarked,
  Award,
  BarChart3,
  ShieldCheck,
  UserRound,
  MessagesSquare,
  Menu,
  X,
  Sparkles,
  LogOut,
  Tag,
  Ticket,
  Layers,
  FileBadge,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLogout } from '@/features/auth/authApi';
import NotificationBell from '@/features/notifications/components/NotificationBell';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import VerifyEmailBanner from '@/components/VerifyEmailBanner';
import { Avatar } from '@/components/ui';
import { useAppConfig } from '@/features/config/configApi';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const logout = useLogout();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const canManageCourses = user && ['instructor', 'course_manager', 'admin'].includes(user.role);
  const canManageCategories = user && ['course_manager', 'admin'].includes(user.role);

  const dashboardPath =
    user?.role === 'admin'
      ? '/dashboard/admin'
      : user?.role === 'mentor'
        ? '/dashboard/mentor'
        : ['instructor', 'course_manager'].includes(user?.role || '')
          ? '/dashboard/instructor'
          : '/dashboard/student';

  const mainNav: NavItem[] = [
    { to: dashboardPath, label: t('nav.dashboard'), icon: <LayoutDashboard className="size-[18px]" /> },
    { to: '/courses', label: t('nav.browseCourses'), icon: <GraduationCap className="size-[18px]" /> },
    { to: '/learning-paths', label: t('nav.learningPaths'), icon: <RouteIcon className="size-[18px]" /> },
    { to: '/my-learning', label: t('nav.myLearning'), icon: <BookMarked className="size-[18px]" /> },
    { to: '/my-certificates', label: t('nav.myCertificates'), icon: <Award className="size-[18px]" /> },
    { to: '/statistics', label: t('nav.statistics'), icon: <BarChart3 className="size-[18px]" /> },
  ];

  if (canManageCourses) {
    mainNav.push({ to: '/feedback-reports', label: t('nav.feedbackReports'), icon: <MessagesSquare className="size-[18px]" /> });
  }

  const { paymentsEnabled } = useAppConfig();
  const adminNav: NavItem[] = [];
  if (isAdmin) adminNav.push({ to: '/admin/users', label: t('nav.users'), icon: <UsersRound className="size-[18px]" /> });
  if (canManageCategories) adminNav.push({ to: '/admin/categories', label: t('nav.categories'), icon: <Tag className="size-[18px]" /> });
  if (canManageCategories)
    adminNav.push({ to: '/admin/learning-paths', label: t('nav.learningPaths'), icon: <RouteIcon className="size-[18px]" /> });
  if (isAdmin && paymentsEnabled) adminNav.push({ to: '/admin/coupons', label: t('nav.coupons'), icon: <Ticket className="size-[18px]" /> });
  if (isAdmin && paymentsEnabled) adminNav.push({ to: '/admin/plans', label: t('nav.subscriptionPlans'), icon: <Layers className="size-[18px]" /> });
  if (isAdmin)
    adminNav.push({ to: '/admin/certificate-templates', label: t('nav.certificateTemplates'), icon: <FileBadge className="size-[18px]" /> });

  const bottomNav: NavItem[] = [
    { to: '/profile', label: t('nav.myProfile'), icon: <UserRound className="size-[18px]" /> },
    { to: '/security', label: t('nav.security'), icon: <ShieldCheck className="size-[18px]" /> },
  ];

  function isActive(to: string) {
    return location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-lift">
          <Sparkles className="size-[18px]" />
        </div>
        <span className="font-display text-lg font-extrabold tracking-tight text-ink-900">
          Ezitech<span className="text-gradient">LMS</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {mainNav.map((item) => (
          <SidebarLink key={item.to} item={item} active={isActive(item.to)} onClick={() => setMobileOpen(false)} />
        ))}

        {(canManageCourses || canManageCategories) && (
          <div className="mt-2 flex items-center gap-2 px-3 pb-1 pt-4">
            {canManageCourses && (
              <Link
                to="/instructor/courses/new"
                onClick={() => setMobileOpen(false)}
                className="focus-ring flex-1 rounded-lg bg-brand-50 px-2.5 py-2 text-center text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100"
              >
                + {t('nav.createCourse')}
              </Link>
            )}
          </div>
        )}

        {adminNav.length > 0 && (
          <>
            <div className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-ink-400">{t('nav.admin')}</div>
            {adminNav.map((item) => (
              <SidebarLink key={item.to} item={item} active={isActive(item.to)} onClick={() => setMobileOpen(false)} />
            ))}
          </>
        )}

        <div className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-ink-400">{t('nav.account')}</div>
        {bottomNav.map((item) => (
          <SidebarLink key={item.to} item={item} active={isActive(item.to)} onClick={() => setMobileOpen(false)} />
        ))}
      </nav>

      <div className="border-t border-ink-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Link
            to="/profile"
            onClick={() => setMobileOpen(false)}
            aria-label={t('nav.myProfile')}
            className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg"
          >
            <Avatar name={user?.name} src={user?.avatar?.url} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink-800" title={user?.name}>{user?.name}</div>
              <div className="truncate text-xs capitalize text-ink-400" title={user?.role.replace('_', ' ')}>{user?.role.replace('_', ' ')}</div>
            </div>
          </Link>
          <button
            onClick={() => logout.mutate()}
            aria-label={t('nav.signOut')}
            className="focus-ring flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 border-e border-ink-100 bg-surface/90 backdrop-blur lg:block">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: i18n.dir() === 'rtl' ? 280 : -280 }}
              animate={{ x: 0 }}
              exit={{ x: i18n.dir() === 'rtl' ? 280 : -280 }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="fixed inset-y-0 start-0 z-50 w-72 bg-surface shadow-2xl lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="focus-ring absolute end-3 top-3 flex size-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100"
              >
                <X className="size-4" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:ps-64">
        <header className="glass sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-ink-100 px-4 sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="focus-ring flex size-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden text-sm text-ink-500 lg:block">
            {t('common.signedInAs')} <span className="font-semibold text-ink-700">{user?.name}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <LanguageSwitcher />
            <NotificationBell />
            <Link to="/profile" aria-label={t('nav.myProfile')} className="focus-ring ms-1 rounded-full transition-transform hover:scale-105">
              <Avatar name={user?.name} src={user?.avatar?.url} size="sm" />
            </Link>
          </div>
        </header>

        <VerifyEmailBanner />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`focus-ring group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? 'text-brand-700' : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800'
      }`}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-brand-50"
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        />
      )}
      <span className="relative z-10">{item.icon}</span>
      <span className="relative z-10 truncate" title={item.label}>{item.label}</span>
      {active && <span className="absolute end-2 z-10 size-1.5 rounded-full bg-brand-500" />}
    </Link>
  );
}
