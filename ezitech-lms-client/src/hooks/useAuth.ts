import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';

export function useAuth() {
  const { user, accessToken, isAuthenticated } = useSelector((state: RootState) => state.auth);
  return { user, accessToken, isAuthenticated };
}
