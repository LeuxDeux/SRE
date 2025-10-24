import axios from 'axios';

// Con proxy, en desarrollo usa localhost:5000 automáticamente
// En producción, usa la misma URL del frontend
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para logging (igual que tu app)
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para AGREGAR token automáticamente (NUEVO)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación (NUEVO)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('❌ Token expirado o inválido');
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('tokenExpired'));
    }
    return Promise.reject(error);
  }
);

// Servicios de API - ADAPTADOS para universidad
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  verify: () => api.get('/auth/verify')
};

// Servicios para eventos (para implementar después)
export const eventosAPI = {
  // crear: (eventoData) => api.post('/eventos', eventoData),
  // obtenerTodos: () => api.get('/eventos'),
  // actualizar: (id, eventoData) => api.put(`/eventos/${id}`, eventoData),
  // eliminar: (id) => api.delete(`/eventos/${id}`)
};

// Servicios para reservas (para implementar después)
export const reservasAPI = {
  // crear: (reservaData) => api.post('/reservas', reservaData),
  // obtenerTodas: () => api.get('/reservas'),
  // eliminar: (id) => api.delete(`/reservas/${id}`)
};

// Health check (igual que tu app)
export const checkServerHealth = () => api.get('/health');

export default api;
console.log('🔧 API Base URL:', API_BASE_URL); // Para debug