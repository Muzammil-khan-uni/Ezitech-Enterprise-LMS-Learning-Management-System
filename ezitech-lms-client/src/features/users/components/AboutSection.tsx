import { FormEvent, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FileText, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ProfileUser } from '../usersApi';
import ConfirmDialog from './ConfirmDialog';
import SectionCard, { AddPrompt, IconButton } from './SectionCard';
import { BIO_MAX, type SaveProfile } from './profileUtils';

export default function AboutSection({
  user,
  onSave,
  className,
}: {
  user: ProfileUser;
  onSave: SaveProfile;
  className?: string;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const bio = user.bio?.trim() ?? '';

  function startEdit() {
    setDraft(bio);
    setEditing(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSave({ bio: draft.trim() || null }, t('profile.toast.bioSaved'));
    setSaving(false);
    if (ok) setEditing(false);
  }

  async function handleRemove() {
    setSaving(true);
    const ok = await onSave({ bio: null }, t('profile.toast.bioRemoved'));
    setSaving(false);
    if (ok) setConfirmOpen(false);
  }

  return (
    <SectionCard
      id="profile-about"
      icon={<FileText className="size-5" />}
      title={t('profile.about.title')}
      subtitle={t('profile.about.subtitle')}
      className={className}
      action={
        !editing && bio ? (
          <>
            <IconButton label={t('common.edit')} onClick={startEdit}>
              <Pencil className="size-4" />
            </IconButton>
            <IconButton label={t('common.delete')} tone="danger" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="size-4" />
            </IconButton>
          </>
        ) : undefined
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.form
            key="edit"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            <label htmlFor="profile-bio" className="sr-only">
              {t('profile.about.title')}
            </label>
            <textarea
              id="profile-bio"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, BIO_MAX))}
              rows={6}
              autoFocus
              placeholder={t('profile.about.placeholder')}
              className="focus-ring w-full resize-y rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-3 text-sm leading-relaxed text-ink-800 placeholder:text-ink-400 transition-colors hover:border-ink-300 focus-visible:bg-surface"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={draft.length > BIO_MAX * 0.9 ? 'text-xs font-semibold text-amber-600' : 'text-xs text-ink-400'}>
                {draft.length}/{BIO_MAX}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" size="sm" isLoading={saving}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </motion.form>
        ) : bio ? (
          <motion.p
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="whitespace-pre-line break-words text-sm leading-relaxed text-ink-700 sm:text-[15px]"
          >
            {bio}
          </motion.p>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AddPrompt icon={<Sparkles className="size-4" />} label={t('profile.about.empty')} onClick={startEdit} />
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={t('profile.about.removeTitle')}
        message={t('profile.about.removeMessage')}
        isLoading={saving}
        onConfirm={handleRemove}
        onClose={() => setConfirmOpen(false)}
      />
    </SectionCard>
  );
}
