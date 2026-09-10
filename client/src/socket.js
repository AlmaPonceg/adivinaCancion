// ═══════════════════════════════════════════════════════════════
// Socket.io Client Singleton
// ═══════════════════════════════════════════════════════════════

import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

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
