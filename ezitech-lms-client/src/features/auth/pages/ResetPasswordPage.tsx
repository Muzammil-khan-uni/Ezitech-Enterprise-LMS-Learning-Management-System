import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Lock, ShieldAlert } from 'lucide-react';
import { useResetPassword } from '../authApi';
import AuthLayout from '@/components/layout/AuthLayout';
import { Button, Input } from '@/components/ui';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const resetPassword = useResetPassword();

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
    await resetPassword.mutateAsync({ token, password });
    navigate('/login');
  }

  if (!token) {
    return (
      <AuthLayout title={t('auth.invalidLink')} subtitle={t('auth.missingResetTokenSubtitle')} footer={null}>
        <div className="flex flex-col items-center gap-3 rounded-xl bg-rose-50 px-4 py-6 text-center dark:bg-rose-500/15">
          <ShieldAlert className="size-8 text-rose-500 dark:text-rose-300" />
          <p className="text-sm font-medium text-rose-600 dark:text-rose-300">{t('auth.requestNewResetLink')}</p>
          <Link to="/forgot-password" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            {t('auth.forgotPasswordTitle')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.resetPasswordTitle')}
      subtitle={t('auth.resetPasswordSubtitle')}
      footer={
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          {t('auth.backToLogin')}
        </Link>
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

        {resetPassword.isError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            {t('auth.invalidResetLink')}
          </motion.p>
        )}

        <Button
          type="submit"
          isLoading={resetPassword.isPending}
          className="w-full"
          iconRight={<ArrowRight className="size-4" />}
        >
          {resetPassword.isPending ? t('auth.settingPassword') : t('auth.resetPasswordAction')}
        </Button>
      </form>
    </AuthLayout>
  );
}
