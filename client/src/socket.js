// ═══════════════════════════════════════════════════════════════
// Socket.io Client Singleton
// ═══════════════════════════════════════════════════════════════

import { io } from 'socket.io-client';

function getServerUrl() {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    // If local dev environment on any port other than 3001 (5173, 5174, 5175, etc.)
    const isLocalDevHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local');

    if (isLocalDevHost && port && port !== '3001') {
      return `${protocol}//${hostname}:3001`;
    }
    // In production or when served directly from Express on port 3001
    return window.location.origin;
  }
  return 'http://localhost:3001';
}

const SERVER_URL = getServerUrl();
console.log('[Socket] Target URL:', SERVER_URL);

const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 2000,
  timeout: 10000,
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('[Socket] Connected to server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected:', reason);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

export default socket;
