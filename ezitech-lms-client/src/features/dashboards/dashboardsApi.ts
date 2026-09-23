import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';

export function useStudentDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/analytics/student');
      return data.data;
    },
  });
}

export function useInstructorDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'instructor'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/analytics/instructor');
      return data.data;
    },
  });
}

export interface MentorDashboard {
  courses: Array<{
    _id: string;
    title: string;
    slug: string;
    thumbnailUrl?: string;
    status: string;
    students: number;
    pendingSubmissions: number;
  }>;
  totals: { courses: number; students: number; pendingSubmissions: number };
  upcomingSessions: Array<{
    _id: string;
    title: string;
    scheduledAt: string;
    status: string;
    course: { _id: string; title: string };
  }>;
}

export function useMentorDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'mentor'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/analytics/mentor');
      return data.data as MentorDashboard;
    },
  });
}

export interface InstructorEarnings {
  paymentsEnabled?: boolean;
  commissionPercent: number;
  totalGrossRevenue: number;
  totalInstructorEarnings: number;
  courses: Array<{
    course: { _id: string; title: string; status: string };
    purchases: number;
    grossRevenue: number;
    instructorEarnings: number;
  }>;
}

export function useInstructorEarnings() {
  return useQuery({
    queryKey: ['dashboard', 'instructor', 'earnings'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/analytics/instructor/earnings');
      return data.data as InstructorEarnings;
    },
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/analytics/admin');
      return data.data;
    },
  });
}

export interface LearningStatistics {
  lessonsCompleted: number;
  totalTimeSpentSeconds: number;
  quizAveragePercent: number | null;
  quizAttempts: number;
  currentStreakDays: number;
}

export function useLearningStatistics() {
  return useQuery({
    queryKey: ['dashboard', 'student', 'statistics'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/analytics/student/statistics');
      return data.data as LearningStatistics;
    },
  });
}
