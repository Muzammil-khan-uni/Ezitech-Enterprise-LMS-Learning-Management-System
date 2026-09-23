import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, ClipboardList, FileCheck2 } from 'lucide-react';
import { useCourseAssessments } from '../assessmentsApi';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { ListRowSkeleton } from '@/components/ui/Skeleton';

export default function MentorCourseAssessmentsPage() {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const { data: assessments, isLoading } = useCourseAssessments(courseId);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('mentorDashboard.gradeTitle')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('mentorDashboard.gradeSubtitle')}</p>

      <div className="mt-6 space-y-3">
        {isLoading && <ListRowSkeleton />}
        {!isLoading && (assessments ?? []).length === 0 && (
          <EmptyState icon={<ClipboardCheck className="size-7" />} title={t('mentorDashboard.noAssessments')} />
        )}
        {(assessments ?? []).map((assessment, i) => {
          const isQuiz = assessment.assessmentType === 'quiz';
          return (
            <motion.div key={assessment._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}>
              <Card className="flex flex-wrap items-center gap-3 p-4">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${isQuiz ? 'bg-brand-50 text-brand-600' : 'bg-accent-400/15 text-accent-600'}`}>
                  {isQuiz ? <ClipboardList className="size-5" /> : <FileCheck2 className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display font-bold text-ink-900" title={assessment.title}>{assessment.title}</div>
                  <Badge tone="neutral" className="mt-1">
                    {assessment.assessmentType.replace('_', ' ')}
                  </Badge>
                </div>
                <Link to={`/grading/${assessment._id}`}>
                  <Button size="sm">{t('mentorDashboard.openSubmissions')}</Button>
                </Link>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
