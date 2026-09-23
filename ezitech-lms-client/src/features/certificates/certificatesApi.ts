import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

interface Certificate {
  _id: string;
  certificateNumber: string;
  course: { title: string };
  issuedAt: string;
}

interface VerificationResult {
  valid: boolean;
  reason?: string;
  certificateNumber?: string;
  studentName?: string;
  courseTitle?: string;
  issuedAt?: string;
}

export function useMyCertificates() {
  return useQuery({
    queryKey: ['certificates', 'me'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/certificates/me');
      return data.data as Certificate[];
    },
  });
}

export function useVerifyCertificate(code: string | undefined) {
  return useQuery({
    queryKey: ['certificates', 'verify', code],
    queryFn: async () => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${baseUrl}/certificates/verify/${code}`);
      const json = await res.json();
      return json.data as VerificationResult;
    },
    enabled: !!code,
  });
}
