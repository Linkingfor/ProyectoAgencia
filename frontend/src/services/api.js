/* ════════════════════════════════════════════════════
   api.js — Cliente HTTP centralizado
   ════════════════════════════════════════════════════
   Una sola instancia de axios que TODO el frontend usa.
   Tiene dos truquitos automáticos:

     1) Antes de cada petición agrega el token en la cabecera
        Authorization. Si el usuario está logueado, no tenemos
        que pegarlo manualmente en cada componente.

     2) Si la API responde 401 (token muerto), borra la sesión
        y redirige al login correcto (intranet o comercial)
        según en qué parte de la app estés.
   ════════════════════════════════════════════════════ */

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' }
});

// Adjunta el token automáticamente en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token expira (401), cierra sesión y redirige al login correspondiente
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
