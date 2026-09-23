import { Link } from 'react-router-dom';
import { BookOpen, Users, ClipboardCheck, Pencil, DollarSign, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useInstructorDashboard, useInstructorEarnings } from '../dashboardsApi';
import { Card, EmptyState, ProgressBar, StatCard } from '@/components/ui';
import { Skeleton, ListRowSkeleton } from '@/components/ui/Skeleton';

export default function InstructorDashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useInstructorDashboard();
  const { data: earnings, isLoading: isLoadingEarnings } = useInstructorEarnings();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('instructorDashboard.title')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('instructorDashboard.subtitle')}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('instructorDashboard.courses')} value={data.totalCourses} icon={<BookOpen className="size-5" />} delay={0} />
        <StatCard label={t('instructorDashboard.students')} value={data.totalStudents} icon={<Users className="size-5" />} tone="accent" delay={0.06} />
        <StatCard label={t('instructorDashboard.pendingGrading')} value={data.pendingGradingCount} icon={<ClipboardCheck className="size-5" />} tone="success" delay={0.12} />
      </div>

      <h2 className="font-display mb-3 mt-9 text-lg font-bold text-ink-800">{t('instructorDashboard.earnings')}</h2>
      {isLoadingEarnings && <ListRowSkeleton />}
      {!isLoadingEarnings && earnings && earnings.courses.length === 0 && (
        <EmptyState
          icon={<Wallet className="size-7" />}
          title={earnings.paymentsEnabled === false ? t('instructorDashboard.paymentsOffTitle') : t('instructorDashboard.noEarningsYet')}
          description={earnings.paymentsEnabled === false ? t('instructorDashboard.paymentsOffDesc') : t('instructorDashboard.noEarningsYetDesc')}
        />
      )}
      {!isLoadingEarnings && earnings && earnings.courses.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-gradient-brand relative overflow-hidden rounded-2xl p-5 text-white shadow-lift">
              <span className="flex items-center gap-2 text-sm font-medium text-white/80">
                <Wallet className="size-4" />
                {t('instructorDashboard.yourShare', { percent: earnings.commissionPercent })}
              </span>
              <div className="font-display mt-1.5 text-3xl font-extrabold">${earnings.totalInstructorEarnings.toFixed(2)}</div>
            </div>
            <StatCard
              label={t('instructorDashboard.grossRevenue')}
              value={`$${earnings.totalGrossRevenue.toFixed(2)}`}
              icon={<DollarSign className="size-5" />}
              delay={0.05}
            />
          </div>

          <Card className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-start text-xs font-bold uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 text-start">{t('adminDashboard.colCourse')}</th>
                  <th className="px-4 py-3 text-start">{t('instructorDashboard.colPurchases')}</th>
                  <th className="px-4 py-3 text-start">{t('instructorDashboard.colGrossRevenue')}</th>
                  <th className="px-4 py-3 text-start">{t('instructorDashboard.colYourEarnings')}</th>
                </tr>
              </thead>
              <tbody>
                {earnings.courses.map((c) => (
                  <tr key={c.course._id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                    <td className="px-4 py-3 font-semibold text-ink-800">{c.course.title}</td>
                    <td className="px-4 py-3 text-ink-600">{c.purchases}</td>
                    <td className="px-4 py-3 text-ink-600">${c.grossRevenue.toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold text-brand-600">${c.instructorEarnings.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-2 text-xs text-ink-400">{t('instructorDashboard.subscriptionNote')}</p>
        </>
      )}

      <h2 className="font-display mb-3 mt-9 text-lg font-bold text-ink-800">{t('instructorDashboard.yourCourses')}</h2>
      <div className="space-y-3">
        {data.courseBreakdown.map((c: any, i: number) => (
          <Card key={c.course._id} hoverLift className="p-4 sm:p-5" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                to={`/instructor/courses/${c.course._id}/edit`}
                className="group flex items-center gap-2 font-display font-bold text-ink-900 hover:text-brand-700"
              >
                {c.course.title}
                <Pencil className="size-3.5 text-ink-300 group-hover:text-brand-500" />
              </Link>
              <div className="flex gap-5 text-sm">
                <span className="text-ink-500">
                  <span className="font-bold text-ink-800">{c.enrolledCount}</span> {t('instructorDashboard.enrolledSuffix')}
                </span>
                <span className="text-ink-500">
                  <span className="font-bold text-ink-800">{c.completedCount}</span> {t('instructorDashboard.completedSuffix')}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="mb-1 flex justify-between text-xs font-medium text-ink-400">
                  <span>{t('instructorDashboard.avgProgress')}</span>
                  <span>{c.averageProgress}%</span>
                </div>
                <ProgressBar value={c.averageProgress} />
              </div>
              <span className="shrink-0 text-xs font-bold text-emerald-600">{t('instructorDashboard.percentComplete', { percent: c.completionRate })}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
