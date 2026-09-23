import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Award, Download, BadgeCheck } from 'lucide-react';
import { useMyCertificates } from '../certificatesApi';
import { Card, EmptyState } from '@/components/ui';
import { CourseCardSkeleton } from '@/components/ui/Skeleton';
import { downloadAuthenticatedFile, readBlobError } from '@/lib/download';

export default function MyCertificatesPage() {
  const { t } = useTranslation();
  const { data: certificates, isLoading } = useMyCertificates();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload(certificateId: string, certificateNumber: string) {
    setDownloadingId(certificateId);
    setDownloadError(null);
    try {
      await downloadAuthenticatedFile(
        `/certificates/${certificateId}/download`,
        `${certificateNumber}.pdf`
      );
    } catch (err) {
      setDownloadError((await readBlobError(err)) ?? t('certificates.downloadFailed'));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('certificates.title')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('certificates.subtitle')}</p>

      {downloadError && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
          {downloadError}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <CourseCardSkeleton key={i} />)}

        {!isLoading && certificates?.length === 0 && (
          <div className="sm:col-span-2">
            <EmptyState
              icon={<Award className="size-7" />}
              title={t('certificates.noCertificates')}
              description={t('certificates.completeToEarn')}
            />
          </div>
        )}

        {certificates?.map((cert, i) => (
          <motion.div
            key={cert._id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.06 }}
          >
            <Card hoverLift className="relative overflow-hidden p-5">
              <div className="bg-gradient-brand absolute -right-6 -top-6 flex size-24 items-center justify-center rounded-full opacity-10" />
              <div className="flex items-start gap-3">
                <span className="bg-gradient-brand flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lift">
                  <BadgeCheck className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display truncate text-base font-bold text-ink-900" title={cert.course.title}>{cert.course.title}</h3>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {cert.certificateNumber} · {t('certificates.issuedOn', { date: new Date(cert.issuedAt).toLocaleDateString() })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(cert._id, cert.certificateNumber)}
                disabled={downloadingId === cert._id}
                className="focus-ring mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-60"
              >
                <Download className="size-4" />
                {downloadingId === cert._id ? t('common.loading') : t('certificates.downloadPdf')}
              </button>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
