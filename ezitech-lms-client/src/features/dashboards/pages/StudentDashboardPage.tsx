import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, Award, CalendarClock, FileCheck2, ArrowRight } from 'lucide-react';
import { useStudentDashboard } from '../dashboardsApi';
import { Card, EmptyState, StatCard } from '@/components/ui';
import { ListRowSkeleton } from '@/components/ui/Skeleton';

export default function StudentDashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useStudentDashboard();

  return (
    <>
      <div className="mb-7">
          <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('dashboard.myDashboard')}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('dashboard.subtitle')}</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <ListRowSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label={t('dashboard.activeCourses')} value={data.activeCourses.length} icon={<BookOpen className="size-5" />} tone="brand" delay={0} />
              <StatCard label={t('dashboard.completed')} value={data.completedCourses.length} icon={<CheckCircle2 className="size-5" />} tone="success" delay={0.06} />
              <StatCard label={t('dashboard.certificates')} value={data.certificatesCount} icon={<Award className="size-5" />} tone="accent" delay={0.12} />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="mb-3 flex items-center gap-2">
                  <CalendarClock className="size-[18px] text-brand-500" />
                  <h2 className="font-display text-lg font-bold text-ink-800">{t('dashboard.upcomingDeadlines')}</h2>
                </div>
                {data.upcomingDeadlines.length === 0 ? (
                  <EmptyState icon={<CalendarClock className="size-6" />} title={t('dashboard.nothingDueSoon')} description={t('dashboard.allCaughtUp')} />
                ) : (
                  <Card className="divide-y divide-ink-100 overflow-hidden">
                    {data.upcomingDeadlines.map((a: any) => (
                      <Link
                        key={a._id}
                        to={a.assessmentType === 'quiz' ? `/quizzes/${a._id}` : `/submissions/${a._id}`}
                        className="group flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-brand-50/60"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-ink-800" title={a.title}>{a.title}</div>
                          <div className="truncate text-xs text-ink-500">
                            {a.course?.title} · {t('dashboard.dueOn', { date: new Date(a.dueDate).toLocaleDateString() })}
                          </div>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
                      </Link>
                    ))}
                  </Card>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="mb-3 flex items-center gap-2">
                  <FileCheck2 className="size-[18px] text-brand-500" />
                  <h2 className="font-display text-lg font-bold text-ink-800">{t('dashboard.recentSubmissions')}</h2>
                </div>
                {data.recentSubmissions.length === 0 ? (
                  <EmptyState icon={<FileCheck2 className="size-6" />} title={t('dashboard.noSubmissionsYet')} description={t('dashboard.gradedWorkAppearsHere')} />
                ) : (
                  <Card className="divide-y divide-ink-100 overflow-hidden">
                    {data.recentSubmissions.map((s: any) => (
                      <div key={s._id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-ink-800" title={s.assessment?.title}>{s.assessment?.title}</div>
                          <div className="truncate text-xs capitalize text-ink-500">{s.status}</div>
                        </div>
                        {s.score !== undefined && s.score !== null && (
                          <span className="font-display shrink-0 text-sm font-bold text-brand-600">
                            {s.score}/{s.maxScore}
                          </span>
                        )}
                      </div>
                    ))}
                  </Card>
                )}
              </motion.div>
            </div>
          </>
        )}
    </>
  );
}
