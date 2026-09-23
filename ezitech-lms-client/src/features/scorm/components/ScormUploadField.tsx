import { useRef } from 'react';
import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from 'lucide-react';
import { useUploadScormPackage, ScormUploadResult } from '../scormApi';

interface ScormUploadFieldProps {
  onUploaded: (result: ScormUploadResult) => void;
  isUploaded: boolean;
}

export default function ScormUploadField({ onUploaded, isUploaded }: ScormUploadFieldProps) {
  const upload = useUploadScormPackage();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload.mutateAsync(file);
    onUploaded(result);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="mb-1">
      <label className="mb-1.5 block text-sm font-semibold text-ink-700">SCORM package (.zip)</label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="focus-ring flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 bg-ink-50/60 px-4 py-2.5 text-sm font-semibold text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
          <UploadCloud className="size-4" />
          Choose .zip file
          <input ref={inputRef} type="file" accept=".zip" onChange={handleChange} disabled={upload.isPending} className="hidden" />
        </label>
        {upload.isPending && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-ink-500">
            <Loader2 className="size-4 animate-spin" />
            Validating & uploading…
          </span>
        )}
      </div>
      {isUploaded && !upload.isPending && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5 shrink-0" />
          Package uploaded — check the detected launch file below.
        </p>
      )}
      {upload.isError && (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-300">
          <AlertCircle className="size-3.5 shrink-0" />
          {(upload.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Upload failed — make sure this is a valid SCORM 1.2 zip package.'}
        </p>
      )}
    </div>
  );
}
