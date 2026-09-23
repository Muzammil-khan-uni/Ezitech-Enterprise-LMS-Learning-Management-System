import { DragEvent, FormEvent, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  GraduationCap,
  Loader2,
  Mail,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  TriangleAlert,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Avatar, Badge, Button, Card } from '@/components/ui';
import { GithubIcon, LinkedinIcon } from '@/components/icons/BrandIcons';
import { getApiError } from '@/lib/apiError';
import { useRemoveAvatar, useUploadAvatar, useUpdateProfile, type ProfileUser } from '../usersApi';
import ConfirmDialog from './ConfirmDialog';
import { AVATAR_MAX_BYTES, AVATAR_TYPES, fadeUp, type Notify } from './profileUtils';

const NAME_MAX = 100;

const floaters = [
  { Icon: GraduationCap, className: 'end-[8%] top-6', duration: 5, delay: 0 },
  { Icon: Sparkles, className: 'end-[24%] top-16', duration: 6, delay: 0.8 },
  { Icon: Trophy, className: 'end-[40%] top-5', duration: 5.5, delay: 1.6 },
  { Icon: BookOpen, className: 'start-[8%] top-14', duration: 6.5, delay: 0.4 },
];

export default function ProfileHero({ user, notify }: { user: ProfileUser; notify: Notify }) {
  const { t, i18n } = useTranslation();
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const updateProfile = useUpdateProfile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.name);

  const hasAvatar = Boolean(user.avatar?.url);
  const isUploading = upload.isPending;
  const isSavingName = updateProfile.isPending;

  function startEditName() {
    setNameDraft(user.name);
    setEditingName(true);
  }

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2) {
      notify('error', t('profile.hero.nameTooShort'));
      return;
    }
    if (trimmed === user.name) {
      setEditingName(false);
      return;
    }
    try {
      await updateProfile.mutateAsync({ name: trimmed });
      notify('success', t('profile.toast.nameSaved'));
      setEditingName(false);
    } catch (error) {
      notify('error', getApiError(error, t('profile.toast.saveFailed')));
    }
  }

  async function handleFile(file?: File | null) {
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      notify('error', t('profile.photo.invalidType'));
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      notify('error', t('profile.photo.tooLarge'));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    try {
      await upload.mutateAsync(file);
      notify('success', t('profile.toast.photoUpdated'));
    } catch (error) {
      notify('error', getApiError(error, t('profile.photo.uploadFailed')));
    } finally {
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove() {
    try {
      await remove.mutateAsync();
      notify('success', t('profile.toast.photoRemoved'));
      setConfirmOpen(false);
    } catch (error) {
      notify('error', getApiError(error, t('profile.toast.saveFailed')));
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  const joined = user.createdAt
    ? new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: 'long' }).format(new Date(user.createdAt))
    : null;

  const socials = [
    { key: 'github', href: user.socialLinks?.github, Icon: GithubIcon, label: 'GitHub' },
    { key: 'linkedin', href: user.socialLinks?.linkedin, Icon: LinkedinIcon, label: 'LinkedIn' },
  ].filter((s) => s.href);

  return (
    <Card id="profile-hero" variants={fadeUp} className="scroll-mt-24 overflow-hidden">
      <div className="bg-gradient-animated relative h-32 overflow-hidden sm:h-44">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div aria-hidden className="motion-safe:animate-float absolute -top-10 start-[10%] size-40 rounded-full bg-white/20 blur-2xl" />
        <div
          aria-hidden
          className="motion-safe:animate-float absolute -bottom-14 end-[15%] size-56 rounded-full bg-accent-400/40 blur-3xl [animation-delay:-3s]"
        />
        {floaters.map(({ Icon, className, duration, delay }) => (
          <motion.div
            key={className}
            aria-hidden
            animate={{ y: [0, -9, 0], rotate: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration, delay, ease: 'easeInOut' }}
            className={clsx(
              'absolute hidden size-11 items-center justify-center rounded-2xl bg-white/20 text-white shadow-lg backdrop-blur-md sm:flex',
              className
            )}
          >
            <Icon className="size-5" />
          </motion.div>
        ))}
      </div>

      <div className="px-4 pb-6 sm:px-8">
        {/* Only the avatar circle overlaps the cover above (a third of its own height, applied to
            just this block). The row itself has no negative margin, so the name and Add Photo
            button stay anchored on the clear card background below the cover — unmoved either
            way — regardless of how much the avatar overlaps. */}
        <div className="pt-4 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-start">
          <div
            className="relative -mt-[43px] shrink-0 sm:-mt-[53px]"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <motion.button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              aria-label={t('profile.photo.change')}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: dragging ? 1.06 : 1, opacity: 1 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className={clsx(
                'bg-gradient-brand focus-ring group relative block rounded-full p-1 shadow-lift',
                dragging && 'motion-safe:animate-pulse-ring'
              )}
            >
              <span className="block rounded-full bg-surface p-1">
                <Avatar name={user.name} src={preview ?? user.avatar?.url} size="xl" />
              </span>
              <span
                className={clsx(
                  'absolute inset-2 flex flex-col items-center justify-center gap-1 rounded-full bg-black/50 text-xs font-semibold text-white transition-opacity',
                  isUploading || dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                )}
              >
                {isUploading ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
                <span className="hidden sm:block">
                  {isUploading ? t('profile.photo.uploading') : dragging ? t('profile.photo.drop') : t('profile.photo.change')}
                </span>
              </span>
            </motion.button>
            <span className="bg-gradient-brand pointer-events-none absolute bottom-1 end-1 flex size-9 items-center justify-center rounded-full text-white shadow-lift ring-2 ring-surface">
              <Camera className="size-4" />
            </span>
            <input
              ref={inputRef}
              type="file"
              accept={AVATAR_TYPES.join(',')}
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
            />
          </div>

          <div className="min-w-0 flex-1">
            {editingName ? (
              <form onSubmit={handleSaveName} className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <label htmlFor="profile-name" className="sr-only">
                  {t('profile.hero.name')}
                </label>
                <input
                  id="profile-name"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value.slice(0, NAME_MAX))}
                  autoFocus
                  disabled={isSavingName}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  className="focus-ring w-full max-w-xs rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-1.5 font-display text-xl font-extrabold text-ink-900 transition-colors hover:border-ink-300 focus-visible:bg-surface sm:text-2xl"
                />
                <button
                  type="submit"
                  disabled={isSavingName}
                  aria-label={t('common.save')}
                  title={t('common.save')}
                  className="focus-ring flex size-8 shrink-0 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-60"
                >
                  {isSavingName ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                </button>
                <button
                  type="button"
                  disabled={isSavingName}
                  onClick={() => setEditingName(false)}
                  aria-label={t('common.cancel')}
                  title={t('common.cancel')}
                  className="focus-ring flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-600 disabled:opacity-60"
                >
                  <X className="size-4" />
                </button>
              </form>
            ) : (
              <div className="group flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                <h1 className="break-words font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{user.name}</h1>
                <button
                  type="button"
                  onClick={startEditName}
                  aria-label={t('profile.hero.editName')}
                  title={t('profile.hero.editName')}
                  className="focus-ring flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-400 opacity-0 transition-opacity hover:bg-ink-50 hover:text-brand-600 focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Pencil className="size-4" />
                </button>
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge tone="brand" icon={<ShieldCheck className="size-3" />}>
                {user.role.replace('_', ' ')}
              </Badge>
              {user.isEmailVerified ? (
                <Badge tone="success" icon={<BadgeCheck className="size-3" />}>
                  {t('profile.hero.verified')}
                </Badge>
              ) : (
                <Badge tone="warning" icon={<TriangleAlert className="size-3" />}>
                  {t('profile.hero.unverified')}
                </Badge>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-sm text-ink-500 sm:justify-start">
              <span className="flex min-w-0 items-center gap-1.5">
                <Mail className="size-4 shrink-0" />
                <span className="break-all">{user.email}</span>
              </span>
              {joined && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4 shrink-0" />
                  {t('profile.hero.joined', { date: joined })}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 sm:items-end">
            {socials.length > 0 && (
              <div className="flex items-center gap-2">
                {socials.map(({ key, href, Icon, label }) => (
                  <motion.a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    whileHover={{ y: -3, scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    className="focus-ring flex size-10 items-center justify-center rounded-xl border border-ink-200 bg-surface text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-600"
                  >
                    <Icon className="size-[18px]" />
                  </motion.a>
                ))}
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => inputRef.current?.click()} disabled={isUploading} iconLeft={<Camera className="size-4" />}>
                {hasAvatar ? t('profile.photo.change') : t('profile.photo.add')}
              </Button>
              {hasAvatar && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmOpen(true)}
                  disabled={isUploading}
                  iconLeft={<Trash2 className="size-4" />}
                >
                  {t('profile.photo.remove')}
                </Button>
              )}
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-ink-400 sm:text-start">{t('profile.photo.hint')}</p>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={t('profile.photo.removeTitle')}
        message={t('profile.photo.removeMessage')}
        confirmLabel={t('profile.photo.remove')}
        isLoading={remove.isPending}
        onConfirm={handleRemove}
        onClose={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
