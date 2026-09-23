import { FormEvent, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Contact, Mail, Pencil, Phone, Trash2, TriangleAlert } from 'lucide-react';
import { Badge, Button, Input } from '@/components/ui';
import type { ProfileUser } from '../usersApi';
import ChangeEmailModal from './ChangeEmailModal';
import ConfirmDialog from './ConfirmDialog';
import SectionCard, { AddPrompt, IconButton, InfoRow } from './SectionCard';
import { isValidPhone, type Notify, type SaveProfile } from './profileUtils';

export default function ContactSection({
  user,
  onSave,
  notify,
  className,
}: {
  user: ProfileUser;
  onSave: SaveProfile;
  notify: Notify;
  className?: string;
}) {
  const { t } = useTranslation();
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  function startEdit() {
    setPhone(user.phone ?? '');
    setPhoneError('');
    setEditingPhone(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = phone.trim();
    if (!value) {
      setPhoneError(t('profile.contact.phoneRequired'));
      return;
    }
    if (!isValidPhone(value)) {
      setPhoneError(t('profile.contact.phoneInvalid'));
      return;
    }
    setSaving(true);
    const ok = await onSave({ phone: value }, t('profile.toast.phoneSaved'));
    setSaving(false);
    if (ok) setEditingPhone(false);
  }

  async function handleRemove() {
    setSaving(true);
    const ok = await onSave({ phone: null }, t('profile.toast.phoneRemoved'));
    setSaving(false);
    if (ok) setConfirmOpen(false);
  }

  return (
    <SectionCard
      id="profile-contact"
      icon={<Contact className="size-5" />}
      title={t('profile.contact.title')}
      subtitle={t('profile.contact.subtitle')}
      tint="sky"
      className={className}
    >
      <div className="space-y-2.5">
        <InfoRow
          icon={<Mail className="size-4" />}
          label={t('profile.contact.email')}
          actions={
            <IconButton label={t('profile.contact.changeEmail')} onClick={() => setEmailOpen(true)}>
              <Pencil className="size-4" />
            </IconButton>
          }
        >
          <span className="break-all">{user.email}</span>
          <div className="mt-1.5">
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
        </InfoRow>

        <AnimatePresence mode="wait" initial={false}>
          {editingPhone ? (
            <motion.form
              key="edit"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3 rounded-xl bg-ink-50/70 p-3"
            >
              <Input
                label={t('profile.contact.phone')}
                type="tel"
                inputMode="tel"
                dir="ltr"
                autoComplete="tel"
                autoFocus
                icon={<Phone className="size-4" />}
                placeholder="+92 300 1234567"
                value={phone}
                error={phoneError}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError('');
                }}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingPhone(false)} disabled={saving}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" size="sm" isLoading={saving}>
                  {t('common.save')}
                </Button>
              </div>
            </motion.form>
          ) : user.phone ? (
            <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InfoRow
                icon={<Phone className="size-4" />}
                label={t('profile.contact.phone')}
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
                <span dir="ltr" className="inline-block">
                  {user.phone}
                </span>
              </InfoRow>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AddPrompt icon={<Phone className="size-4" />} label={t('profile.contact.addPhone')} onClick={startEdit} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-400">{t('profile.contact.emailNote')}</p>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={t('profile.contact.removePhoneTitle')}
        message={t('profile.contact.removePhoneMessage')}
        isLoading={saving}
        onConfirm={handleRemove}
        onClose={() => setConfirmOpen(false)}
      />
      <ChangeEmailModal isOpen={emailOpen} currentEmail={user.email} onClose={() => setEmailOpen(false)} notify={notify} />
    </SectionCard>
  );
}
