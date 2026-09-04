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

  });

  socket.on('disconnect', (reason) => {
    if (reason !== 'io client disconnect') {
      console.warn('[Socket.IO] Disconnected:', reason);
    }
  });

  socket.on('connect_error', async (error) => {
    if (error.message === 'TOKEN_EXPIRED') {
      if (socket) socket.disconnect(); // stop infinite retry immediately
      
      try {
        // we can dynamically import axios and store to avoid circular deps if they exist,
        // but importing at the top level is usually fine.
        const { default: axios } = await import('axios');
        const { store } = await import('../redux/store');
        const { logoutUser, setCredentials } = await import('../redux/authSlice');

        const res = await axios.get(`${API_URL}/auth/refresh`, {
          withCredentials: true,
        });

        const newToken = res.data.token;
        const currentAuth = store.getState().auth;

        if (currentAuth.user && currentAuth.deviceId) {
          store.dispatch(
            setCredentials({
              user: currentAuth.user,
              token: newToken,
              deviceId: currentAuth.deviceId,
            })
          );
        } else {
          // just set token in localStorage if redux state is incomplete
          localStorage.setItem('token', newToken);
        }

        // Reconnect with new token
        if (socket) {
          (socket.auth as any).token = newToken;
          socket.connect();
        }
      } catch (refreshErr) {
        console.warn('[Socket.IO] Token refresh failed. Disconnecting.');
        const { store } = await import('../redux/store');
        const { logoutUser } = await import('../redux/authSlice');
        store.dispatch(logoutUser());
        disconnectSocket();
      }
    } else if (!connectErrorLogged) {
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
