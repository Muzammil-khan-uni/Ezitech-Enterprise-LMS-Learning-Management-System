import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useAssessment,
  useCreateAssessment,
  useUpdateAssessment,
} from '../assessmentsApi';
import type { AssessmentInput, AssessmentType } from '../types';
import QuestionBuilder, { newQuestion, type BuilderQuestion } from '../components/QuestionBuilder';
import { Button, Card, Input } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';

const selectClass =
  'focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface';
const labelClass = 'mb-1.5 block text-sm font-semibold text-ink-700';

export default function AssessmentFormPage() {
  const { t } = useTranslation();
  const { courseId, assessmentId } = useParams<{ courseId?: string; assessmentId?: string }>();
  const isEditMode = !!assessmentId;
  const navigate = useNavigate();

  const { data: existing, isLoading: isLoadingExisting } = useAssessment(assessmentId);
  const createAssessment = useCreateAssessment();
  const updateAssessment = useUpdateAssessment(assessmentId ?? '');

  const [assessmentType, setAssessmentType] = useState<AssessmentType>('quiz');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evaluationType, setEvaluationType] = useState<'auto' | 'manual' | 'hybrid'>('auto');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [dueDate, setDueDate] = useState('');

  const [questions, setQuestions] = useState<BuilderQuestion[]>([newQuestion()]);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('');
  const [passingScorePercent, setPassingScorePercent] = useState('60');

  const [instructions, setInstructions] = useState('');
  const [allowedLanguages, setAllowedLanguages] = useState('javascript, python');
  const [starterCode, setStarterCode] = useState('');
  const [allowedFileTypes, setAllowedFileTypes] = useState('.zip, .pdf');
  const [rubric, setRubric] = useState('');
  const [maxScore, setMaxScore] = useState('100');

  useEffect(() => {
    if (!existing) return;
    setAssessmentType(existing.assessmentType);
    setTitle(existing.title);
    setDescription(existing.description ?? '');
    setEvaluationType(existing.evaluationType);
    setMaxAttempts(String(existing.maxAttempts ?? 1));
    setDueDate(existing.dueDate ? existing.dueDate.slice(0, 10) : '');
    if (existing.questions) {
      setQuestions(
        existing.questions.map((q) => ({
          questionText: q.questionText,
          type: q.type,
          points: q.points,
          options: q.options.map((o) => ({ text: o.text, isCorrect: !!o.isCorrect })),
        }))
      );
    }
    setTimeLimitMinutes(existing.timeLimitMinutes ? String(existing.timeLimitMinutes) : '');
    setPassingScorePercent(existing.passingScorePercent !== undefined ? String(existing.passingScorePercent) : '60');
    setInstructions(existing.instructions ?? '');
    setAllowedLanguages((existing.allowedLanguages ?? []).join(', ') || 'javascript, python');
    setStarterCode(existing.starterCode ?? '');
    setAllowedFileTypes((existing.allowedFileTypes ?? []).join(', ') || '.zip, .pdf');
    setRubric(existing.rubric ?? '');
    setMaxScore(existing.maxScore !== undefined ? String(existing.maxScore) : '100');
  }, [existing]);

  function buildPayload(isPublished: boolean): AssessmentInput {
    const base: AssessmentInput = {
      title,
      description,
      evaluationType,
      maxAttempts: Number(maxAttempts) || 1,
      dueDate: dueDate || null,
      isPublished,
    };

    if (assessmentType === 'quiz') {
      return {
        ...base,
        assessmentType,
        questions: questions.map((q) => ({
          questionText: q.questionText,
          type: q.type,
          points: q.points,
          options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
        })),
        timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
        passingScorePercent: Number(passingScorePercent) || 60,
      };
    }

    if (assessmentType === 'coding_assignment') {
      return {
        ...base,
        assessmentType,
        instructions,
        allowedLanguages: allowedLanguages.split(',').map((l) => l.trim()).filter(Boolean),
        starterCode,
        maxScore: Number(maxScore) || 100,
      };
    }

    return {
      ...base,
      assessmentType,
      instructions,
      allowedFileTypes: allowedFileTypes.split(',').map((t) => t.trim()).filter(Boolean),
      rubric,
      maxScore: Number(maxScore) || 100,
    };
  }

  async function handleSubmit(e: FormEvent, publish: boolean) {
    e.preventDefault();
    const payload = buildPayload(publish);

    if (isEditMode) {
      await updateAssessment.mutateAsync(payload);
      navigate(-1);
    } else {
      const created = await createAssessment.mutateAsync({ ...payload, course: courseId! });
      navigate(`/instructor/courses/${created.course}/assessments`);
    }
  }

  const isSaving = createAssessment.isPending || updateAssessment.isPending;
  const saveError = createAssessment.isError || updateAssessment.isError;

  if (isEditMode && isLoadingExisting) {
    return (
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="focus-ring mb-4 flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-700"
      >
        <ArrowLeft className="size-4" /> {t('common.back')}
      </button>

      <h1 className="font-display flex items-center gap-2 text-2xl font-extrabold text-ink-900 sm:text-3xl">
        <ClipboardList className="size-6 text-brand-500" />
        {isEditMode ? t('assessments.editAssessmentTitle') : t('assessments.newAssessmentTitle')}
      </h1>

      <form className="mt-6 space-y-6">
        <Card className="space-y-4 p-6">
          {!isEditMode && (
            <div>
              <label className={labelClass}>{t('assessments.type')}</label>
              <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value as AssessmentType)} className={selectClass}>
                <option value="quiz">{t('assessments.typeQuiz')}</option>
                <option value="coding_assignment">{t('assessments.typeCodingAssignment')}</option>
                <option value="project">{t('assessments.typeProject')}</option>
              </select>
            </div>
          )}

          <Input label={t('courseAuthoring.title')} value={title} onChange={(e) => setTitle(e.target.value)} required />

          <div>
            <label className={labelClass}>{t('courseAuthoring.description')}</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t('assessments.evaluation')}</label>
              <select value={evaluationType} onChange={(e) => setEvaluationType(e.target.value as typeof evaluationType)} className={selectClass}>
                <option value="auto">{t('assessments.evaluationAuto')}</option>
                <option value="manual">{t('assessments.evaluationManual')}</option>
                <option value="hybrid">{t('assessments.evaluationHybrid')}</option>
              </select>
            </div>
            <Input label={t('assessments.maxAttempts')} type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
          </div>

          <Input label={t('assessments.dueDateOptional')} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Card>

        {assessmentType === 'quiz' && (
          <div>
            <div className="mb-3 flex flex-wrap gap-3">
              <div className="w-40">
                <Input
                  label={t('assessments.timeLimitMinutes')}
                  type="number"
                  min={1}
                  placeholder={t('assessments.untimed')}
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Input
                  label={t('assessments.passingScorePercent')}
                  type="number"
                  min={0}
                  max={100}
                  value={passingScorePercent}
                  onChange={(e) => setPassingScorePercent(e.target.value)}
                />
              </div>
            </div>
            <h2 className="font-display mb-3 text-lg font-bold text-ink-800">{t('assessments.questions')}</h2>
            <QuestionBuilder questions={questions} onChange={setQuestions} />
          </div>
        )}

        {assessmentType === 'coding_assignment' && (
          <Card className="space-y-4 p-6">
            <div>
              <label className={labelClass}>{t('courseAuthoring.instructions')}</label>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                required
                className="focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface"
              />
            </div>
            <Input
              label={t('assessments.allowedLanguages')}
              value={allowedLanguages}
              onChange={(e) => setAllowedLanguages(e.target.value)}
            />
            <div>
              <label className={labelClass}>{t('assessments.starterCode')}</label>
              <textarea
                rows={6}
                value={starterCode}
                onChange={(e) => setStarterCode(e.target.value)}
                className="focus-ring w-full rounded-xl border border-ink-200 bg-zinc-950 px-3.5 py-2.5 font-mono text-sm text-emerald-300 transition-colors"
              />
            </div>
            <Input label={t('assessments.maxScore')} type="number" min={1} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
          </Card>
        )}

        {assessmentType === 'project' && (
          <Card className="space-y-4 p-6">
            <div>
              <label className={labelClass}>Instructions</label>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                required
                className="focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface"
              />
            </div>
            <Input
              label={t('assessments.allowedFileTypes')}
              value={allowedFileTypes}
              onChange={(e) => setAllowedFileTypes(e.target.value)}
            />
            <div>
              <label className={labelClass}>{t('assessments.rubricOptional')}</label>
              <textarea
                rows={3}
                value={rubric}
                onChange={(e) => setRubric(e.target.value)}
                className="focus-ring w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface"
              />
            </div>
            <Input label={t('assessments.maxScore')} type="number" min={1} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
          </Card>
        )}

        {saveError && (
          <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-300">
            <AlertCircle className="size-3.5" /> {t('assessments.saveFailedHint')}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" isLoading={isSaving} onClick={(e) => handleSubmit(e as unknown as FormEvent, false)}>
            {t('assessments.saveAsDraft')}
          </Button>
          <Button type="button" isLoading={isSaving} onClick={(e) => handleSubmit(e as unknown as FormEvent, true)}>
            {t('assessments.saveAndPublish')}
          </Button>
        </div>
      </form>
    </div>
  );
}
