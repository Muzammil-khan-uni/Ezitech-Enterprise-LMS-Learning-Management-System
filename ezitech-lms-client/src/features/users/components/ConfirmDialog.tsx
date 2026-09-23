import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from '@/components/ui';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  isLoading,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
          <TriangleAlert className="size-5" />
        </div>
        <p className="pt-1 text-sm leading-relaxed text-ink-600">{message}</p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel ?? t('common.delete')}
        </Button>
      </div>
    </Modal>
  );
}
