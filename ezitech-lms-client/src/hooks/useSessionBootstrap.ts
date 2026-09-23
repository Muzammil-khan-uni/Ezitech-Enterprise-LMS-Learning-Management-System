import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { refreshAccessToken } from '@/lib/axiosInstance';
import { setCredentials, clearCredentials, AuthUser } from '@/features/auth/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export function useSessionBootstrap() {
  const dispatch = useDispatch();
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const accessToken = await refreshAccessToken();

        const { data: meData } = await axios.get(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true,
        });

        if (cancelled) return;
        dispatch(setCredentials({ user: meData.data.user as AuthUser, accessToken }));
      } catch {
        if (!cancelled) dispatch(clearCredentials());
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return { isBootstrapping };
}

export default useSessionBootstrap;
