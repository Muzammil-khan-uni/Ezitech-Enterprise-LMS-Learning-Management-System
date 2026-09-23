import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export interface AttendanceRecord {
  _id: string;
  liveSession: { _id: string; title: string; scheduledAt: string };
  course: { _id: string; title: string };
  student?: { name: string; email: string };
  joinedAt: string;
  leftAt?: string;
  durationSeconds: number;
  isPresent: boolean;
}

export function useMyAttendance() {
  return useQuery({
    queryKey: ['attendance', 'me'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/attendance/me');
      return data.data as AttendanceRecord[];
    },
  });
}

export function useSessionAttendance(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['attendance', 'session', sessionId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/attendance/live-classes/${sessionId}`);
      return data.data as AttendanceRecord[];
    },
    enabled: !!sessionId,
  });
}
