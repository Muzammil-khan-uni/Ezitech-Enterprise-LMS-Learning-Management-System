import { motion } from 'framer-motion';
import { Info, Layers, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlans, useMySubscription, useSubscribe } from '../subscriptionsApi';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/features/config/configApi';
import PublicHeader from '@/components/layout/PublicHeader';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { CourseCardSkeleton } from '@/components/ui/Skeleton';

export default function SubscriptionPlansPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { data: plans, isLoading } = usePlans();
  const { data: mySubscription } = useMySubscription();
  const subscribe = useSubscribe();
  const { paymentsEnabled } = useAppConfig();

  if (!paymentsEnabled) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <EmptyState icon={<Info className="size-7" />} title={t('subscriptionPlans.unavailable')} description={t('subscriptionPlans.unavailableDesc')} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <div className="bg-gradient-brand relative overflow-hidden px-4 py-14 text-white sm:px-6">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] [background-size:26px_26px]" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Layers className="size-3.5" />
            {t('subscriptionPlans.badge')}
          </span>
          <h1 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('subscriptionPlans.title')}</h1>
          <p className="mt-2 max-w-xl text-white/80">{t('subscriptionPlans.subtitle')}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {mySubscription && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800"
          >
            <Sparkles className="size-4" />
            {t('subscriptionPlans.activeUntil', { plan: mySubscription.plan.name, date: new Date(mySubscription.expiresAt).toLocaleDateString() })}
          </motion.div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && plans?.length === 0 && <EmptyState icon={<Layers className="size-7" />} title={t('subscriptionPlans.noPlansYet')} />}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans?.map((plan, i) => (
            <motion.div key={plan._id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card hoverLift className="flex h-full flex-col p-6">
                <h2 className="font-display text-lg font-bold text-ink-900">{plan.name}</h2>
                <p className="mt-1 flex-1 text-sm text-ink-500">{plan.description}</p>
                <div className="mt-4 font-display text-3xl font-extrabold text-ink-900">
                  ${plan.price}
                  <span className="text-sm font-medium text-ink-400"> {t('subscriptionPlans.durationDays', { days: plan.durationDays })}</span>
                </div>
                <Badge tone="neutral" className="mt-2 self-start">
                  {plan.coursesIncluded === 'all' ? t('subscriptionPlans.unlocksAll') : t('subscriptionPlans.unlocksSelected')}
                </Badge>
                {isAuthenticated && (
                  <Button
                    className="mt-5 w-full"
                    isLoading={subscribe.isPending}
                    onClick={() => subscribe.mutate(plan._id)}
                  >
                    {subscribe.isPending ? t('subscriptionPlans.subscribing') : t('subscriptionPlans.subscribe')}
                  </Button>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 flex items-center gap-1.5 text-xs text-ink-400">
          <Info className="size-3.5" />
          {t('subscriptionPlans.noPaymentNote')}
        </p>
      </div>
    </div>
  );
}
