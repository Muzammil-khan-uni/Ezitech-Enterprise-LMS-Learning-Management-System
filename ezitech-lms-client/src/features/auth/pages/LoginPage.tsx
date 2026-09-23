import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Mail, Lock, KeyRound, AlertCircle, ArrowRight, ShieldQuestion } from 'lucide-react';
import { useLogin } from '../authApi';
import AuthLayout from '@/components/layout/AuthLayout';
import { Button, Input } from '@/components/ui';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);

  const lockedMessage =
    axios.isAxiosError(login.error) && login.error.response?.status === 429
      ? (login.error.response.data as { message?: string } | undefined)?.message ?? t('auth.accountLocked')
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login.mutateAsync({
        email,
        password,
        mfaToken: useRecoveryCode ? undefined : mfaToken || undefined,
        recoveryCode: useRecoveryCode ? recoveryCode || undefined : undefined,
      });
      navigate('/');
    } catch (err) {
      const mfaRequired = (err as { response?: { data?: { mfaRequired?: boolean } } })?.response?.data?.mfaRequired;
      if (mfaRequired) {
        setMfaRequired(true);
      }
    }
  }

  return (
    <AuthLayout
      title={t('auth.welcomeBack')}
      subtitle={t('auth.welcomeBackSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            {t('auth.createOne')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          label={t('auth.email')}
          type="email"
          icon={<Mail className="size-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <Input
          id="password"
          label={t('auth.password')}
          type="password"
          icon={<Lock className="size-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        {mfaRequired && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
            {!useRecoveryCode ? (
              <Input
                id="mfaToken"
                label={t('auth.authenticatorCode')}
                type="text"
                inputMode="numeric"
                maxLength={6}
                icon={<KeyRound className="size-4" />}
                value={mfaToken}
                onChange={(e) => setMfaToken(e.target.value)}
                placeholder="6-digit code"
              />
            ) : (
              <Input
                id="recoveryCode"
                label={t('auth.recoveryCode')}
                type="text"
                icon={<ShieldQuestion className="size-4" />}
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder={t('auth.recoveryCodePlaceholder')}
              />
            )}
            <button
              type="button"
              onClick={() => setUseRecoveryCode((v) => !v)}
              className="focus-ring text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              {useRecoveryCode ? t('auth.useAuthenticatorInstead') : t('auth.useRecoveryCodeInstead')}
            </button>
          </motion.div>
        )}

        {mfaRequired && login.isError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            {lockedMessage ?? (useRecoveryCode ? t('auth.invalidRecoveryCode') : t('auth.invalidAuthenticatorCode'))}
          </motion.p>
        )}

        {login.isError && !mfaRequired && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            {lockedMessage ?? t('auth.invalidCredentials')}
          </motion.p>
        )}

        <div className="flex justify-end">
          <Link to="/forgot-password" className="focus-ring text-xs font-semibold text-brand-600 hover:text-brand-700">
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <Button type="submit" isLoading={login.isPending} className="w-full" iconRight={<ArrowRight className="size-4" />}>
          {login.isPending ? t('auth.loggingIn') : t('auth.login')}
        </Button>
      </form>
    </AuthLayout>
  );
}
