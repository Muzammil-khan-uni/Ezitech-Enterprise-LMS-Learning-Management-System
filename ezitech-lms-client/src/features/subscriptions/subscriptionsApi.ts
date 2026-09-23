import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export interface Plan {
  _id: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  coursesIncluded: 'all' | string[];
}

interface ActiveSubscription {
  _id: string;
  plan: Plan;
  expiresAt: string;
}

export function usePlans() {
  return useQuery({
    queryKey: ['subscriptions', 'plans'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/subscriptions/plans');
      return data.data as Plan[];
    },
  });
}

export function useMySubscription() {
  return useQuery({
    queryKey: ['subscriptions', 'me'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/subscriptions/me');
      return data.data as ActiveSubscription | null;
    },
  });
}

export function useSubscribe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      const { data } = await axiosInstance.post('/subscriptions/subscribe', { planId });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions', 'me'] }),
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; price: number; durationDays: number }) => {
      const { data } = await axiosInstance.post('/subscriptions/plans', payload);
      return data.data as Plan;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions', 'plans'] }),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, updates }: { planId: string; updates: Record<string, unknown> }) => {
      const { data } = await axiosInstance.patch(`/subscriptions/plans/${planId}`, updates);
      return data.data as Plan;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions', 'plans'] }),
  });
}
