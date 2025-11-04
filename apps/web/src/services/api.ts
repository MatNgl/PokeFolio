import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: false, // plus de cookie refresh => pas nécessaire
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur: injecte le JWT d'accès
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur: si 401, on nettoie et redirige
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('accessToken');
      // Optionnel: conserver l’URL courante pour revenir après login
      const from = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?from=${from}`;
    }
    return Promise.reject(error);
  }
);
