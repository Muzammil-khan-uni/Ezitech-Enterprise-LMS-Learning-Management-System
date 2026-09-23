import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export interface PathCourseEntry {
  course: { _id: string; title: string; level: string };
  order: number;
}

export interface LearningPath {
  _id: string;
  title: string;
  description?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  courses: PathCourseEntry[];
  isPublished: boolean;
}

export interface PathProgressCourse {
  course: { _id: string; title: string; level: string };
  order: number;
  status: 'not_started' | 'active' | 'completed' | 'dropped';
  progressPercent: number;
}

export interface PathProgress {
  path: { _id: string; title: string; level: string };
  courses: PathProgressCourse[];
  completedCount: number;
  totalCount: number;
  percent: number;
  nextCourse: PathProgressCourse | null;
  hasStarted: boolean;
}

const KEY = 'learning-paths';

export function usePaths(params: { level?: string; isPublished?: boolean } = {}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/learning-paths', { params });
      return data.data as LearningPath[];
    },
  });
}

export function usePath(pathId: string | undefined) {
  return useQuery({
    queryKey: [KEY, pathId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/learning-paths/${pathId}`);
      return data.data as LearningPath;
    },
    enabled: !!pathId,
  });
}

export function useMyPaths() {
  return useQuery({
    queryKey: [KEY, 'mine'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/learning-paths/mine');
      return data.data as PathProgress[];
    },
  });
}

export function usePathProgress(pathId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [KEY, pathId, 'my-progress'],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/learning-paths/${pathId}/my-progress`);
      return data.data as PathProgress;
    },
    enabled: enabled && !!pathId,
  });
}

export function useEnrollInPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pathId: string) => {
      await axiosInstance.post(`/enrollments/learning-paths/${pathId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, 'mine'] });
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function useCreatePath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; description?: string; level: string }) => {
      const { data } = await axiosInstance.post('/learning-paths', payload);
      return data.data as LearningPath;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdatePath(pathId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<{ title: string; description: string; level: string; isPublished: boolean }>) => {
      const { data } = await axiosInstance.patch(`/learning-paths/${pathId}`, payload);
      return data.data as LearningPath;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, pathId] });
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function useSetPathCourses(pathId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courses: { course: string; order: number }[]) => {
      const { data } = await axiosInstance.put(`/learning-paths/${pathId}/courses`, { courses });
      return data.data as LearningPath;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, pathId] });
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function useDeletePath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pathId: string) => {
      await axiosInstance.delete(`/learning-paths/${pathId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
