import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export interface Thread {
  _id: string;
  course: string;
  title: string;
  body: string;
  author: { name: string; role: string };
  isAnnouncement: boolean;
  isPinned: boolean;
  isLocked: boolean;
  commentCount: number;
  createdAt: string;
}

export interface Comment {
  _id: string;
  thread: string;
  body: string;
  author: { name: string; role: string };
  isInstructorReply: boolean;
  createdAt: string;
}

const KEY = 'discussions';

export function useThreads(courseId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'threads', courseId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/discussions/courses/${courseId}/threads`);
      return data.data as Thread[];
    },
    enabled: !!courseId,
  });
}

export function useCreateThread(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; body: string; isAnnouncement?: boolean }) => {
      const { data } = await axiosInstance.post(`/discussions/courses/${courseId}/threads`, payload);
      return data.data as Thread;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'threads', courseId] }),
  });
}

export function useComments(threadId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'comments', threadId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/discussions/threads/${threadId}/comments`);
      return data.data as Comment[];
    },
    enabled: !!threadId,
  });
}

export function useAddComment(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data } = await axiosInstance.post(`/discussions/threads/${threadId}/comments`, { body });
      return data.data as Comment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'comments', threadId] }),
  });
}
