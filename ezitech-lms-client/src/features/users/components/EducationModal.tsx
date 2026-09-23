import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, CalendarDays, School } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import type { EducationEntry } from '../usersApi';

const MIN_YEAR = 1950;

function EducationForm({
  entry,
  onSubmit,
  onClose,
  saving,
}: {
  entry: EducationEntry | null;
  onSubmit: (entry: EducationEntry) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const maxYear = new Date().getFullYear() + 10;
  const [school, setSchool] = useState(entry?.school ?? '');
  const [degree, setDegree] = useState(entry?.degree ?? '');
  const [field, setField] = useState(entry?.field ?? '');
  const [startYear, setStartYear] = useState(entry?.startYear ? String(entry.startYear) : '');
  const [endYear, setEndYear] = useState(entry?.endYear ? String(entry.endYear) : '');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function parseYear(value: string): number | null | undefined {
    if (!value.trim()) return null;
    const year = Number(value);
    return Number.isInteger(year) && year >= MIN_YEAR && year <= maxYear ? year : undefined;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const start = parseYear(startYear);
    const end = parseYear(endYear);
    if (school.trim().length < 2) next.school = t('profile.education.schoolRequired');
    if (start === undefined) next.startYear = t('profile.education.yearInvalid', { min: MIN_YEAR, max: maxYear });
    if (end === undefined) next.endYear = t('profile.education.yearInvalid', { min: MIN_YEAR, max: maxYear });
    if (start && end && end < start) next.endYear = t('profile.education.yearOrder');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      ...(entry?._id ? { _id: entry._id } : {}),
      school: school.trim(),
      degree: degree.trim(),
      field: field.trim(),
      startYear: start ?? null,
      endYear: end ?? null,
      description: description.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={t('profile.education.school')}
        icon={<School className="size-4" />}
        value={school}
        maxLength={120}
        autoFocus
        error={errors.school}
        onChange={(e) => setSchool(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t('profile.education.degree')} value={degree} maxLength={120} onChange={(e) => setDegree(e.target.value)} />
        <Input
          label={t('profile.education.field')}
          icon={<BookOpen className="size-4" />}
          value={field}
          maxLength={120}
          onChange={(e) => setField(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('profile.education.startYear')}
          icon={<CalendarDays className="size-4" />}
          inputMode="numeric"
          placeholder="2019"
          value={startYear}
          error={errors.startYear}
          onChange={(e) => setStartYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
        <Input
          label={t('profile.education.endYear')}
          icon={<CalendarDays className="size-4" />}
          inputMode="numeric"
          placeholder={t('profile.education.present')}
          value={endYear}
          error={errors.endYear}
          onChange={(e) => setEndYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      </div>
      <div>
        <label htmlFor="edu-description" className="mb-1.5 block text-sm font-semibold text-ink-700">
          {t('profile.education.description')}
        </label>
        <textarea
          id="edu-description"
          rows={3}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="focus-ring w-full resize-y rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-800 transition-colors hover:border-ink-300 focus-visible:bg-surface"
        />
        <p className="mt-1 text-end text-xs text-ink-400">{description.length}/500</p>
      </div>
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" isLoading={saving}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

export default function EducationModal({
  isOpen,
  entry,
  saving,
  onSubmit,
  onClose,
}: {
  isOpen: boolean;
  entry: EducationEntry | null;
  saving: boolean;
  onSubmit: (entry: EducationEntry) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entry ? t('profile.education.editTitle') : t('profile.education.addTitle')}
      size="lg"
    >
      <EducationForm entry={entry} onSubmit={onSubmit} onClose={onClose} saving={saving} />
    </Modal>
  );
}
