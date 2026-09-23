import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Eye, EyeOff, FileCheck2, ListChecks, PlusCircle, Trash2 } from 'lucide-react';
import { useCourseAssessments, useUpdateAssessment, useDeleteAssessment } from '../assessmentsApi';
import type { Assessment } from '../types';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { ListRowSkeleton } from '@/components/ui/Skeleton';

function AssessmentRow({ assessment, courseId }: { assessment: Assessment; courseId: string }) {
  const { t } = useTranslation();
  const updateAssessment = useUpdateAssessment(assessment._id);
  const deleteAssessment = useDeleteAssessment(courseId);
  const isQuiz = assessment.assessmentType === 'quiz';

  function handleDelete() {
    if (window.confirm(t('assessments.confirmDelete', { title: assessment.title }))) {
      deleteAssessment.mutate(assessment._id);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${isQuiz ? 'bg-brand-50 text-brand-600' : 'bg-accent-400/15 text-accent-600'}`}>
          {isQuiz ? <ClipboardList className="size-5" /> : <FileCheck2 className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-ink-900">{assessment.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{assessment.assessmentType.replace('_', ' ')}</Badge>
            <Badge tone={assessment.isPublished ? 'success' : 'warning'}>{assessment.isPublished ? t('assessments.published') : t('assessments.draft')}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            isLoading={updateAssessment.isPending}
            iconLeft={assessment.isPublished ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            onClick={() => updateAssessment.mutate({ isPublished: !assessment.isPublished })}
          >
            {assessment.isPublished ? t('assessments.unpublish') : t('assessments.publish')}
          </Button>
          <Link to={`/instructor/assessments/${assessment._id}/edit`}>
            <Button size="sm" variant="secondary">
              {t('assessments.edit')}
            </Button>
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleteAssessment.isPending}
            aria-label={t('assessments.deleteAssessmentAction')}
            className="focus-ring flex size-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </Card>
    </motion.div>
  );
}

export default function AssessmentManagePage() {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const { data: assessments, isLoading } = useCourseAssessments(courseId);

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('assessments.manageTitle')}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('assessments.manageSubtitle')}</p>
        </div>
        <Link to={`/instructor/courses/${courseId}/assessments/new`}>
          <Button iconLeft={<PlusCircle className="size-4" />}>{t('assessments.newAssessment')}</Button>
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <ListRowSkeleton key={i} />)}

        {!isLoading && assessments?.length === 0 && (
          <EmptyState
            icon={<ListChecks className="size-7" />}
            title={t('assessments.noAssessmentsYet')}
            description={t('assessments.createFirstAssessment')}
          />
        )}

        {assessments?.map((a) => (
          <AssessmentRow key={a._id} assessment={a} courseId={courseId!} />
        ))}
      </div>
    </div>
  );
}
