import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export interface CertificateTemplate {
  _id: string;
  name: string;
  isDefault: boolean;
  primaryColor: string;
  signatureName: string;
  signatureTitle: string;
  logoUrl?: string;
  footerText: string;
}

const KEY = 'certificate-templates';

export function useCertificateTemplates() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/certificate-templates');
      return data.data as CertificateTemplate[];
    },
  });
}

export function useCreateCertificateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CertificateTemplate> & { name: string }) => {
      const { data } = await axiosInstance.post('/certificate-templates', payload);
      return data.data as CertificateTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateCertificateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, updates }: { templateId: string; updates: Partial<CertificateTemplate> }) => {
      const { data } = await axiosInstance.patch(`/certificate-templates/${templateId}`, updates);
      return data.data as CertificateTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
