import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { Assessment, AssessmentInput, Submission } from './types';

const KEY = 'assessments';

export function useCourseAssessments(courseId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'course', courseId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/assessments/course/${courseId}`);
      return data.data as Assessment[];
    },
    enabled: !!courseId,
  });
}

export function useAssessment(assessmentId: string | undefined) {
  return useQuery({
    queryKey: [KEY, assessmentId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/assessments/${assessmentId}`);
      return data.data as Assessment;
    },
    enabled: !!assessmentId,
  });
}

export function useCreateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AssessmentInput & { course: string }) => {
      const { data } = await axiosInstance.post('/assessments', payload);
      return data.data as Assessment;
    },
    onSuccess: (assessment) => qc.invalidateQueries({ queryKey: [KEY, 'course', assessment.course] }),
  });
}

export function useUpdateAssessment(assessmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AssessmentInput>) => {
      const { data } = await axiosInstance.patch(`/assessments/${assessmentId}`, payload);
      return data.data as Assessment;
    },
    onSuccess: (assessment) => {
      qc.invalidateQueries({ queryKey: [KEY, assessmentId] });
      qc.invalidateQueries({ queryKey: [KEY, 'course', assessment.course] });
    },
  });
}

export function useDeleteAssessment(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assessmentId: string) => {
      await axiosInstance.delete(`/assessments/${assessmentId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'course', courseId] }),
  });
}

export function useStartAttempt() {
  return useMutation({
    mutationFn: async (assessmentId: string) => {
      const { data } = await axiosInstance.post(`/assessments/${assessmentId}/attempts`);
      return data.data as { submission: Submission; assessment: Assessment };
    },
  });
}

export function useSubmitAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      submissionId,
      payload,
    }: {
      submissionId: string;
      payload: Record<string, unknown>;
    }) => {
      const { data } = await axiosInstance.post(`/assessments/attempts/${submissionId}/submit`, payload);
      return data.data as Submission;
    },
    onSuccess: (_, { submissionId }) => {
      qc.invalidateQueries({ queryKey: [KEY, 'my-submissions'] });
      void submissionId;
    },
  });
}

export function useMySubmissions(assessmentId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'my-submissions', assessmentId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/assessments/${assessmentId}/attempts/me`);
      return data.data as Submission[];
    },
    enabled: !!assessmentId,
  });
}

export function usePendingSubmissions(assessmentId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'pending', assessmentId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/assessments/${assessmentId}/submissions`);
      return data.data as Array<Submission & { student: { name: string; email: string } }>;
    },
    enabled: !!assessmentId,
  });
}

export function useGradeSubmission(assessmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      submissionId,
      score,
      feedback,
    }: {
      submissionId: string;
      score: number;
      feedback: string;
    }) => {
      const { data } = await axiosInstance.patch(`/assessments/submissions/${submissionId}/grade`, {
        score,
        feedback,
      });
      return data.data as Submission;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'pending', assessmentId] }),
  });
}
