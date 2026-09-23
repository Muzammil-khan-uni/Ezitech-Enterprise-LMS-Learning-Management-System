import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import axiosInstance from '@/lib/axiosInstance';
import { updateUser } from '@/features/auth/authSlice';

export type Role = 'student' | 'instructor' | 'mentor' | 'course_manager' | 'admin';

export interface EducationEntry {
  _id?: string;
  school: string;
  degree?: string;
  field?: string;
  startYear?: number | null;
  endYear?: number | null;
  description?: string;
}

export interface ProfileUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  avatar?: { url?: string };
  phone?: string;
  bio?: string;
  skills?: string[];
  education?: EducationEntry[];
  socialLinks?: { github?: string; linkedin?: string };
  createdAt?: string;
  lastLoginAt?: string;
}

export interface ProfilePatch {
  name?: string;
  phone?: string | null;
  bio?: string | null;
  skills?: string[];
  education?: EducationEntry[];
  socialLinks?: { github?: string | null; linkedin?: string | null };
}

interface FullProfile {
  user: ProfileUser;
  roleProfile: Record<string, unknown> | null;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  lockedUntil?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function useMyProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/users/me');
      return data.data as FullProfile;
    },
  });
}

function useApplyProfileUser() {
  const qc = useQueryClient();
  const dispatch = useDispatch();
  return (user: ProfileUser) => {
    qc.setQueryData<FullProfile>(['profile', 'me'], (old) => (old ? { ...old, user } : old));
    dispatch(
      updateUser({
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar ?? {},
        phone: user.phone,
      })
    );
  };
}

export function useUpdateProfile() {
  const apply = useApplyProfileUser();
  return useMutation({
    mutationFn: async (payload: ProfilePatch) => {
      const { data } = await axiosInstance.patch('/users/me', payload);
      return data.data as ProfileUser;
    },
    onSuccess: apply,
  });
}

export function useUploadAvatar() {
  const apply = useApplyProfileUser();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axiosInstance.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as ProfileUser;
    },
    onSuccess: apply,
  });
}

export function useRemoveAvatar() {
  const apply = useApplyProfileUser();
  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.delete('/users/me/avatar');
      return data.data as ProfileUser;
    },
    onSuccess: apply,
  });
}

export function useChangeEmail() {
  const apply = useApplyProfileUser();
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await axiosInstance.post('/users/me/email', payload);
      return data.data as ProfileUser;
    },
    onSuccess: apply,
  });
}

export function useUpdateRoleProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await axiosInstance.patch('/users/me/role-profile', payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', 'me'] }),
  });
}

const USERS_KEY = 'admin-users';

export function useUsers(params: { role?: Role; status?: 'active' | 'inactive'; search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [USERS_KEY, params],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/users', { params });
      return { items: data.data as AdminUser[], pagination: data.meta as Pagination };
    },
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; email: string; role: Role }) => {
      const { data } = await axiosInstance.post('/users/invite', payload);
      return data.data as AdminUser;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}

export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await axiosInstance.post(`/users/${userId}/unlock`);
      return data.data as AdminUser;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}

export function useSetUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { data } = await axiosInstance.patch(`/users/${userId}/status`, { isActive });
      return data.data as AdminUser;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}
