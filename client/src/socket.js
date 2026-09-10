// ═══════════════════════════════════════════════════════════════
// Socket.io Client Singleton
// ═══════════════════════════════════════════════════════════════

import { io } from 'socket.io-client';

function getServerUrl() {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  if (typeof window !== 'undefined') {
    // In Vite dev (default port 5173), socket server runs on port 3001 of the same host (works for localhost and LAN IP)
    if (window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:3001`;
    }
    // In production or when served by Express, connect to same origin
    return window.location.origin;
  }
  return 'http://localhost:3001';
}

const SERVER_URL = getServerUrl();

const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 10000,
});

socket.on('connect', () => {
  console.log('🔌 Connected to server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

export default socket;
