import { useMutation } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export interface ScormUploadResult {
  packageUrl: string;
  entryPoint: string;
  scormVersion: '1.2';
}

export function useUploadScormPackage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axiosInstance.post('/scorm/packages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as ScormUploadResult;
    },
  });
}
