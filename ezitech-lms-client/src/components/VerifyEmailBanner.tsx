import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MailWarning, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useResendVerification } from '@/features/auth/authApi';

export default function VerifyEmailBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const resend = useResendVerification();
  const [sent, setSent] = useState(false);

  if (!user || user.isEmailVerified) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
      <span className="flex items-center gap-1.5">
        <MailWarning className="size-4 shrink-0" />
        {t('common.verifyEmailBanner')}
      </span>
      {sent ? (
        <span className="flex items-center gap-1 font-semibold">
          <CheckCircle2 className="size-3.5" />
          {t('common.verificationEmailSent')}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => {
            resend.mutate();
            setSent(true);
          }}
          disabled={resend.isPending}
          className="focus-ring font-semibold underline decoration-dotted underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
        >
          {t('common.resendVerificationEmail')}
        </button>
      )}
    </div>
  );
}
