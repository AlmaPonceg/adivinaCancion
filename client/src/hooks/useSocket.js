import { useEffect, useState, useCallback, useRef } from 'react';
import socket from '../socket';

/**
 * Hook for Socket.io event management with auto-cleanup
 */
export function useSocketEvent(event, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const fn = (...args) => handlerRef.current(...args);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [event]);
}

/**
 * Hook for emitting events with callback pattern
 */
export function useSocketEmit() {
  const emit = useCallback((event, data) => {
    return new Promise((resolve, reject) => {
      socket.emit(event, data, (response) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }, []);

  return emit;
}

/**
 * Hook for connection status
 */
export function useSocketConnection() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return isConnected;
}
