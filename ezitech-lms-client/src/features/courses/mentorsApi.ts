import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export interface MentorSummary {
  _id: string;
  name: string;
  email: string;
}

export function useMentorOptions(enabled: boolean) {
  return useQuery({
    queryKey: ['mentor-options'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/users/mentors');
      return data.data as MentorSummary[];
    },
    enabled,
  });
}

export function useCourseMentors(courseId: string | undefined) {
  return useQuery({
    queryKey: ['course-mentors', courseId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/courses/${courseId}/mentors`);
      return data.data as MentorSummary[];
    },
    enabled: !!courseId,
  });
}

export function useSetCourseMentors(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mentorIds: string[]) => {
      const { data } = await axiosInstance.put(`/courses/${courseId}/mentors`, { mentorIds });
      return data.data as MentorSummary[];
    },
    onSuccess: (mentors) => qc.setQueryData(['course-mentors', courseId], mentors),
  });
}
