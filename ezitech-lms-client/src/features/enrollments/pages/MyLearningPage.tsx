import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, PartyPopper, Route as RouteIcon } from 'lucide-react';
import { useMyEnrollments } from '../enrollmentsApi';
import { useMyPaths } from '@/features/learning-paths/learningPathsApi';
import { Badge, Card, EmptyState, ProgressBar } from '@/components/ui';
import { ListRowSkeleton } from '@/components/ui/Skeleton';

export default function MyLearningPage() {
  const { t } = useTranslation();
  const { data: enrollments, isLoading } = useMyEnrollments();
  const { data: myPaths, isLoading: isLoadingPaths } = useMyPaths();

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('myLearning.title')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('myLearning.subtitle')}</p>

      {(isLoadingPaths || (myPaths && myPaths.length > 0)) && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <RouteIcon className="size-[18px] text-brand-500" />
            <h2 className="font-display text-lg font-bold text-ink-800">{t('learningPaths.inProgress')}</h2>
          </div>
          <div className="space-y-3">
            {isLoadingPaths && <ListRowSkeleton />}
            {myPaths?.map((p, i) => {
              const isComplete = p.completedCount === p.totalCount && p.totalCount > 0;
              return (
                <motion.div key={p.path._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display truncate text-base font-bold text-ink-900" title={p.path.title}>{p.path.title}</h3>
                      <Badge tone={isComplete ? 'success' : 'brand'}>{p.path.level}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <ProgressBar value={p.percent} className={isComplete ? '!bg-emerald-500' : undefined} />
                      <span className="shrink-0 text-sm font-bold text-ink-700">
                        {p.completedCount}/{p.totalCount}
                      </span>
                    </div>
                    {isComplete ? (
                      <Badge tone="success" icon={<PartyPopper className="size-3" />} className="mt-2.5">
                        {t('learningPaths.pathComplete')}
                      </Badge>
                    ) : (
                      p.nextCourse && (
                        <Link
                          to={`/courses/${p.nextCourse.course._id}`}
                          className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                        >
                          {t('learningPaths.continue', { course: p.nextCourse.course.title })}
                          <ArrowRight className="size-3.5" />
                        </Link>
                      )
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-3 mt-8 flex items-center gap-2">
        <BookOpen className="size-[18px] text-brand-500" />
        <h2 className="font-display text-lg font-bold text-ink-800">{t('myLearning.courses')}</h2>
      </div>
      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <ListRowSkeleton key={i} />)}

        {!isLoading && enrollments?.length === 0 && (
          <EmptyState
            icon={<BookOpen className="size-7" />}
            title={t('myLearning.noEnrollments')}
            description={t('myLearning.browseCatalogPrompt')}
          />
        )}

        {enrollments?.map((e, i) => {
          const course = typeof e.course === 'string' ? null : e.course;
          const isCompleted = e.status === 'completed';
          return (
            <motion.div
              key={e._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.05 }}
            >
              <Link to={`/courses/${course?._id}`}>
                <Card hoverLift className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display truncate text-base font-bold text-ink-900" title={course?.title}>{course?.title}</h3>
                    <Badge tone={isCompleted ? 'success' : 'brand'} icon={isCompleted ? <PartyPopper className="size-3" /> : undefined}>
                      {e.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={e.progressPercent} className={isCompleted ? '!bg-emerald-500' : undefined} />
                    <span className="shrink-0 text-sm font-bold text-ink-700">{e.progressPercent}%</span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
