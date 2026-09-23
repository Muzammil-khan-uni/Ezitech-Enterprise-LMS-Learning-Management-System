import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import axiosInstance from '@/lib/axiosInstance';
import { setCredentials, setAccessToken, clearCredentials, AuthUser } from './authSlice';

interface LoginPayload {
  email: string;
  password: string;
  mfaToken?: string;
  recoveryCode?: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

interface LoginResponse {
  data: { user: AuthUser; accessToken: string };
}

export function useLogin() {
  const dispatch = useDispatch();
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await axiosInstance.post<LoginResponse>('/auth/login', payload);
      return data.data;
    },
    onSuccess: ({ user, accessToken }) => {
      dispatch(setCredentials({ user, accessToken }));
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await axiosInstance.post('/auth/register', payload);
      return data.data;
    },
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: async (payload: { token: string; password: string }) => {
      await axiosInstance.post('/auth/set-password', payload);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      await axiosInstance.post('/auth/forgot-password', { email });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: { token: string; password: string }) => {
      await axiosInstance.post('/auth/reset-password', payload);
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      await axiosInstance.post('/auth/verify-email', { token });
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: async () => {
      await axiosInstance.post('/auth/resend-verification');
    },
  });
}

export function useLogout() {
  const dispatch = useDispatch();
  return useMutation({
    mutationFn: async () => {
      await axiosInstance.post('/auth/logout');
    },
    onSettled: () => {
      dispatch(clearCredentials());
    },
  });
}

interface MfaSetupResult {
  secret: string;
  qrCodeDataUrl: string;
}

export function useMfaSetup() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post('/auth/mfa/setup');
      return data.data as MfaSetupResult;
    },
  });
}

export function useMfaVerify() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data } = await axiosInstance.post('/auth/mfa/verify', { token });
      return data.data as { recoveryCodes: string[] };
    },
  });
}

export function useMfaDisable() {
  return useMutation({
    mutationFn: async (payload: { password: string; token?: string; recoveryCode?: string }) => {
      await axiosInstance.post('/auth/mfa/disable', payload);
    },
  });
}

export function useChangePassword() {
  const dispatch = useDispatch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      const { data } = await axiosInstance.post('/auth/change-password', payload);
      return data.data as { accessToken: string };
    },
    onSuccess: ({ accessToken }) => {
      dispatch(setAccessToken(accessToken));
      qc.invalidateQueries({ queryKey: ['auth', 'devices'] });
    },
  });
}

export interface DeviceSession {
  _id: string;
  deviceInfo: { userAgent?: string; ip?: string; label?: string };
  lastActiveAt: string;
  createdAt: string;
}

export function useDevices() {
  return useQuery({
    queryKey: ['auth', 'devices'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/auth/devices');
      return data.data as DeviceSession[];
    },
  });
}

export function useRevokeDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await axiosInstance.delete(`/auth/devices/${sessionId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth', 'devices'] }),
  });
}

export function useRecoveryCodeStatus() {
  return useQuery({
    queryKey: ['auth', 'recovery-codes'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/auth/mfa/recovery-codes');
      return data.data as { remaining: number | null };
    },
  });
}

export function useRegenerateRecoveryCodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { password: string; token: string }) => {
      const { data } = await axiosInstance.post('/auth/mfa/recovery-codes/regenerate', payload);
      return data.data as { recoveryCodes: string[] };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth', 'recovery-codes'] }),
  });
}
