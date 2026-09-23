import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

interface AppConfig {
  paymentsEnabled: boolean;
}

export function useAppConfig(): AppConfig {
  const { data } = useQuery({
    queryKey: ['app-config'],
    queryFn: async () => {
      const { data: response } = await axiosInstance.get('/config');
      return response.data as AppConfig;
    },
    staleTime: Infinity,
    retry: 1,
  });
  return data ?? { paymentsEnabled: true };
}
