import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { Course, Section, Lesson, CourseStatus, Category } from './types';

const COURSES_KEY = 'courses';
const CATEGORIES_KEY = 'course-categories';

interface CoursesQueryParams {
  status?: CourseStatus;
  search?: string;
  category?: string;
  language?: string;
  page?: number;
  limit?: number;
}

interface CoursesPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function useCourses(params: CoursesQueryParams = {}) {
  return useQuery({
    queryKey: [COURSES_KEY, params],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/courses', { params });
      return { items: data.data as Course[], pagination: data.meta as CoursesPagination };
    },
  });
}

// Paged catalogue for the "Load more" list. Each filter combination is its own query, so changing a
// filter (or clearing the search box) starts a fresh list without any manual resetting.
export function useInfiniteCourses(params: Omit<CoursesQueryParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: [COURSES_KEY, 'infinite', params],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await axiosInstance.get('/courses', { params: { ...params, page: pageParam } });
      return { items: data.data as Course[], pagination: data.meta as CoursesPagination };
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages ? lastPage.pagination.page + 1 : undefined,
  });
}

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: [COURSES_KEY, courseId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/courses/${courseId}`);
      return data.data as Course;
    },
    enabled: !!courseId,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Course> & { title: string; category: string }) => {
      const { data } = await axiosInstance.post('/courses', payload);
      return data.data as Course;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [COURSES_KEY] }),
  });
}

export function useUpdateCourse(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await axiosInstance.patch(`/courses/${courseId}`, payload);
      return data.data as Course;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COURSES_KEY, courseId] });
      qc.invalidateQueries({ queryKey: [COURSES_KEY] });
    },
  });
}

export function useSetCourseStatus(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: CourseStatus) => {
      const { data } = await axiosInstance.patch(`/courses/${courseId}/status`, { status });
      return data.data as Course;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [COURSES_KEY, courseId] }),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: [CATEGORIES_KEY],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/course-categories');
      return data.data as Category[];
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; parentCategory?: string }) => {
      const { data } = await axiosInstance.post('/course-categories', payload);
      return data.data as Category;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (categoryId: string) => {
      await axiosInstance.delete(`/course-categories/${categoryId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] }),
  });
}

export function useSections(courseId: string | undefined) {
  return useQuery({
    queryKey: [COURSES_KEY, courseId, 'sections'],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/courses/${courseId}/sections`);
      return data.data as Section[];
    },
    enabled: !!courseId,
  });
}

export function useAddSection(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; order: number }) => {
      const { data } = await axiosInstance.post(`/courses/${courseId}/sections`, payload);
      return data.data as Section;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [COURSES_KEY, courseId, 'sections'] }),
  });
}

export function useLessons(courseId: string | undefined) {
  return useQuery({
    queryKey: [COURSES_KEY, courseId, 'lessons'],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/courses/${courseId}/lessons`);
      return data.data as Lesson[];
    },
    enabled: !!courseId,
  });
}

export function useAddLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await axiosInstance.post(`/courses/${courseId}/lessons`, payload);
      return data.data as Lesson;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [COURSES_KEY, courseId, 'lessons'] }),
  });
}
