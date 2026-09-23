import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, GraduationCap, PartyPopper, Route as RouteIcon } from 'lucide-react';
import { usePaths, useMyPaths, useEnrollInPath } from '../learningPathsApi';
import { useAuth } from '@/hooks/useAuth';
import PublicHeader from '@/components/layout/PublicHeader';
import { Badge, Button, Card, EmptyState, ProgressBar } from '@/components/ui';
import { CourseCardSkeleton } from '@/components/ui/Skeleton';

export default function LearningPathsPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { data: paths, isLoading } = usePaths({ isPublished: true });
  const { data: myPaths } = useMyPaths();
  const enroll = useEnrollInPath();

  const myPathById = new Map((myPaths ?? []).map((p) => [p.path._id, p]));

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <div className="bg-gradient-brand relative overflow-hidden px-4 py-14 text-white sm:px-6">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] [background-size:26px_26px]" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <RouteIcon className="size-3.5" />
            {t('learningPaths.badge')}
          </span>
          <h1 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('learningPaths.title')}</h1>
          <p className="mt-2 max-w-xl text-white/80">{t('learningPaths.subtitle')}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {isLoading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && paths?.length === 0 && (
          <EmptyState icon={<RouteIcon className="size-7" />} title={t('learningPaths.noPathsYet')} />
        )}

        <div className="space-y-5">
          {paths?.map((path, i) => {
            const myProgress = myPathById.get(path._id);
            const isComplete = myProgress && myProgress.completedCount === myProgress.totalCount && myProgress.totalCount > 0;

            return (
              <motion.div key={path._id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.06 }}>
                <Card className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold text-ink-900">{path.title}</h2>
                      <p className="mt-1 text-sm text-ink-500">{path.description}</p>
                    </div>
                    <Badge tone="brand">{path.level}</Badge>
                  </div>

                  <ol className="mt-4 space-y-2">
                    {[...path.courses]
                      .sort((a, b) => a.order - b.order)
                      .map((c, idx) => {
                        const courseStatus = myProgress?.courses.find((pc) => pc.course._id === c.course._id)?.status;
                        return (
                          <li key={c.course._id}>
                            <Link
                              to={`/courses/${c.course._id}`}
                              className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                            >
                              <span
                                className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold group-hover:bg-brand-100 group-hover:text-brand-700 ${
                                  courseStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              {c.course.title}
                              {courseStatus === 'completed' && <PartyPopper className="size-3.5 text-emerald-500" />}
                            </Link>
                          </li>
                        );
                      })}
                  </ol>

                  {isAuthenticated && (
                    <div className="mt-4">
                      {myProgress?.hasStarted ? (
                        <div>
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <span className="font-semibold text-ink-700">
                              {t('learningPaths.coursesComplete', { completed: myProgress.completedCount, total: myProgress.totalCount })}
                            </span>
                            <span className="font-bold text-brand-600">{myProgress.percent}%</span>
                          </div>
                          <ProgressBar value={myProgress.percent} className={isComplete ? '!bg-emerald-500' : undefined} />
                          {!isComplete && myProgress.nextCourse && (
                            <Link
                              to={`/courses/${myProgress.nextCourse.course._id}`}
                              className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                            >
                              {t('learningPaths.continue', { course: myProgress.nextCourse.course.title })}
                              <ArrowRight className="size-3.5" />
                            </Link>
                          )}
                          {isComplete && (
                            <Badge tone="success" icon={<PartyPopper className="size-3" />} className="mt-2.5">
                              {t('learningPaths.pathComplete')}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          isLoading={enroll.isPending}
                          iconLeft={<GraduationCap className="size-4" />}
                          onClick={() => enroll.mutate(path._id)}
                        >
                          {t('learningPaths.startThisPath')}
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
