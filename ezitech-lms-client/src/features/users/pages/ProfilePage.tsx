import { motion, MotionConfig } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';
import { getApiError } from '@/lib/apiError';
import { useMyProfile, useUpdateProfile } from '../usersApi';
import AboutSection from '../components/AboutSection';
import AccountSection from '../components/AccountSection';
import CompletionCard from '../components/CompletionCard';
import ContactSection from '../components/ContactSection';
import EducationSection from '../components/EducationSection';
import ProfileHero from '../components/ProfileHero';
import ProfileSkeleton from '../components/ProfileSkeleton';
import SkillsSection from '../components/SkillsSection';
import SocialSection from '../components/SocialSection';
import { ToastStack } from '../components/Toast';
import { useToasts } from '../components/useToasts';
import { staggerContainer, type SaveProfile } from '../components/profileUtils';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, isFetching } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const { toasts, notify, dismiss } = useToasts();

  const save: SaveProfile = async (patch, successMessage) => {
    try {
      await updateProfile.mutateAsync(patch);
      notify('success', successMessage);
      return true;
    } catch (error) {
      notify('error', getApiError(error, t('profile.toast.saveFailed')));
      return false;
    }
  };

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !data) {
    return (
      <EmptyState
        icon={<AlertCircle className="size-8" />}
        title={t('profile.loadError')}
        action={
          <Button onClick={() => refetch()} isLoading={isFetching} iconLeft={<RefreshCw className="size-4" />}>
            {t('profile.retry')}
          </Button>
        }
      />
    );
  }

  const { user } = data;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-5">
        <ProfileHero user={user} notify={notify} />

        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-start">
          <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-5 xl:col-span-8">
            <AboutSection user={user} onSave={save} className="order-2 lg:order-none" />
            <EducationSection user={user} onSave={save} className="order-4 lg:order-none" />
            <SkillsSection user={user} onSave={save} className="order-5 lg:order-none" />
          </div>
          <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:gap-5 xl:col-span-4">
            <CompletionCard user={user} className="order-1 lg:order-none" />
            <ContactSection user={user} onSave={save} notify={notify} className="order-3 lg:order-none" />
            <SocialSection user={user} onSave={save} className="order-6 lg:order-none" />
            <AccountSection user={user} className="order-7 lg:order-none" />
          </div>
        </div>
      </motion.div>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </MotionConfig>
  );
}
