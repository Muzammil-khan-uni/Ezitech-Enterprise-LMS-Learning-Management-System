import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, Loader2, ShieldX, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVerifyCertificate } from '../certificatesApi';
import PublicHeader from '@/components/layout/PublicHeader';
import { Card } from '@/components/ui';

export default function VerifyCertificatePage() {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const { data, isLoading } = useVerifyCertificate(code);

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">{t('verifyCertificate.title')}</h1>

        {isLoading && (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} className="mt-8 text-brand-500">
            <Loader2 className="size-8" />
          </motion.div>
        )}

        {data && !data.valid && (
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 w-full">
            <Card className="border-rose-200 p-8">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300">
                <ShieldX className="size-7" />
              </span>
              <p className="mt-4 font-semibold text-rose-600">{data.reason || t('verifyCertificate.invalidCertificate')}</p>
            </Card>
          </motion.div>
        )}

        {data?.valid && (
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 w-full">
            <Card className="relative overflow-hidden p-8">
              <div className="bg-gradient-brand absolute -right-8 -top-8 size-32 rounded-full opacity-10" />
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}
                className="bg-gradient-brand mx-auto flex size-14 items-center justify-center rounded-2xl text-white shadow-lift"
              >
                <BadgeCheck className="size-7" />
              </motion.span>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-600">
                <Sparkles className="size-4" /> {t('verifyCertificate.validCertificate')}
              </p>
              <p className="font-display mt-4 text-xl font-extrabold text-ink-900">{data.studentName}</p>
              <p className="mt-1 text-sm text-ink-500">{t('verifyCertificate.hasCompleted')}</p>
              <p className="font-display mt-1 text-lg font-bold text-brand-700">{data.courseTitle}</p>
              <p className="mt-4 text-xs text-ink-400">
                {t('verifyCertificate.certificateNo', { number: data.certificateNumber, date: data.issuedAt ? new Date(data.issuedAt).toLocaleDateString() : '' })}
              </p>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
