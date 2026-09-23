import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export interface Coupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt?: string;
  isActive: boolean;
}

const KEY = 'coupons';

export function useCoupons() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/coupons');
      return data.data as Coupon[];
    },
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      code: string;
      discountType: 'percentage' | 'fixed';
      discountValue: number;
      maxRedemptions?: number;
      expiresAt?: string;
    }) => {
      const { data } = await axiosInstance.post('/coupons', payload);
      return data.data as Coupon;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (couponId: string) => {
      await axiosInstance.delete(`/coupons/${couponId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
