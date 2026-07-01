import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin' | 'mentor' | 'student' | 'support';
}

interface AuthState {
  user: User | null;
  token: string | null;
  deviceId: string | null;
  isAuthenticated: boolean;
  theme: 'light' | 'dark';
}

const initialState: AuthState = {
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  token: localStorage.getItem('token') || null,
  deviceId: localStorage.getItem('deviceId') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string; deviceId: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.deviceId = action.payload.deviceId;
      state.isAuthenticated = true;

      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('deviceId', action.payload.deviceId);
    },
    logoutUser: (state) => {
      state.user = null;
      state.token = null;
      state.deviceId = null;
      state.isAuthenticated = false;

      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('deviceId');
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
      
      // Update body element class directly
      if (state.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    initializeTheme: (state) => {
      if (state.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },
});

export const { setCredentials, logoutUser, toggleTheme, initializeTheme } = authSlice.actions;
export default authSlice.reducer;
