import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// metemos el token en cada request si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// si el token ya no es válido, limpiamos todo y mandamos al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      const enIntranet = window.location.pathname.startsWith('/admin');
      const destino = enIntranet ? '/admin/login' : '/ingresar';
      if (window.location.pathname !== destino) window.location.href = destino;
    }
    return Promise.reject(error);
  }
);

export default api;