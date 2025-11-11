import React, { useState, useEffect, useCallback } from 'react';
import { eventosAPI } from '../services/api';
import { generarPDF } from '../utils/pdfGenerator';
import '../styles/EventoDetail.css';

const EventoDetail = ({ eventoId, onClose }) => {
  const [evento, setEvento] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generandoPDF, setGenerandoPDF] = useState(false);

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

  const handleGenerarPDF = async () => {
    if (!evento) return;
    
    try {
      setGenerandoPDF(true);
      await generarPDF(evento);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

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

  const formatearHora = (horaString) => {
    if (!horaString) return 'No especificada';
    return horaString.substring(0, 5); // Formato HH:MM
  };

  const parsearCambios = (cambiosString) => {
    try {
      if (!cambiosString) return [];
      
      if (Array.isArray(cambiosString)) {
        return cambiosString;
      }
      
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
        <button 
          onClick={handleGenerarPDF} 
          className="btn-generar-pdf"
          disabled={generandoPDF || !evento}
        >
          {generandoPDF ? '🔄 Generando PDF...' : '📄 Generar PDF'}
        </button>
      </div>

      <div className="detail-content">
        {/* Información Actual del Evento */}
        <div className="info-section">
          <div className="section-header">
            <h3>📝 Información del Evento</h3>
            <div className="header-actions">
              <button onClick={cargarDetalles} className="btn-refresh" title="Actualizar">
                🔄
              </button>
            </div>
          </div>
          
          <div className="info-grid">
            {/* SECCIÓN: INFORMACIÓN BÁSICA */}
            <div className="info-subsection">
              <h4>📋 Información Básica</h4>
              <div className="info-item">
                <label>Nombre del Evento:</label>
                <span className="evento-nombre">{evento.nombre}</span>
              </div>

              {/* FECHA DEL EVENTO */}
              <div className="info-item">
                <label>
                  {evento.fecha_fin && evento.fecha_fin !== evento.fecha_evento
                    ? 'Fecha de Inicio del Evento:'
                    : 'Fecha del Evento:'
                  }
                </label>
                <span>{formatearFecha(evento.fecha_evento)}</span>
              </div>

              {/* FECHA DE FIN - SOLO SI EXISTE Y ES DIFERENTE */}
              {evento.fecha_fin && evento.fecha_fin !== evento.fecha_evento && (
                <div className="info-item">
                  <label>Fecha de Fin del Evento:</label>
                  <span>{formatearFecha(evento.fecha_fin)}</span>
                </div>
              )}

              <div className="info-item">
                <label>Categoría:</label>
                <span
                  className="badge" 
                  style={{
                    backgroundColor: evento.categoria_color || '#6c757d',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  {evento.categoria_nombre || 'Sin categoría'}
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
            </div>

            {/* SECCIÓN: DATOS DE CONTACTO */}
            <div className="info-subsection">
              <h4>📞 Datos de Contacto de Persona a Cargo</h4>
              <div className="info-item">
                <label>Correo de Contacto:</label>
                <span>{evento.correo_contacto || <span className="texto-vacio">No especificado</span>}</span>
              </div>
              
              <div className="info-item">
                <label>Teléfono:</label>
                <span>{evento.telefono || <span className="texto-vacio">No especificado</span>}</span>
              </div>
            </div>

            {/* SECCIÓN: HORARIOS Y UBICACIÓN */}
            <div className="info-subsection">
              <h4>🕐 Horarios y Ubicación</h4>
              <div className="info-item">
                <label>Hora de Inicio:</label>
                <span>{formatearHora(evento.hora_inicio)}</span>
              </div>
              
              <div className="info-item">
                <label>Hora de Finalización:</label>
                <span>{formatearHora(evento.hora_fin)}</span>
              </div>
              
              <div className="info-item">
                <label>Lugar / Espacio:</label>
                <span>{evento.lugar || <span className="texto-vacio">No especificado</span>}</span>
              </div>
            </div>

            {/* SECCIÓN: INFORMACIÓN ADICIONAL */}
            <div className="info-subsection">
              <h4>🎯 Información Adicional</h4>
              <div className="info-item">
                <label>Público Destinatario:</label>
                <span>{evento.publico_destinatario || <span className="texto-vacio">No especificado</span>}</span>
              </div>

              <div className="info-item full-width">
                <label>Links Relevantes:</label>
                <div className="links-content">
                  {evento.links ? (
                    <div className="links-list">
                      {evento.links
                        .split(/[\n,]+/) // Divide por saltos de línea O comas
                        .map(link => link.trim())
                        .filter(link => link.length > 0)
                        .map((link, index) => (
                          <div key={index} className="link-item">
                            <a
                              href={link.startsWith('http') ? link : `https://${link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="archivo-link"
                            >
                              🔗 {link}
                            </a>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <span className="texto-vacio">No hay links especificados</span>
                  )}
                </div>
              </div>
              
              <div className="info-item full-width">
                <label>Observaciones Adicionales:</label>
                <div className="observaciones-content">
                  {evento.observaciones || (
                    <span className="texto-vacio">Sin observaciones adicionales</span>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN: ARCHIVOS Y METADATOS */}
            <div className="info-subsection">
              <h4>📎 Archivos Adjuntos y Recursos</h4>
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