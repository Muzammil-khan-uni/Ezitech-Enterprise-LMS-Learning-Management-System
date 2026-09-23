import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, FileBadge, PlusCircle, Star } from 'lucide-react';
import {
  useCertificateTemplates,
  useCreateCertificateTemplate,
  useUpdateCertificateTemplate,
} from '../certificateTemplatesApi';
import FileUploadField from '@/features/uploads/components/FileUploadField';
import { Badge, Button, Card, EmptyState, Input } from '@/components/ui';
import { CourseCardSkeleton } from '@/components/ui/Skeleton';

export default function CertificateTemplatesAdminPage() {
  const { t } = useTranslation();
  const { data: templates, isLoading } = useCertificateTemplates();
  const createTemplate = useCreateCertificateTemplate();
  const updateTemplate = useUpdateCertificateTemplate();

  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1a237e');
  const [signatureName, setSignatureName] = useState('Ezitech Academy');
  const [signatureTitle, setSignatureTitle] = useState('Director of Programs');
  const [logoUrl, setLogoUrl] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await createTemplate.mutateAsync({ name, primaryColor, signatureName, signatureTitle, logoUrl });
    setName('');
    setLogoUrl('');
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{t('admin.certificateTemplatesTitle')}</h1>

      <Card className="mt-6 p-5">
        <h2 className="font-display mb-4 flex items-center gap-2 font-bold text-ink-800">
          <FileBadge className="size-[18px] text-brand-500" />
          {t('admin.newTemplate')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t('admin.name')} value={name} onChange={(e) => setName(e.target.value)} required />

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-ink-700">{t('admin.primaryColor')}</label>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="size-9 cursor-pointer rounded-lg border border-ink-200"
            />
          </div>

          <Input label={t('admin.signatureName')} value={signatureName} onChange={(e) => setSignatureName(e.target.value)} />
          <Input label={t('admin.signatureTitle')} value={signatureTitle} onChange={(e) => setSignatureTitle(e.target.value)} />
          <FileUploadField kind="image" label={t('admin.logo')} accept="image/*" currentUrl={logoUrl} onUploaded={(r) => setLogoUrl(r.url)} onClear={() => setLogoUrl('')} />

          <Button type="submit" isLoading={createTemplate.isPending} iconLeft={<PlusCircle className="size-4" />}>
            {t('admin.createTemplate')}
          </Button>
        </form>
      </Card>

      <div className="mt-6">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && templates?.length === 0 && <EmptyState icon={<FileBadge className="size-7" />} title={t('admin.noTemplatesYet')} />}

        {templates && templates.length > 0 && (
          <Card className="divide-y divide-ink-100 overflow-hidden">
            {templates.map((template, i) => (
              <motion.div
                key={template._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i, 10) * 0.03 }}
                className="flex items-center gap-3 px-4 py-3.5"
              >
                <span className="size-4 shrink-0 rounded-md border border-ink-200" style={{ background: template.primaryColor }} />
                <span className="flex-1 text-sm font-semibold text-ink-800">{template.name}</span>
                {template.isDefault && (
                  <Badge tone="success" icon={<BadgeCheck className="size-3" />}>
                    {t('admin.default')}
                  </Badge>
                )}
                {!template.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<Star className="size-3.5" />}
                    isLoading={updateTemplate.isPending}
                    onClick={() => updateTemplate.mutate({ templateId: template._id, updates: { isDefault: true } })}
                  >
                    {t('admin.setAsDefault')}
                  </Button>
                )}
              </motion.div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
