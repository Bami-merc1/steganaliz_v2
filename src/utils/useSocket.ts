import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://steganaliz-api.onrender.com';

let socketInstance: Socket | null = null;

export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useSocket() {
  const { token } = useAuthStore();
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    if (!socketInstance || !socketInstance.connected) {
      socketInstance = io(API_BASE, {
        auth:        { token },
        transports:  ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay:    2000,
      });
    }

    ref.current = socketInstance;
    setStatus('connecting');

    const onConnect    = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onError      = () => setStatus('error');

    socketInstance.on('connect',    onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('connect_error', onError);

    if (socketInstance.connected) setStatus('connected');

    return () => {
      socketInstance?.off('connect',    onConnect);
      socketInstance?.off('disconnect', onDisconnect);
      socketInstance?.off('connect_error', onError);
    };
  }, [token]);

  return { socket: ref.current ?? socketInstance, status };
}