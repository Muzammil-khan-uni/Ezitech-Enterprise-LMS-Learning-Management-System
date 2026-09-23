import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export interface Review {
  _id: string;
  student: { name: string };
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface RatingSummary {
  averageRating: number | null;
  totalReviews: number;
  distribution: Record<string, number>;
}

export interface InstructorFeedbackReport {
  course: { _id: string; title: string };
  averageRating: number | null;
  totalReviews: number;
  recentReviews: Array<{ rating: number; comment?: string; studentName: string; createdAt: string }>;
}

const KEY = 'reviews';

export function useCourseReviews(courseId: string | undefined) {
  return useQuery({
    queryKey: [KEY, courseId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/reviews/courses/${courseId}/reviews`);
      return data.data as Review[];
    },
    enabled: !!courseId,
  });
}

export function useCourseRatingSummary(courseId: string | undefined) {
  return useQuery({
    queryKey: [KEY, courseId, 'summary'],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/reviews/courses/${courseId}/rating-summary`);
      return data.data as RatingSummary;
    },
    enabled: !!courseId,
  });
}

export function useCreateReview(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { rating: number; comment?: string }) => {
      const { data } = await axiosInstance.post(`/reviews/courses/${courseId}/reviews`, payload);
      return data.data as Review;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, courseId] });
    },
  });
}

export function useInstructorFeedback() {
  return useQuery({
    queryKey: [KEY, 'instructor-feedback'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/analytics/instructor/feedback-reports');
      return data.data as InstructorFeedbackReport[];
    },
  });
}
