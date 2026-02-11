import axios from "axios";

// Con proxy, en desarrollo usa localhost:5000 automáticamente
// En producción, usa la misma URL del frontend
const API_BASE_URL = process.env.REACT_APP_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para logging (igual que tu app)
api.interceptors.request.use(
  (config) => {
    console.log(
      `🔄 Making ${config.method?.toUpperCase()} request to: ${config.url}`,
    );
    return config;
  },
  (error) => {
    console.error("❌ Request error:", error);
    return Promise.reject(error);
  },
);

// Interceptor para AGREGAR token automáticamente (NUEVO)
api.interceptors.request.use(
  (config) => {
    // Si los datos son FormData, dejar que el navegador establezca el Content-Type
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor para manejar errores de autenticación (NUEVO)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log("❌ Token expirado o inválido");
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("tokenExpired"));
    }
    return Promise.reject(error);
  },
);

// Servicios de API - ADAPTADOS para universidad
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  verify: () => api.get("/auth/verify"),
};

// Servicios para eventos
export const eventosAPI = {
  crear: (eventoData) => api.post("/eventos", eventoData),
  obtenerTodos: () => api.get("/eventos"),
  obtenerPorId: (id) => api.get(`/eventos/${id}`),
  actualizar: (id, eventoData) => api.put(`/eventos/${id}`, eventoData),
  eliminar: (id) => api.delete(`/eventos/${id}`),
  obtenerHistorial: (id) => api.get(`/eventos/${id}/historial`),
  // Nuevos métodos para manejo de archivos
  obtenerArchivos: (id) => api.get(`/eventos/${id}/archivos`),
  eliminarArchivo: (id, archivoId) =>
    api.delete(`/eventos/${id}/archivos/${archivoId}`),
  descargarArchivo: (eventoId, archivoId) =>
    api.get(`/eventos/${eventoId}/archivos/${archivoId}/download`, { 
      responseType: "blob" 
    }),
  enviarPDFCorreo: (id, tipoAccion = "creado") => {
    return api.post(`/eventos/${id}/enviar-pdf`, { tipoAccion });
  },
};
// Servicios para reservas (para implementar después)
export const reservasAPI = {
  // RESERVAS
  obtenerTodas: () => api.get("/reservas"),
  obtenerPorId: (id) => api.get(`/reservas/${id}`),
  crear: (datos) => api.post("/reservas", datos),
  actualizar: (id, datos) => api.put(`/reservas/${id}`, datos),
  cancelar: (id) => api.put(`/reservas/${id}/cancelar`),
  validarDisponibilidad: (datos) =>
    api.post("/reservas/validar-disponibilidad", datos),

  // ESPACIOS Y RECURSOS
  obtenerEspacios: () => api.get("/espacios"),
  obtenerRecursosEspacio: (espacioId) =>
    api.get(`/espacios/${espacioId}/recursos`),
  obtenerRecursos: () => api.get("/recursos"),
    eliminar: (id) => api.delete(`/reservas/${id}`),

  // PARA EL FUTURO
  aprobar: (id) => api.put(`/reservas/${id}/aprobar`),
  rechazar: (id) => api.put(`/reservas/${id}/rechazar`),
  // obtenerMisReservas: () => api.get('/reservas/mis-reservas')
};
export const espaciosAPI = {
  // CONSULTAS
  obtenerTodos: () => api.get("/espacios"),
  obtenerPorId: (id) => api.get(`/espacios/${id}`),
  obtenerRecursosDeEspacio: (espacioId) =>
    api.get(`/espacios-recursos/${espacioId}/recursos`),
  obtenerRecursos: (espacioId) =>
    api.get(`/espacios-recursos/${espacioId}/recursos`), // ← CAMBIADO
  crear: (datos) => api.post("/espacios", datos),
  actualizar: (id, datos) => api.put(`/espacios/${id}`, datos),
  eliminar: (id) => api.delete(`/espacios/${id}`),
};

export const recursosAPI = {
  crear: (datos) => api.post("/recursos", datos),
  actualizar: (id, datos) => api.put(`/recursos/${id}`, datos),
  eliminar: (id) => api.delete(`/recursos/${id}`),
  obtenerTodos: () => api.get("/recursos"),
};

export const espaciosRecursosAPI = {
  asignar: (espacioId, recursos) =>
    api.post(`/espacios-recursos/${espacioId}/recursos`, { recursos }),
  quitar: (espacioId, recursoId) =>
    api.delete(`/espacios-recursos/${espacioId}/recursos/${recursoId}`),
  obtenerRecursosDeEspacio: (espacioId) =>
    api.get(`/espacios-recursos/${espacioId}/recursos`),
  obtenerTodasLasAsignaciones: () => api.get("/espacios-recursos/asignaciones"),
};
export const categoriasAPI = {
  obtenerTodas: () => api.get("/categorias"),
  obtenerTodasAdmin: () => api.get("/categorias/todas"),
  crear: (categoriaData) => api.post("/categorias", categoriaData),
  actualizar: (id, categoriaData) =>
    api.put(`/categorias/${id}`, categoriaData),
  eliminar: (id) => api.delete(`/categorias/${id}`),
};

export const usersAPI = {
  obtenerTodos: () => api.get("/users"),
  crear: (userData) => api.post("/users", userData),
  actualizar: (id, userData) => api.put(`/users/${id}`, userData),
  resetearPassword: (id, passwordData) =>
    api.put(`/users/${id}/reset-password`, passwordData),
};

export const secretariasAPI = {
  obtenerTodas: () => api.get("/secretarias"),
};
// Health check (igual que tu app)
export const checkServerHealth = () => api.get("/health");

export default api;
console.log("🔧 API Base URL:", API_BASE_URL); // Para debug
