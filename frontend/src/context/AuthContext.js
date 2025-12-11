import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

// Crear el contexto
const AuthContext = createContext();

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Proveedor del contexto
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar si hay un token al cargar la app
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Verificar el token con el backend
      const response = await authAPI.verify();
      setUser(response.data.user);
      setError(null);
      
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      // Si el token es inválido, limpiarlo
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Función de login
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.login({ username, password });
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        // Guardar token en localStorage
        localStorage.setItem('token', token);
        setUser(user);
        
        return { success: true, user };
      }
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error de conexión';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Función de logout
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
  };

  // Valores que estarán disponibles en el contexto
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isSecretaria: user?.role === 'secretaria',
    isUsuario: user?.role === 'usuario'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;