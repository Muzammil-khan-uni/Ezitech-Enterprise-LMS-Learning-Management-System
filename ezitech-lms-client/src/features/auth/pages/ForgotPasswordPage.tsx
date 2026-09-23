import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useForgotPassword } from '../authApi';
import AuthLayout from '@/components/layout/AuthLayout';
import { Button, Input } from '@/components/ui';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await forgotPassword.mutateAsync(email);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthLayout
        title={t('auth.checkYourEmail')}
        subtitle={t('auth.resetLinkSentSubtitle')}
        footer={
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            {t('auth.backToLogin')}
          </Link>
        }
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 rounded-xl bg-emerald-50 px-4 py-6 text-center dark:bg-emerald-500/15"
        >
          <CheckCircle2 className="size-8 text-emerald-500 dark:text-emerald-300" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {t('auth.resetLinkSentBody', { email })}
          </p>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.forgotPasswordTitle')}
      subtitle={t('auth.forgotPasswordSubtitle')}
      footer={
        <>
          {t('auth.rememberedPassword')}{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            {t('auth.login')}
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

        <Button
          type="submit"
          isLoading={forgotPassword.isPending}
          className="w-full"
          iconRight={<ArrowRight className="size-4" />}
        >
          {forgotPassword.isPending ? t('auth.sending') : t('auth.sendResetLink')}
        </Button>
      </form>
    </AuthLayout>
  );
}
