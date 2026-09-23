import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Mail, Lock, AlertCircle, ArrowRight, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRegister } from '../authApi';
import AuthLayout from '@/components/layout/AuthLayout';
import { Button, Input } from '@/components/ui';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useRegister();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await register.mutateAsync({ name, email, password });
    navigate('/login');
  }

  return (
    <AuthLayout
      title={t('auth.createAccount')}
      subtitle={t('auth.createAccountSubtitle')}
      footer={
        <>
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            {t('auth.login')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="name"
          label={t('auth.fullName')}
          icon={<User className="size-4" />}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          required
        />
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
          minLength={8}
          icon={<Lock className="size-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
        />

        <p className="flex items-start gap-1.5 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {t('auth.staffInviteNote')}
        </p>

        {register.isError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            {t('auth.registrationFailed')}
          </motion.p>
        )}

        <Button
          type="submit"
          isLoading={register.isPending}
          className="w-full"
          iconRight={<ArrowRight className="size-4" />}
        >
          {register.isPending ? t('auth.creatingAccount') : t('auth.register')}
        </Button>
      </form>
    </AuthLayout>
  );
}
