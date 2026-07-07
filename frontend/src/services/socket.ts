import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL as string;
const SOCKET_URL = API_URL.replace('/api/v1', '').replace('/api', '');

let socket: Socket | null = null;
let connectErrorLogged = false;

export const getSocket = (): Socket => {
  if (socket) return socket;

  const token = localStorage.getItem('token');

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: {
      token: localStorage.getItem('token'),
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    connectErrorLogged = false;
    console.log('[Socket.IO] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    if (reason !== 'io client disconnect') {
      console.warn('[Socket.IO] Disconnected:', reason);
    }
  });

  socket.on('connect_error', (error) => {
    if (!connectErrorLogged) {
      console.warn('[Socket.IO] Connection failed:', error.message, '— will retry silently.');
      connectErrorLogged = true;
    }
  });

  return socket;
};

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  const s = getSocket();
  // Always update the auth token before connecting
  (s.auth as any).token = token;
  if (!s.connected) {
    s.connect();
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    connectErrorLogged = false;
  }
};
