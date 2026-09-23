import { KeyboardEvent, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Lightbulb, Pencil, Plus, Trash2, Wand2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui';
import type { ProfileUser } from '../usersApi';
import ConfirmDialog from './ConfirmDialog';
import SectionCard, { AddPrompt, IconButton } from './SectionCard';
import { SKILLS_MAX, SKILL_MAX_LENGTH, SKILL_SUGGESTIONS, skillTone, type SaveProfile } from './profileUtils';

function SkillChip({ skill, onRemove }: { skill: string; onRemove?: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className={clsx(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset',
        skillTone(skill)
      )}
    >
      <span className="truncate" title={skill}>{skill}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('profile.skills.removeSkill', { skill })}
          className="focus-ring -me-1 flex size-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/15"
        >
          <X className="size-3" />
        </button>
      )}
    </motion.span>
  );
}

export default function SkillsSection({
  user,
  onSave,
  className,
}: {
  user: ProfileUser;
  onSave: SaveProfile;
  className?: string;
}) {
  const { t } = useTranslation();
  const skills = user.skills ?? [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function startEdit() {
    setDraft(skills);
    setInput('');
    setError('');
    setEditing(true);
  }

  function addSkills(raw: string, base: string[] = draft): string[] {
    let next = base;
    for (const part of raw.split(',')) {
      const skill = part.trim().replace(/\s+/g, ' ');
      if (!skill) continue;
      if (skill.length > SKILL_MAX_LENGTH) {
        setError(t('profile.skills.tooLong', { max: SKILL_MAX_LENGTH }));
        return next;
      }
      if (next.some((s) => s.toLowerCase() === skill.toLowerCase())) continue;
      if (next.length >= SKILLS_MAX) {
        setError(t('profile.skills.limit', { max: SKILLS_MAX }));
        return next;
      }
      next = [...next, skill];
    }
    setError('');
    return next;
  }

  function commitInput() {
    if (!input.trim()) return draft;
    const next = addSkills(input);
    setDraft(next);
    setInput('');
    return next;
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitInput();
    } else if (e.key === 'Backspace' && !input && draft.length > 0) {
      setDraft(draft.slice(0, -1));
    }
  }

  async function handleSave() {
    const finalSkills = commitInput();
    setSaving(true);
    const ok = await onSave({ skills: finalSkills }, t('profile.toast.skillsSaved'));
    setSaving(false);
    if (ok) setEditing(false);
  }

  async function handleClear() {
    setSaving(true);
    const ok = await onSave({ skills: [] }, t('profile.toast.skillsCleared'));
    setSaving(false);
    if (ok) setConfirmOpen(false);
  }

  const suggestions = SKILL_SUGGESTIONS.filter((s) => !draft.some((d) => d.toLowerCase() === s.toLowerCase())).slice(0, 6);

  return (
    <SectionCard
      id="profile-skills"
      icon={<Lightbulb className="size-5" />}
      title={t('profile.skills.title')}
      subtitle={t('profile.skills.subtitle')}
      tint="accent"
      className={className}
      action={
        !editing && skills.length > 0 ? (
          <>
            <IconButton label={t('common.edit')} onClick={startEdit}>
              <Pencil className="size-4" />
            </IconButton>
            <IconButton label={t('profile.skills.clearAll')} tone="danger" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="size-4" />
            </IconButton>
          </>
        ) : undefined
      }
    >
      {editing ? (
        <div className="space-y-4">
          <div className="flex min-h-12 flex-wrap gap-2 rounded-xl border border-ink-200 bg-ink-50/60 p-2.5">
            <AnimatePresence>
              {draft.map((skill) => (
                <SkillChip key={skill} skill={skill} onRemove={() => setDraft(draft.filter((s) => s !== skill))} />
              ))}
            </AnimatePresence>
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              aria-label={t('profile.skills.inputLabel')}
              placeholder={draft.length ? t('profile.skills.addMore') : t('profile.skills.placeholder')}
              className="min-w-32 flex-1 bg-transparent px-1.5 py-1 text-sm text-ink-800 outline-none placeholder:text-ink-400"
            />
          </div>
          {error && (
            <p role="alert" className="text-xs font-medium text-rose-600">
              {error}
            </p>
          )}
          {suggestions.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-500">
                <Wand2 className="size-3.5" />
                {t('profile.skills.suggestions')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <motion.button
                    key={s}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDraft(addSkills(s))}
                    className="focus-ring inline-flex items-center gap-1 rounded-full border border-dashed border-ink-300 px-2.5 py-1 text-xs font-semibold text-ink-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Plus className="size-3" />
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-ink-400">
              {t('profile.skills.count', { count: draft.length, max: SKILLS_MAX })}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button type="button" size="sm" onClick={handleSave} isLoading={saving}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      ) : skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {skills.map((skill) => (
              <SkillChip key={skill} skill={skill} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <AddPrompt icon={<Lightbulb className="size-4" />} label={t('profile.skills.empty')} onClick={startEdit} />
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title={t('profile.skills.clearTitle')}
        message={t('profile.skills.clearMessage')}
        confirmLabel={t('profile.skills.clearAll')}
        isLoading={saving}
        onConfirm={handleClear}
        onClose={() => setConfirmOpen(false)}
      />
    </SectionCard>
  );
}
