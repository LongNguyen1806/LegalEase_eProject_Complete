import axios from "axios";
export const DOMAIN = import.meta.env.VITE_DOMAIN || "http://127.0.0.1:8000";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${DOMAIN}/api`;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

const isAdminRoute = () => {
  return window.location.pathname.startsWith('/admin');
};

axiosClient.interceptors.request.use((config) => {
  const tokenKey = isAdminRoute() ? "ADMIN_ACCESS_TOKEN" : "CLIENT_ACCESS_TOKEN";
  const token = localStorage.getItem(tokenKey);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    if (response && response.status === 401) {
      if (isAdminRoute()) {
        localStorage.removeItem("ADMIN_ACCESS_TOKEN");
        localStorage.removeItem("ADMIN_INFO");
        if (window.location.pathname !== '/admin/login') {
            window.location.href = '/admin/login';
        }
      } else {
        localStorage.removeItem("CLIENT_ACCESS_TOKEN");
        localStorage.removeItem("USER_INFO");
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
      }
    }
    throw error;
  }
);

export default axiosClient;