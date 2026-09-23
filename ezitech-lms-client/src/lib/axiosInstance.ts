import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { store } from '@/app/store';
import { setAccessToken, clearCredentials } from '@/features/auth/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function refreshAccessToken(): Promise<string> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
      return data.data.accessToken as string;
    } catch (error) {
      const raced = axios.isAxiosError(error) && error.response?.status === 409;
      if (!raced || attempt >= 3) throw error;
      await wait(250 * (attempt + 1));
    }
  }
}

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error || !token) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login')
      || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status !== 401 || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(axiosInstance(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const newAccessToken = await refreshAccessToken();

      store.dispatch(setAccessToken(newAccessToken));
      flushQueue(null, newAccessToken);

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      store.dispatch(clearCredentials());
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosInstance;
