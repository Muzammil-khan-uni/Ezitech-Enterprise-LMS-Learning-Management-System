import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useNotificationSocket() {
  const { accessToken, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      socketRef.current?.close();
      socketRef.current = null;
      return;
    }

    const socket = io(SOCKET_URL, { auth: { token: accessToken } });
    socketRef.current = socket;

    socket.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.close();
    };
  }, [accessToken, isAuthenticated, queryClient]);
}
