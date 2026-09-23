import axiosInstance from './axiosInstance';

export async function downloadAuthenticatedFile(url: string, fallbackFilename: string): Promise<void> {
  const response = await axiosInstance.get(url, { responseType: 'blob' });

  const disposition = response.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] ?? fallbackFilename;

  const objectUrl = window.URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(objectUrl);
}

export async function readBlobError(error: unknown): Promise<string | null> {
  const blob = (error as { response?: { data?: unknown } })?.response?.data;
  if (!(blob instanceof Blob)) return null;
  try {
    const parsed = JSON.parse(await blob.text());
    return typeof parsed?.message === 'string' ? parsed.message : null;
  } catch {
    return null;
  }
}
