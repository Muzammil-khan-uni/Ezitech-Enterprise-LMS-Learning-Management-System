import { Check, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input } from '@/components/ui';

export interface BuilderOption {
  text: string;
  isCorrect: boolean;
}

export interface BuilderQuestion {
  questionText: string;
  type: 'mcq' | 'multi_select' | 'true_false';
  points: number;
  options: BuilderOption[];
}

const selectClass =
  'focus-ring rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface';

function emptyOptions(type: BuilderQuestion['type']): BuilderOption[] {
  if (type === 'true_false') {
    return [
      { text: 'True', isCorrect: true },
      { text: 'False', isCorrect: false },
    ];
  }
  return [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ];
}

export function newQuestion(): BuilderQuestion {
  return { questionText: '', type: 'mcq', points: 1, options: emptyOptions('mcq') };
}

export default function QuestionBuilder({
  questions,
  onChange,
}: {
  questions: BuilderQuestion[];
  onChange: (questions: BuilderQuestion[]) => void;
}) {
  const { t } = useTranslation();
  function updateQuestion(index: number, patch: Partial<BuilderQuestion>) {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function changeType(index: number, type: BuilderQuestion['type']) {
    updateQuestion(index, { type, options: emptyOptions(type) });
  }

  function toggleCorrect(qIndex: number, optIndex: number) {
    const q = questions[qIndex];
    const isSingleAnswer = q.type === 'mcq' || q.type === 'true_false';
    const options = q.options.map((o, i) =>
      isSingleAnswer ? { ...o, isCorrect: i === optIndex } : i === optIndex ? { ...o, isCorrect: !o.isCorrect } : o
    );
    updateQuestion(qIndex, { options });
  }

  function updateOptionText(qIndex: number, optIndex: number, text: string) {
    const options = questions[qIndex].options.map((o, i) => (i === optIndex ? { ...o, text } : o));
    updateQuestion(qIndex, { options });
  }

  function addOption(qIndex: number) {
    updateQuestion(qIndex, { options: [...questions[qIndex].options, { text: '', isCorrect: false }] });
  }

  function removeOption(qIndex: number, optIndex: number) {
    updateQuestion(qIndex, { options: questions[qIndex].options.filter((_, i) => i !== optIndex) });
  }

  function removeQuestion(index: number) {
    onChange(questions.filter((_, i) => i !== index));
  }

  function addQuestion() {
    onChange([...questions, newQuestion()]);
  }

  return (
    <div className="space-y-4">
      {questions.map((q, qIndex) => (
        <motion.div key={qIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="space-y-3 p-4">
            <div className="flex items-start gap-2">
              <span className="mt-2.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                {qIndex + 1}
              </span>
              <div className="flex-1">
                <Input
                  label={t('assessments.questionLabel')}
                  value={q.questionText}
                  onChange={(e) => updateQuestion(qIndex, { questionText: e.target.value })}
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => removeQuestion(qIndex)}
                aria-label={t('assessments.removeQuestion')}
                className="focus-ring mt-7 flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-3 ps-8">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-500">{t('assessments.type')}</label>
                <select value={q.type} onChange={(e) => changeType(qIndex, e.target.value as BuilderQuestion['type'])} className={selectClass}>
                  <option value="mcq">{t('assessments.singleChoice')}</option>
                  <option value="multi_select">{t('assessments.multipleChoice')}</option>
                  <option value="true_false">{t('assessments.trueFalse')}</option>
                </select>
              </div>
              <div className="w-24">
                <Input
                  label={t('assessments.pointsLabel')}
                  type="number"
                  min={0}
                  value={q.points}
                  onChange={(e) => updateQuestion(qIndex, { points: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-1.5 ps-8">
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCorrect(qIndex, optIndex)}
                    aria-label={t('assessments.markCorrect')}
                    className={`flex size-5 shrink-0 items-center justify-center border transition-colors ${
                      q.type === 'multi_select' ? 'rounded-[5px]' : 'rounded-full'
                    } ${opt.isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-ink-300'}`}
                  >
                    {opt.isCorrect && <Check className="size-3" strokeWidth={3} />}
                  </button>
                  <input
                    value={opt.text}
                    onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                    placeholder={t('assessments.optionNumber', { number: optIndex + 1 })}
                    disabled={q.type === 'true_false'}
                    className="focus-ring flex-1 rounded-lg border border-ink-200 bg-ink-50/60 px-3 py-1.5 text-sm text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface disabled:opacity-70"
                  />
                  {q.type !== 'true_false' && q.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(qIndex, optIndex)}
                      aria-label={t('assessments.removeOption')}
                      className="focus-ring flex size-7 shrink-0 items-center justify-center rounded-lg text-ink-300 hover:bg-ink-100 hover:text-ink-500"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {q.type !== 'true_false' && (
                <button
                  type="button"
                  onClick={() => addOption(qIndex)}
                  className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  <Plus className="size-3.5" /> {t('assessments.addOption')}
                </button>
              )}
            </div>
          </Card>
        </motion.div>
      ))}

      <Button type="button" variant="outline" onClick={addQuestion} iconLeft={<Plus className="size-4" />}>
        {t('assessments.addQuestion')}
      </Button>
    </div>
  );
}
