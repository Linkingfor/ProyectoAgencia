import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('usuario');
    const token  = localStorage.getItem('token');
    if (stored && token) {
      try { setUsuario(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const persist = (data) => {
    localStorage.setItem('token',   data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  };

  // login para el personal de la intranet
  const loginTrabajador = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    return persist(data);
  };




  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  const esTrabajador = usuario?.tipo === 'trabajador';
  

  return (
    <AuthContext.Provider value={{
      usuario, loading, esTrabajador, esCliente,
      loginTrabajador, loginCliente, registerCliente, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
