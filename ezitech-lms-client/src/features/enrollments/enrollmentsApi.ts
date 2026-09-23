import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export interface Enrollment {
  _id: string;
  student: string;
  course: { _id: string; title: string; slug: string; level: string } | string;
  status: 'active' | 'completed' | 'dropped';
  progressPercent: number;
  enrolledAt: string;
}

const KEY = 'enrollments';

export function useMyEnrollments() {
  return useQuery({
    queryKey: [KEY, 'me'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/enrollments/me');
      return data.data as Enrollment[];
    },
  });
}

export function useMyEnrollmentForCourse(courseId: string | undefined) {
  const { data: enrollments, ...rest } = useMyEnrollments();
  const enrollment = enrollments?.find(
    (e) => (typeof e.course === 'string' ? e.course : e.course._id) === courseId
  );
  return { enrollment, ...rest };
}

export function useEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, couponCode }: { courseId: string; couponCode?: string }) => {
      const { data } = await axiosInstance.post('/enrollments', { courseId, couponCode });
      return data.data as Enrollment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDropEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const { data } = await axiosInstance.patch(`/enrollments/${courseId}/drop`);
      return data.data as Enrollment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
