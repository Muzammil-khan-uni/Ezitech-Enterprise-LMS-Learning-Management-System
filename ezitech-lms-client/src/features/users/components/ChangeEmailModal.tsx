import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Mail } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { getApiError } from '@/lib/apiError';
import { useChangeEmail } from '../usersApi';
import type { Notify } from './profileUtils';

function ChangeEmailForm({ currentEmail, onClose, notify }: { currentEmail: string; onClose: () => void; notify: Notify }) {
  const { t } = useTranslation();
  const changeEmail = useChangeEmail();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const nextEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(nextEmail)) {
      setError(t('profile.contact.emailInvalid'));
      return;
    }
    if (nextEmail === currentEmail) {
      setError(t('profile.contact.emailSame'));
      return;
    }
    try {
      await changeEmail.mutateAsync({ email: nextEmail, password });
      notify('success', t('profile.toast.emailChanged'));
      onClose();
    } catch (err) {
      setError(getApiError(err, t('profile.toast.saveFailed')));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-500">{t('profile.contact.emailChangeHint')}</p>
      <Input
        label={t('profile.contact.newEmail')}
        type="email"
        autoComplete="email"
        autoFocus
        required
        icon={<Mail className="size-4" />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label={t('profile.contact.currentPassword')}
        type="password"
        autoComplete="current-password"
        required
        icon={<KeyRound className="size-4" />}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose} disabled={changeEmail.isPending}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" isLoading={changeEmail.isPending} disabled={!email || !password}>
          {t('profile.contact.updateEmail')}
        </Button>
      </div>
    </form>
  );
}

export default function ChangeEmailModal({
  isOpen,
  currentEmail,
  onClose,
  notify,
}: {
  isOpen: boolean;
  currentEmail: string;
  onClose: () => void;
  notify: Notify;
}) {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('profile.contact.changeEmail')}>
      <ChangeEmailForm currentEmail={currentEmail} onClose={onClose} notify={notify} />
    </Modal>
  );
}
