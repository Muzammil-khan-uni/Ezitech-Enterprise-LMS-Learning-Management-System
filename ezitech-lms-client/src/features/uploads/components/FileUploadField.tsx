import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, FileText, ImageOff, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { useFileUpload, UploadKind, UploadResult } from '../uploadsApi';
import {
  describeUploadError,
  formatBytes,
  UPLOAD_RULES,
  validateUploadFile,
  type UploadProblem,
} from '../uploadErrors';

interface FileUploadFieldProps {
  kind: UploadKind;
  label: string;
  onUploaded: (result: UploadResult) => void;
  /** Lets the person remove the uploaded file again. The remove button only shows when this is given. */
  onClear?: () => void;
  currentUrl?: string;
  accept?: string;
}

interface PickedFile {
  name: string;
  size: number;
  previewUrl?: string;
}

function fileNameFromUrl(url?: string): string {
  if (!url) return '';
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
    return decodeURIComponent(last);
  } catch {
    return url;
  }
}

export default function FileUploadField({ kind, label, onUploaded, onClear, currentUrl, accept }: FileUploadFieldProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const upload = useFileUpload(kind, setProgress);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickedRef = useRef<PickedFile | null>(null);
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [problem, setProblem] = useState<UploadProblem | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  function replacePicked(next: PickedFile | null) {
    if (pickedRef.current?.previewUrl) URL.revokeObjectURL(pickedRef.current.previewUrl);
    pickedRef.current = next;
    setPicked(next);
  }

  useEffect(
    () => () => {
      if (pickedRef.current?.previewUrl) URL.revokeObjectURL(pickedRef.current.previewUrl);
    },
    []
  );

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;

    const invalid = validateUploadFile(file, kind);
    if (invalid) {
      setProblem(invalid);
      return;
    }

    setProblem(null);
    setPreviewFailed(false);
    setProgress(0);
    replacePicked({
      name: file.name,
      size: file.size,
      previewUrl: kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : undefined,
    });

    try {
      const result = await upload.mutateAsync(file);
      onUploaded(result);
    } catch (error) {
      setProblem(describeUploadError(error, kind));
      replacePicked(null);
    }
  }

  function handleClear() {
    replacePicked(null);
    setProblem(null);
    onClear?.();
  }

  const isPending = upload.isPending;
  const hasFile = Boolean(currentUrl) || isPending;
  const previewSrc = picked?.previewUrl ?? (kind === 'image' || kind === 'video' ? currentUrl : undefined);
  const fileName = picked?.name ?? fileNameFromUrl(currentUrl);
  const maxMb = UPLOAD_RULES[kind].maxMb;

  return (
    <div className="mb-1">
      <label className="mb-1.5 block text-sm font-semibold text-ink-700">{label}</label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="focus-ring flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 bg-ink-50/60 px-4 py-2.5 text-sm font-semibold text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
          <UploadCloud className="size-4" />
          {hasFile ? t('upload.replaceFile') : t('upload.chooseFile')}
          <input ref={inputRef} type="file" accept={accept} onChange={handleChange} disabled={isPending} className="hidden" />
        </label>
        <span className="text-xs text-ink-400">{t(`upload.hint.${kind}`, { max: maxMb })}</span>
      </div>

      {hasFile && (
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-ink-200 bg-surface p-2.5">
          <div className="relative shrink-0 overflow-hidden rounded-lg bg-ink-50">
            {kind === 'image' &&
              (previewSrc && !previewFailed ? (
                <img
                  src={previewSrc}
                  alt={t('upload.previewAlt')}
                  onError={() => setPreviewFailed(true)}
                  className="block max-h-32 w-40 object-contain sm:w-48"
                />
              ) : (
                <div className="flex h-24 w-40 flex-col items-center justify-center gap-1 text-xs text-ink-400 sm:w-48">
                  <ImageOff className="size-6" />
                  {t('upload.previewUnavailable')}
                </div>
              ))}
            {kind === 'video' &&
              (previewSrc ? (
                <video src={previewSrc} controls preload="metadata" className="block max-h-36 w-52 bg-black" />
              ) : (
                <div className="flex size-14 items-center justify-center text-ink-400">
                  <FileText className="size-6" />
                </div>
              ))}
            {kind !== 'image' && kind !== 'video' && (
              <div className="flex size-14 items-center justify-center text-brand-500">
                <FileText className="size-6" />
              </div>
            )}
            {isPending && kind !== 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
                <Loader2 className="size-6 animate-spin text-brand-600" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 py-0.5">
            <p className="truncate text-sm font-semibold text-ink-800" title={fileName}>
              {fileName}
            </p>
            {picked && <p className="text-xs text-ink-400">{formatBytes(picked.size)}</p>}
            {isPending ? (
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink-500">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t('upload.uploadingPercent', { percent: progress })}
                </p>
              </div>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5 shrink-0" />
                {t('upload.uploaded')}
              </p>
            )}
          </div>

          {onClear && !isPending && (
            <button
              type="button"
              onClick={handleClear}
              aria-label={t('upload.remove')}
              title={t('upload.remove')}
              className="focus-ring flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      )}

      {problem && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-medium text-rose-600">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {t(problem.key, problem.values)}
        </p>
      )}
    </div>
  );
}
