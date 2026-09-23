import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, HeartHandshake } from 'lucide-react';
import { clsx } from 'clsx';
import { Avatar, Badge, Button, Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getApiError } from '@/lib/apiError';
import { useCourseMentors, useMentorOptions, useSetCourseMentors } from '../mentorsApi';

export default function CourseMentorsCard({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canAssign = user?.role === 'admin' || user?.role === 'course_manager';
  const { data: assigned, isLoading } = useCourseMentors(courseId);
  const { data: options } = useMentorOptions(canAssign);
  const setMentors = useSetCourseMentors(courseId);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setSelected((assigned ?? []).map((mentor) => mentor._id));
    setError(null);
    setEditing(true);
  }

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  async function save() {
    setError(null);
    try {
      await setMentors.mutateAsync(selected);
      setEditing(false);
    } catch (err) {
      setError(getApiError(err, t('mentors.saveFailed')));
    }
  }

  return (
    <Card className="mb-6 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-400/15 text-accent-600 dark:text-accent-400">
          <HeartHandshake className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold text-ink-900">{t('mentors.cardTitle')}</h2>
          <p className="text-sm text-ink-500">{t('mentors.cardDesc')}</p>
        </div>
        {canAssign && !editing && (
          <Button size="sm" variant="secondary" onClick={startEdit}>
            {t('mentors.manage')}
          </Button>
        )}
      </div>

      {!editing && (
        <div className="mt-4 flex flex-wrap gap-2">
          {isLoading && <span className="text-sm text-ink-400">…</span>}
          {!isLoading && (assigned ?? []).length === 0 && <span className="text-sm text-ink-400">{t('mentors.none')}</span>}
          {(assigned ?? []).map((mentor) => (
            <span key={mentor._id} className="flex items-center gap-2 rounded-full bg-ink-50 py-1 pe-3 ps-1 text-sm font-semibold text-ink-700">
              <Avatar name={mentor.name} size="xs" />
              {mentor.name}
            </span>
          ))}
        </div>
      )}

      {editing && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          {(options ?? []).length === 0 ? (
            <p className="text-sm text-ink-500">{t('mentors.noMentorAccounts')}</p>
          ) : (
            <ul className="max-h-64 space-y-1.5 overflow-y-auto">
              {(options ?? []).map((mentor) => {
                const on = selected.includes(mentor._id);
                return (
                  <li key={mentor._id}>
                    <button
                      type="button"
                      onClick={() => toggle(mentor._id)}
                      aria-pressed={on}
                      className={clsx(
                        'focus-ring flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-start transition-colors',
                        on ? 'border-brand-300 bg-brand-50' : 'border-ink-100 hover:bg-ink-50'
                      )}
                    >
                      <Avatar name={mentor.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink-800" title={mentor.name}>{mentor.name}</span>
                        <span className="block truncate text-xs text-ink-500" title={mentor.email}>{mentor.email}</span>
                      </span>
                      {on ? <Check className="size-4 text-brand-600" /> : <Badge tone="neutral">{t('mentors.add')}</Badge>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {error && (
            <p role="alert" className="mt-3 flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-300">
              <AlertCircle className="size-3.5" /> {error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={setMentors.isPending}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={save} isLoading={setMentors.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </motion.div>
      )}
    </Card>
  );
}
