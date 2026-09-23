import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const KEY = 'notifications';

export function useNotifications() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/notifications');
      return { items: data.data as Notification[], unreadCount: data.meta?.unreadCount ?? 0 };
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await axiosInstance.patch(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await axiosInstance.patch('/notifications/read-all');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
