import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ClipboardCheck, Mail, UserRound } from 'lucide-react';
import { usePendingSubmissions, useGradeSubmission } from '../assessmentsApi';
import { Badge, Button, Card, EmptyState, Input } from '@/components/ui';
import { ListRowSkeleton } from '@/components/ui/Skeleton';

function GradeForm({ assessmentId, submissionId }: { assessmentId: string; submissionId: string }) {
  const { t } = useTranslation();
  const grade = useGradeSubmission(assessmentId);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [justGraded, setJustGraded] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await grade.mutateAsync({ submissionId, score: Number(score), feedback });
    setJustGraded(true);
  }

  if (justGraded) {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600"
      >
        <CheckCircle2 className="size-4" /> {t('assessments.gradedScore', { score })}
      </motion.p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="w-full sm:w-24">
        <Input label={t('assessments.score')} type="number" value={score} onChange={(e) => setScore(e.target.value)} required />
      </div>
      <div className="flex-1">
        <Input label={t('assessments.feedback')} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={t('assessments.optionalFeedback')} />
      </div>
      <Button type="submit" isLoading={grade.isPending} size="md">
        {grade.isPending ? t('assessments.saving') : t('assessments.grade')}
      </Button>
    </form>
  );
}

export default function GradingPage() {
  const { t } = useTranslation();
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { data: submissions, isLoading } = usePendingSubmissions(assessmentId);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('assessments.pendingSubmissions')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('assessments.gradeSubtitle')}</p>

      <div className="mt-6 space-y-4">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <ListRowSkeleton key={i} />)}

        {!isLoading && submissions?.length === 0 && (
          <EmptyState icon={<ClipboardCheck className="size-7" />} title={t('assessments.nothingWaiting')} description={t('dashboard.allCaughtUp')} />
        )}

        {submissions?.map((s, i) => (
          <motion.div key={s._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                  <UserRound className="size-4 text-ink-400" />
                  {s.student.name}
                </span>
                <span className="flex items-center gap-1 text-xs text-ink-400">
                  <Mail className="size-3" />
                  {s.student.email}
                </span>
                <Badge tone="neutral">{t('assessments.attemptNumber', { number: s.attemptNumber })}</Badge>
              </div>
              <GradeForm assessmentId={assessmentId!} submissionId={s._id} />
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
