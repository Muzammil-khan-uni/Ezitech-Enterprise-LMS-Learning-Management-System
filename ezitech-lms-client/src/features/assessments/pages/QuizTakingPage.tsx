import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Check, PartyPopper, TimerIcon, XCircle } from 'lucide-react';
import { useStartAttempt, useSubmitAttempt } from '../assessmentsApi';
import type { Assessment, Submission } from '../types';
import { Button, Card, ProgressBar } from '@/components/ui';

type AnswerMap = Record<string, number[]>;

export default function QuizTakingPage() {
  const { t } = useTranslation();
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const startAttempt = useStartAttempt();
  const submitAttempt = useSubmitAttempt();

  const [attempt, setAttempt] = useState<{ submission: Submission; assessment: Assessment } | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [result, setResult] = useState<Submission | null>(null);

  useEffect(() => {
    if (!assessmentId) return;
    startAttempt.mutate(assessmentId, {
      onSuccess: (data) => {
        setAttempt(data);
        if (data.assessment.timeLimitMinutes) {
          setSecondsLeft(data.assessment.timeLimitMinutes * 60);
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function toggleOption(questionId: string, optionIndex: number, isMultiSelect: boolean) {
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      if (isMultiSelect) {
        const next = current.includes(optionIndex)
          ? current.filter((i) => i !== optionIndex)
          : [...current, optionIndex];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: [optionIndex] };
    });
  }

  async function handleSubmit() {
    if (!attempt) return;
    const quizAnswers = Object.entries(answers).map(([questionId, selectedOptionIndexes]) => ({
      questionId,
      selectedOptionIndexes,
    }));
    const submission = await submitAttempt.mutateAsync({
      submissionId: attempt.submission._id,
      payload: { quizAnswers },
    });
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

  if (!attempt) {
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
              className={`mx-auto flex size-16 items-center justify-center rounded-2xl ${result.passed ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400'}`}
            >
              {result.passed ? <PartyPopper className="size-8" /> : <XCircle className="size-8" />}
            </motion.span>
            <h1 className="font-display mt-4 text-xl font-bold text-ink-900">{attempt.assessment.title}</h1>
            <p className="font-display mt-2 text-4xl font-extrabold text-ink-900">
              {result.score}
              <span className="text-lg font-medium text-ink-400"> / {result.maxScore}</span>
            </p>
            <p className={`mt-1 text-sm font-bold ${result.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
              {result.passed ? t('assessments.passed') : t('assessments.notPassed')}
            </p>
            <Button className="mt-6 w-full" variant="outline" iconLeft={<ArrowLeft className="size-4" />} onClick={() => navigate(-1)}>
              {t('assessments.backToCourse')}
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  const questions = attempt.assessment.questions ?? [];
  const answeredCount = questions.filter((q) => (answers[q._id] || []).length > 0).length;
  const isLowTime = secondsLeft !== null && secondsLeft <= 60;

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="glass sticky top-0 z-10 border-b border-ink-100 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display truncate text-lg font-bold text-ink-900" title={attempt.assessment.title}>{attempt.assessment.title}</h1>
            <p className="text-xs text-ink-500">
              {t('assessments.answered', { answered: answeredCount, total: questions.length })}
            </p>
          </div>
          {secondsLeft !== null && (
            <motion.div
              animate={isLowTime ? { scale: [1, 1.06, 1] } : {}}
              transition={{ duration: 1, repeat: isLowTime ? Infinity : 0 }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold tabular-nums ${
                isLowTime ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-brand-50 text-brand-700'
              }`}
            >
              <TimerIcon className="size-4" />
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
            </motion.div>
          )}
        </div>
        <div className="mx-auto mt-3 max-w-2xl">
          <ProgressBar value={questions.length ? (answeredCount / questions.length) * 100 : 0} />
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8 sm:px-8">
        {questions.map((q, i) => (
          <motion.div key={q._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.04 }}>
            <Card className="p-5">
              <p className="font-display font-bold text-ink-800">
                {i + 1}. {q.questionText}
                <span className="ms-2 text-xs font-normal text-ink-400">
                  ({t('assessments.points', { count: q.points })})
                </span>
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, idx) => {
                  const isSelected = (answers[q._id] || []).includes(idx);
                  return (
                    <label
                      key={opt._id}
                      className={`focus-ring flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors ${
                        isSelected ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-200 text-ink-700 hover:border-ink-300'
                      }`}
                    >
                      <input
                        type={q.type === 'multi_select' ? 'checkbox' : 'radio'}
                        name={q._id}
                        checked={isSelected}
                        onChange={() => toggleOption(q._id, idx, q.type === 'multi_select')}
                        className="sr-only"
                      />
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center border ${
                          q.type === 'multi_select' ? 'rounded-[5px]' : 'rounded-full'
                        } ${isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-300'}`}
                      >
                        {isSelected && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      {opt.text}
                    </label>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        ))}

        <Button className="w-full" size="lg" isLoading={submitAttempt.isPending} onClick={handleSubmit}>
          {submitAttempt.isPending ? t('assessments.submitting') : t('assessments.submitQuiz')}
        </Button>
      </div>
    </div>
  );
}
