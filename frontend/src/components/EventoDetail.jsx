import React, { useState, useEffect, useCallback } from 'react';
import { eventosAPI } from '../services/api';
import '../styles/EventoDetail.css';

const EventoDetail = ({ eventoId, onClose }) => {
  const [evento, setEvento] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarDetalles = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [eventoResponse, historialResponse] = await Promise.all([
        eventosAPI.obtenerPorId(eventoId),
        eventosAPI.obtenerHistorial(eventoId)
      ]);

      if (eventoResponse.data.success) {
        setEvento(eventoResponse.data.evento);
      } else {
        throw new Error('Error al cargar el evento');
      }

      if (historialResponse.data.success) {
        setHistorial(historialResponse.data.historial);
      } else {
        throw new Error('Error al cargar el historial');
      }
      
    } catch (error) {
      console.error('Error cargando detalles:', error);
      setError(error.response?.data?.error || 'Error al cargar los detalles del evento');
    } finally {
      setLoading(false);
    }
  }, [eventoId]);

  useEffect(() => {
    cargarDetalles();
  }, [cargarDetalles]);

  const formatearFecha = (fechaString) => {
    return new Date(fechaString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearFechaHora = (fechaString) => {
    return new Date(fechaString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearFechaHistorial = (fechaString) => {
    return new Date(fechaString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBadgeColor = (categoria) => {
    const colores = {
      'Académico': 'badge-academico',
      'Cultural': 'badge-cultural',
      'Administrativo': 'badge-administrativo',
      'Urgente': 'badge-urgente'
    };
    return colores[categoria] || 'badge-default';
  };

  const parsearCambios = (cambiosString) => {
    try {
      if (!cambiosString) return [];
      
      // Si ya es un array, devolverlo directamente
      if (Array.isArray(cambiosString)) {
        return cambiosString;
      }
      
      // Intentar parsear como JSON
      const cambios = JSON.parse(cambiosString);
      return Array.isArray(cambios) ? cambios : [cambios];
      
    } catch (error) {
      console.warn('Error parseando cambios:', error);
      return [cambiosString];
    }
  };

  const getIconoAccion = (accion) => {
    const iconos = {
      'creado': '🆕',
      'actualizado': '✏️',
      'eliminado': '🗑️'
    };
    return iconos[accion] || '📝';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando detalles del evento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>❌ {error}</p>
        <button onClick={cargarDetalles} className="retry-button">
          Reintentar
        </button>
        <button onClick={onClose} className="btn-volver" style={{ marginTop: '10px' }}>
          ← Volver a la lista
        </button>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="error-container">
        <p>❌ No se pudo cargar la información del evento</p>
        <button onClick={onClose} className="btn-volver">
          ← Volver a la lista
        </button>
      </div>
    );
  }

  return (
    <div className="evento-detail-container">
      <div className="detail-header">
        <button onClick={onClose} className="btn-volver">
          ← Volver a la lista
        </button>
        <h2>📋 Detalles del Evento</h2>
        <div style={{ width: '100px' }}></div>
      </div>

      <div className="detail-content">
        {/* Información Actual del Evento */}
        <div className="info-section">
          <div className="section-header">
            <h3>📝 Información Actual del Evento</h3>
            <button onClick={cargarDetalles} className="btn-refresh" title="Actualizar">
              🔄
            </button>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <label>Nombre del Evento:</label>
              <span className="evento-nombre">{evento.nombre}</span>
            </div>
            
            <div className="info-item">
              <label>Fecha del Evento:</label>
              <span>{formatearFecha(evento.fecha_evento)}</span>
            </div>
            
            <div className="info-item">
              <label>Categoría:</label>
              <span className={`badge ${getBadgeColor(evento.categoria)}`}>
                {evento.categoria}
              </span>
            </div>
            
            <div className="info-item full-width">
              <label>Descripción:</label>
              <div className="descripcion-content">
                {evento.descripcion || (
                  <span className="texto-vacio">Sin descripción</span>
                )}
              </div>
            </div>
            
            <div className="info-item">
              <label>Archivo Adjunto:</label>
              <span>
                {evento.archivo_adjunto ? (
                  <a 
                    href={`http://localhost:5000/api/eventos/archivo/${evento.archivo_adjunto}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="archivo-link"
                  >
                    📎 {evento.archivo_adjunto}
                  </a>
                ) : (
                  <span className="texto-vacio">Sin archivo adjunto</span>
                )}
              </span>
            </div>
            
            <div className="info-item">
              <label>Creado por:</label>
              <span>{evento.usuario_nombre || 'Usuario no disponible'}</span>
            </div>
            
            <div className="info-item">
              <label>Secretaría:</label>
              <span>{evento.secretaria}</span>
            </div>
            
            <div className="info-item">
              <label>Fecha de Creación:</label>
              <span>{formatearFechaHora(evento.fecha_carga)}</span>
            </div>
            
            <div className="info-item">
              <label>Última Modificación:</label>
              <span>{formatearFechaHora(evento.ultima_modificacion)}</span>
            </div>
          </div>
        </div>

        {/* Historial de Cambios */}
        <div className="historial-section">
          <div className="section-header">
            <h3>🕐 Historial de Cambios</h3>
            <span className="historial-count">({historial.length} registros)</span>
          </div>
          
          {historial.length === 0 ? (
            <div className="empty-state">
              <p>📝 No hay modificaciones registradas para este evento</p>
              <small>El historial mostrará todos los cambios realizados en este evento</small>
            </div>
          ) : (
            <div className="historial-list">
              {historial.map((registro) => {
                const cambios = parsearCambios(registro.cambios);
                return (
                  <div key={registro.id} className={`historial-item historial-${registro.accion}`}>
                    <div className="historial-header">
                      <div className="accion-info">
                        <span className="accion-icon">{getIconoAccion(registro.accion)}</span>
                        <span className="accion-tipo">{registro.accion.toUpperCase()}</span>
                      </div>
                      <div className="meta-info">
                        <span className="fecha">{formatearFechaHistorial(registro.fecha)}</span>
                        <span className="usuario">
                          por <strong>{registro.username || 'Usuario desconocido'}</strong>
                          {registro.secretaria && ` (${registro.secretaria})`}
                        </span>
                      </div>
                    </div>
                    
                    {cambios.length > 0 && (
                      <div className="cambios-list">
                        <div className="cambios-title">Cambios realizados:</div>
                        <ul className="cambios-items">
                          {cambios.map((cambio, index) => (
                            <li key={index} className="cambio-item">
                              {cambio}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventoDetail;