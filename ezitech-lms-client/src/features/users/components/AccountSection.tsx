import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, CalendarDays, Clock, ShieldAlert, ShieldCheck, UserCog, ChevronRight } from 'lucide-react';
import type { ProfileUser } from '../usersApi';
import SectionCard, { InfoRow } from './SectionCard';

export default function AccountSection({ user, className }: { user: ProfileUser; className?: string }) {
  const { t, i18n } = useTranslation();

  function formatDate(value?: string, withTime = false) {
    if (!value) return t('profile.account.never');
    return new Intl.DateTimeFormat(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(new Date(value));
  }

  return (
    <SectionCard
      id="profile-account"
      icon={<UserCog className="size-5" />}
      title={t('profile.account.title')}
      subtitle={t('profile.account.subtitle')}
      className={className}
    >
      <div className="space-y-2.5">
        <InfoRow icon={<CalendarDays className="size-4" />} label={t('profile.account.memberSince')}>
          {formatDate(user.createdAt)}
        </InfoRow>
        <InfoRow icon={<Clock className="size-4" />} label={t('profile.account.lastSignIn')}>
          {formatDate(user.lastLoginAt, true)}
        </InfoRow>
        <InfoRow
          icon={user.mfaEnabled ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
          label={t('profile.account.twoFactor')}
        >
          <span className="inline-flex items-center gap-1.5">
            {user.mfaEnabled ? (
              <>
                <BadgeCheck className="size-4 text-emerald-500" />
                {t('profile.account.enabled')}
              </>
            ) : (
              t('profile.account.disabled')
            )}
          </span>
        </InfoRow>
      </div>
      <motion.div whileHover={{ x: 3 }} className="mt-4">
        <Link
          to="/security"
          className="focus-ring group flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-100 dark:text-brand-300"
        >
          {t('profile.account.manageSecurity')}
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
        </Link>
      </motion.div>
    </SectionCard>
  );
}
