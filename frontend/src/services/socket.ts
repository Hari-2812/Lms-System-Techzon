import { io, Socket } from 'socket.io-client';
import { store } from '../redux/store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const SOCKET_URL = API_URL.replace('/api/v1', '').replace('/api', '');

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (socket) return socket;

  const token = localStorage.getItem('token');

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log("Socket connected", socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.warn('Socket.IO disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error.message);
  });

  return socket;
};

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  const s = getSocket();
  if (s.auth) {
    s.auth.token = token;
  }
  if (!s.connected) {
    s.connect();
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
