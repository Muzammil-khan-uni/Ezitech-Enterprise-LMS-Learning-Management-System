import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ClipboardList, FileCheck2, ArrowRight, ListChecks } from 'lucide-react';
import { useCourseAssessments } from '../assessmentsApi';
import { Badge, Card, EmptyState } from '@/components/ui';
import { ListRowSkeleton } from '@/components/ui/Skeleton';

export default function CourseAssessmentsPage() {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const { data: assessments, isLoading } = useCourseAssessments(courseId);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('assessments.title')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('assessments.subtitle')}</p>

      <div className="mt-6 space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <ListRowSkeleton key={i} />)}

        {!isLoading && assessments?.length === 0 && (
          <EmptyState icon={<ListChecks className="size-7" />} title={t('assessments.noneYet')} />
        )}

        {assessments?.map((a, i) => {
          const isQuiz = a.assessmentType === 'quiz';
          return (
            <motion.div key={a._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={isQuiz ? `/quizzes/${a._id}` : `/submissions/${a._id}`}>
                <Card hoverLift className="flex items-center gap-4 p-4">
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${isQuiz ? 'bg-brand-50 text-brand-600' : 'bg-accent-400/15 text-accent-600'}`}>
                    {isQuiz ? <ClipboardList className="size-5" /> : <FileCheck2 className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display truncate font-bold text-ink-900" title={a.title}>{a.title}</div>
                    <Badge tone="neutral">{a.assessmentType.replace('_', ' ')}</Badge>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-ink-300" />
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
