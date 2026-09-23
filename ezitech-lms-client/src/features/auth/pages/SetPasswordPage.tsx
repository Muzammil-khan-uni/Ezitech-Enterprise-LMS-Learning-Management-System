import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Lock, ShieldAlert } from 'lucide-react';
import { useSetPassword } from '../authApi';
import AuthLayout from '@/components/layout/AuthLayout';
import { Button, Input } from '@/components/ui';

export default function SetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const setPassword = useSetPassword();

  const [password, setPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mismatchError, setMismatchError] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMismatchError(true);
      return;
    }
    setMismatchError(false);
    await setPassword.mutateAsync({ token, password });
    navigate('/login');
  }

  if (!token) {
    return (
      <AuthLayout title={t('auth.invalidLink')} subtitle={t('auth.missingTokenSubtitle')} footer={null}>
        <div className="flex flex-col items-center gap-3 rounded-xl bg-rose-50 px-4 py-6 text-center dark:bg-rose-500/15">
          <ShieldAlert className="size-8 text-rose-500 dark:text-rose-300" />
          <p className="text-sm font-medium text-rose-600 dark:text-rose-300">{t('auth.checkInviteLink')}</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.setPassword')}
      subtitle={t('auth.setPasswordSubtitle')}
      footer={
        <>
          {t('auth.alreadyActivated')}{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            {t('auth.login')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="password"
          label={t('auth.newPassword')}
          type="password"
          minLength={8}
          icon={<Lock className="size-4" />}
          value={password}
          onChange={(e) => setPasswordValue(e.target.value)}
          placeholder="At least 8 characters"
          required
        />
        <Input
          id="confirmPassword"
          label={t('auth.confirmPassword')}
          type="password"
          minLength={8}
          icon={<Lock className="size-4" />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t('auth.reenterPassword')}
          required
        />

        {mismatchError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            {t('auth.passwordsDontMatch')}
          </motion.p>
        )}

        {setPassword.isError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            {t('auth.invalidInviteLink')}
          </motion.p>
        )}

        <Button type="submit" isLoading={setPassword.isPending} className="w-full" iconRight={<ArrowRight className="size-4" />}>
          {setPassword.isPending ? t('auth.settingPassword') : t('auth.setPasswordAction')}
        </Button>
      </form>
    </AuthLayout>
  );
}
