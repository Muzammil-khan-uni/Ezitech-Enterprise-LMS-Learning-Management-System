import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export interface LiveSession {
  _id: string;
  course: { _id: string; title: string } | string;
  instructor: { _id: string; name: string } | string;
  title: string;
  description?: string;
  scheduledAt: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  roomId: string;
}

const KEY = 'live-classes';

export function useCourseLiveSessions(courseId: string | undefined) {
  return useQuery({
    queryKey: [KEY, courseId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/live-classes/courses/${courseId}`);
      return data.data as LiveSession[];
    },
    enabled: !!courseId,
    refetchInterval: 15000,
  });
}

export function useLiveSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'session', sessionId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/live-classes/${sessionId}`);
      return data.data as LiveSession;
    },
    enabled: !!sessionId,
  });
}

export function useScheduleLiveSession(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; description?: string; scheduledAt: string }) => {
      const { data } = await axiosInstance.post(`/live-classes/courses/${courseId}`, payload);
      return data.data as LiveSession;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, courseId] }),
  });
}

export function useStartLiveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await axiosInstance.post(`/live-classes/${sessionId}/start`);
      return data.data as LiveSession;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useEndLiveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await axiosInstance.post(`/live-classes/${sessionId}/end`);
      return data.data as LiveSession;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
