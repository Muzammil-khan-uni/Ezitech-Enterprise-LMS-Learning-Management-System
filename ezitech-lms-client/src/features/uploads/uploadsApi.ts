import { useMutation } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export type UploadKind = 'video' | 'pdf' | 'image' | 'download';

export interface UploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  durationSeconds?: number;
}

export function useFileUpload(kind: UploadKind, onProgress?: (percent: number) => void) {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axiosInstance.post(`/uploads/${kind}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      return data.data as UploadResult;
    },
  });
}
