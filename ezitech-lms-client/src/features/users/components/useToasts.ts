import { useCallback, useRef, useState } from 'react';
import type { Notify } from './profileUtils';
import type { ToastItem } from './Toast';

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const notify: Notify = useCallback(
    (type, message) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return { toasts, notify, dismiss };
}
