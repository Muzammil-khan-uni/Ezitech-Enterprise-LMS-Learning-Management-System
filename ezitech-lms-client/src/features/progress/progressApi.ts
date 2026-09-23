import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

interface CourseProgress {
  progressPercent: number;
  lessons: Array<{ lesson: string; isCompleted: boolean }>;
}

const KEY = 'progress';

export function useCourseProgress(courseId: string | undefined) {
  return useQuery({
    queryKey: [KEY, courseId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/progress/courses/${courseId}`);
      return data.data as CourseProgress;
    },
    enabled: !!courseId,
  });
}

export function useMarkLessonComplete(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { data } = await axiosInstance.post(`/progress/courses/${courseId}/lessons/${lessonId}/complete`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, courseId] });
      qc.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}
