import axios from "axios";
import { store } from "../redux/store";
import { logoutUser, setCredentials } from "../redux/authSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (
      error.response?.status === 401 && 
      !originalRequest._retry &&
      localStorage.getItem("token")
    ) {
      originalRequest._retry = true;
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
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
        }

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        store.dispatch(logoutUser());
        return Promise.reject(refreshError);
      }
    } else if (error.response?.status === 401 && !localStorage.getItem("token")) {
        store.dispatch(logoutUser());
    }
    return Promise.reject(error);
  }
);

export default api;
