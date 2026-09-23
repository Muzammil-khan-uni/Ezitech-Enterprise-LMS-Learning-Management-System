import axios from 'axios';
import type { UploadKind } from './uploadsApi';

export const UPLOAD_RULES: Record<UploadKind, { maxMb: number; accepts: (file: File) => boolean }> = {
  image: { maxMb: 5, accepts: (f) => f.type.startsWith('image/') },
  video: { maxMb: 200, accepts: (f) => f.type.startsWith('video/') },
  pdf: { maxMb: 20, accepts: (f) => f.type === 'application/pdf' },
  download: { maxMb: 50, accepts: () => true },
};

export interface UploadProblem {
  key: string;
  values?: Record<string, string | number>;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Checks the file in the browser first, so a wrong or oversized file is rejected instantly with a clear
// message instead of after a slow upload. The server enforces the same limits.
export function validateUploadFile(file: File, kind: UploadKind): UploadProblem | null {
  const rule = UPLOAD_RULES[kind];
  if (file.size === 0) return { key: 'upload.errors.empty', values: { name: file.name } };
  if (!rule.accepts(file)) return { key: `upload.errors.invalidType.${kind}` };
  if (file.size > rule.maxMb * 1024 * 1024) {
    return { key: 'upload.errors.tooLarge', values: { name: file.name, size: formatBytes(file.size), max: rule.maxMb } };
  }
  return null;
}

// Maps whatever the upload request threw to a translation key. Server wording is never shown to the user.
export function describeUploadError(error: unknown, kind: UploadKind): UploadProblem {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return { key: error.code === 'ECONNABORTED' ? 'upload.errors.timeout' : 'upload.errors.network' };
    }
    const { status, data } = error.response as { status: number; data?: { code?: string; maxMb?: number } };
    switch (data?.code) {
      case 'FILE_TOO_LARGE':
        return { key: 'upload.errors.tooLargeServer', values: { max: data.maxMb ?? UPLOAD_RULES[kind].maxMb } };
      case 'INVALID_FILE_TYPE':
        return { key: `upload.errors.invalidType.${kind}` };
      case 'UPLOADS_UNAVAILABLE':
        return { key: 'upload.errors.unavailable' };
      case 'UPLOAD_FAILED':
      case 'UPLOAD_REJECTED':
        return { key: 'upload.errors.failed' };
      default:
        break;
    }
    if (status === 413) return { key: 'upload.errors.tooLargeServer', values: { max: UPLOAD_RULES[kind].maxMb } };
    if (status === 401) return { key: 'upload.errors.sessionExpired' };
    if (status === 403) return { key: 'upload.errors.forbidden' };
    if (status === 429) return { key: 'upload.errors.tooMany' };
    if (status >= 500) return { key: 'upload.errors.failed' };
  }
  return { key: 'upload.errors.generic' };
}
