import { FormEvent, ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Link2, Pencil, Trash2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { GithubIcon, LinkedinIcon } from '@/components/icons/BrandIcons';
import type { ProfileUser } from '../usersApi';
import ConfirmDialog from './ConfirmDialog';
import SectionCard, { AddPrompt, IconButton, InfoRow } from './SectionCard';
import { displayUrl, isHostedOn, normalizeUrl, type SaveProfile } from './profileUtils';

type Platform = 'github' | 'linkedin';

const PLATFORMS: Record<Platform, { label: string; domain: string; placeholder: string; icon: ReactNode }> = {
  github: { label: 'GitHub', domain: 'github.com', placeholder: 'https://github.com/username', icon: <GithubIcon className="size-4" /> },
  linkedin: {
    label: 'LinkedIn',
    domain: 'linkedin.com',
    placeholder: 'https://linkedin.com/in/username',
    icon: <LinkedinIcon className="size-4" />,
  },
};

function LinkRow({
  platform,
  value,
  onSave,
}: {
  platform: Platform;
  value?: string;
  onSave: SaveProfile;
}) {
  const { t } = useTranslation();
  const config = PLATFORMS[platform];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function startEdit() {
    setDraft(value ?? '');
    setError('');
    setEditing(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const url = normalizeUrl(draft);
    if (!url) {
      setError(t('profile.social.required'));
      return;
    }
    if (!isHostedOn(url, config.domain)) {
      setError(t('profile.social.invalid', { domain: config.domain }));
      return;
    }
    setSaving(true);
    const ok = await onSave({ socialLinks: { [platform]: url } }, t('profile.toast.linkSaved', { platform: config.label }));
    setSaving(false);
    if (ok) setEditing(false);
  }

  async function handleRemove() {
    setSaving(true);
    const ok = await onSave({ socialLinks: { [platform]: null } }, t('profile.toast.linkRemoved', { platform: config.label }));
    setSaving(false);
    if (ok) setConfirmOpen(false);
  }

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.form
            key="edit"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3 rounded-xl bg-ink-50/70 p-3"
          >
            <Input
              label={config.label}
              type="url"
              dir="ltr"
              inputMode="url"
              autoFocus
              icon={config.icon}
              placeholder={config.placeholder}
              value={draft}
              error={error}
              onChange={(e) => {
                setDraft(e.target.value);
                setError('');
              }}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" size="sm" isLoading={saving}>
                {t('common.save')}
              </Button>
            </div>
          </motion.form>
        ) : value ? (
          <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <InfoRow
              icon={config.icon}
              label={config.label}
              actions={
                <>
                  <IconButton label={t('common.edit')} onClick={startEdit}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton label={t('common.delete')} tone="danger" onClick={() => setConfirmOpen(true)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </>
              }
            >
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="focus-ring group inline-flex max-w-full items-center gap-1.5 rounded text-brand-700 hover:underline dark:text-brand-300"
              >
                <span className="truncate">{displayUrl(value)}</span>
                <ExternalLink className="size-3.5 shrink-0 opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </InfoRow>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AddPrompt icon={config.icon} label={t('profile.social.add', { platform: config.label })} onClick={startEdit} />
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmDialog
        isOpen={confirmOpen}
        title={t('profile.social.removeTitle', { platform: config.label })}
        message={t('profile.social.removeMessage', { platform: config.label })}
        isLoading={saving}
        onConfirm={handleRemove}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}

export default function SocialSection({
  user,
  onSave,
  className,
}: {
  user: ProfileUser;
  onSave: SaveProfile;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <SectionCard
      id="profile-social"
      icon={<Link2 className="size-5" />}
      title={t('profile.social.title')}
      subtitle={t('profile.social.subtitle')}
      tint="rose"
      className={className}
    >
      <div className="space-y-2.5">
        <LinkRow platform="github" value={user.socialLinks?.github} onSave={onSave} />
        <LinkRow platform="linkedin" value={user.socialLinks?.linkedin} onSave={onSave} />
      </div>
    </SectionCard>
  );
}
