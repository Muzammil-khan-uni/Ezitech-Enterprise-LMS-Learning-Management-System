import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { useVerifyEmail } from '../authApi';
import AuthLayout from '@/components/layout/AuthLayout';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const verifyEmail = useVerifyEmail();
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!token || attempted) return;
    setAttempted(true);
    verifyEmail.mutate(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, attempted]);

  if (!token) {
    return (
      <AuthLayout title={t('auth.invalidLink')} subtitle={t('auth.missingVerifyTokenSubtitle')} footer={null}>
        <div className="flex flex-col items-center gap-3 rounded-xl bg-rose-50 px-4 py-6 text-center dark:bg-rose-500/15">
          <ShieldAlert className="size-8 text-rose-500 dark:text-rose-300" />
          <p className="text-sm font-medium text-rose-600 dark:text-rose-300">{t('auth.checkVerifyLink')}</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.verifyEmailTitle')}
      subtitle=""
      footer={
        <Link to="/" className="font-semibold text-brand-600 hover:text-brand-700">
          {t('auth.continueToApp')}
        </Link>
      }
    >
      {verifyEmail.isPending && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 className="size-8 animate-spin text-brand-500" />
          <p className="text-sm text-ink-500">{t('auth.verifyingEmail')}</p>
        </div>
      )}

      {verifyEmail.isSuccess && (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-emerald-50 px-4 py-6 text-center dark:bg-emerald-500/15">
          <CheckCircle2 className="size-8 text-emerald-500 dark:text-emerald-300" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{t('auth.emailVerified')}</p>
        </div>
      )}

      {verifyEmail.isError && (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-rose-50 px-4 py-6 text-center dark:bg-rose-500/15">
          <ShieldAlert className="size-8 text-rose-500 dark:text-rose-300" />
          <p className="text-sm font-medium text-rose-600 dark:text-rose-300">{t('auth.verifyLinkExpired')}</p>
        </div>
      )}
    </AuthLayout>
  );
}
