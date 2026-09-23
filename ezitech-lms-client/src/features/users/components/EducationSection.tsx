import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CalendarDays, GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { EducationEntry, ProfileUser } from '../usersApi';
import ConfirmDialog from './ConfirmDialog';
import EducationModal from './EducationModal';
import SectionCard, { AddPrompt, IconButton } from './SectionCard';
import { EDUCATION_MAX, type SaveProfile } from './profileUtils';

export default function EducationSection({
  user,
  onSave,
  className,
}: {
  user: ProfileUser;
  onSave: SaveProfile;
  className?: string;
}) {
  const { t } = useTranslation();
  const entries = useMemo(() => user.education ?? [], [user.education]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EducationEntry | null>(null);
  const [deleting, setDeleting] = useState<EducationEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => (b.endYear ?? 9999) - (a.endYear ?? 9999) || (b.startYear ?? 0) - (a.startYear ?? 0)
      ),
    [entries]
  );

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(entry: EducationEntry) {
    setEditing(entry);
    setModalOpen(true);
  }

  async function handleSubmit(entry: EducationEntry) {
    const next = editing?._id ? entries.map((e) => (e._id === editing._id ? entry : e)) : [...entries, entry];
    setSaving(true);
    const ok = await onSave(
      { education: next },
      editing ? t('profile.toast.educationUpdated') : t('profile.toast.educationAdded')
    );
    setSaving(false);
    if (ok) setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    const ok = await onSave(
      { education: entries.filter((e) => e._id !== deleting._id) },
      t('profile.toast.educationRemoved')
    );
    setSaving(false);
    if (ok) setDeleting(null);
  }

  const canAdd = entries.length < EDUCATION_MAX;

  return (
    <SectionCard
      id="profile-education"
      icon={<GraduationCap className="size-5" />}
      title={t('profile.education.title')}
      subtitle={t('profile.education.subtitle')}
      tint="emerald"
      className={className}
      action={
        entries.length > 0 && canAdd ? (
          <Button size="sm" variant="secondary" onClick={openAdd} iconLeft={<Plus className="size-4" />}>
            <span className="hidden sm:inline">{t('profile.education.add')}</span>
            <span className="sr-only sm:hidden">{t('profile.education.add')}</span>
          </Button>
        ) : undefined
      }
    >
      {entries.length === 0 ? (
        <AddPrompt icon={<GraduationCap className="size-4" />} label={t('profile.education.empty')} onClick={openAdd} />
      ) : (
        <ol className="relative ms-4 space-y-6 border-s-2 border-dashed border-ink-200 ps-6">
          <AnimatePresence initial={false}>
            {sorted.map((entry, index) => (
              <motion.li
                key={entry._id ?? entry.school}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                className="group relative"
              >
                <motion.span
                  whileHover={{ scale: 1.15, rotate: -6 }}
                  className="bg-gradient-brand absolute -start-[17px] top-0 flex size-8 items-center justify-center rounded-full text-white shadow-lift ring-4 ring-surface"
                >
                  <GraduationCap className="size-4" />
                </motion.span>
                <div className="flex items-start gap-2 ps-5">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-display text-base font-bold text-ink-900">{entry.school}</h3>
                    {(entry.degree || entry.field) && (
                      <p className="break-words text-sm font-medium text-ink-600">
                        {[entry.degree, entry.field].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {(entry.startYear || entry.endYear) && (
                      <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">
                        <CalendarDays className="size-3" />
                        {entry.startYear ?? '—'} – {entry.endYear ?? t('profile.education.present')}
                      </span>
                    )}
                    {entry.description && (
                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink-500">
                        {entry.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <IconButton label={t('common.edit')} onClick={() => openEdit(entry)}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label={t('common.delete')} tone="danger" onClick={() => setDeleting(entry)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}

      <EducationModal
        isOpen={modalOpen}
        entry={editing}
        saving={saving}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
      />
      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title={t('profile.education.removeTitle')}
        message={t('profile.education.removeMessage', { school: deleting?.school ?? '' })}
        isLoading={saving}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </SectionCard>
  );
}
