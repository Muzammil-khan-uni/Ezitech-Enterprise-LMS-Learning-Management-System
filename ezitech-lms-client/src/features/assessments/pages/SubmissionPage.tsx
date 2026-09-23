import { FormEvent, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Code2, Link2, MailCheck, TimerIcon } from 'lucide-react';
import { useAssessment, useStartAttempt, useSubmitAttempt } from '../assessmentsApi';
import type { Submission } from '../types';
import { Button, Card, Input } from '@/components/ui';

export default function SubmissionPage() {
  const { t } = useTranslation();
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { data: assessment } = useAssessment(assessmentId);
  const startAttempt = useStartAttempt();
  const submitAttempt = useSubmitAttempt();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [fileUrl, setFileUrl] = useState('');
  const [result, setResult] = useState<Submission | null>(null);

  useEffect(() => {
    if (!assessmentId) return;
    startAttempt.mutate(assessmentId, {
      onSuccess: (data) => setSubmissionId(data.submission._id),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!submissionId) return;

    const payload = assessment?.assessmentType === 'coding_assignment' ? { code, language } : { fileUrl };
    const submission = await submitAttempt.mutateAsync({ submissionId, payload });
    setResult(submission);
  }

  if (startAttempt.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300">
            <AlertCircle className="size-7" />
          </span>
          <p role="alert" className="text-sm font-medium text-ink-600">
            {t('assessments.couldNotStart')}
          </p>
        </div>
      </div>
    );
  }

  if (!assessment || !submissionId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} className="text-brand-500">
          <TimerIcon className="size-8" />
        </motion.div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <Card className="p-8 text-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}
              className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-400"
            >
              <MailCheck className="size-8" />
            </motion.span>
            <h1 className="font-display mt-4 text-xl font-bold text-ink-900">{assessment.title}</h1>
            <p className="mt-2 text-sm text-ink-500">{t('assessments.awaitingReview')}</p>
            <Button className="mt-6 w-full" variant="outline" iconLeft={<ArrowLeft className="size-4" />} onClick={() => navigate(-1)}>
              {t('assessments.backToCourse')}
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">{assessment.title}</h1>
          <p className="mt-1.5 text-sm text-ink-500">{assessment.instructions}</p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onSubmit={handleSubmit}
          className="mt-6"
        >
          <Card className="space-y-4 p-5">
            {assessment.assessmentType === 'coding_assignment' ? (
              <>
                <Input
                  id="language"
                  label={t('assessments.language')}
                  icon={<Code2 className="size-4" />}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
                <div>
                  <label htmlFor="code" className="mb-1.5 block text-sm font-semibold text-ink-700">
                    {t('assessments.code')}
                  </label>
                  <textarea
                    id="code"
                    rows={14}
                    className="focus-ring w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 font-mono text-sm text-emerald-300 transition-colors focus-visible:ring-offset-0"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              <Input
                id="fileUrl"
                label={t('assessments.submissionFileUrl')}
                type="url"
                icon={<Link2 className="size-4" />}
                placeholder="https://…"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                required
              />
            )}
            <Button type="submit" isLoading={submitAttempt.isPending} className="w-full">
              {submitAttempt.isPending ? t('assessments.submitting') : t('assessments.submit')}
            </Button>
          </Card>
        </motion.form>
      </div>
    </div>
  );
}
