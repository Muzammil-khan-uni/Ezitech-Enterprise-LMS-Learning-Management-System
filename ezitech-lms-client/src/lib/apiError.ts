import axios from 'axios';

export function getApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; details?: string[] } | undefined;
    if (data?.details?.length) return data.details.join(' ');
    if (data?.message) return data.message;
  }
  return fallback;
}
