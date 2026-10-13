import React, { useState, useEffect, useCallback } from 'react';
import { eventosAPI } from '../services/api';
import { generarPDF } from '../utils/pdfGenerator';
import '../styles/EventoDetail.css';

const EventoDetail = ({ eventoId, onClose, readOnly = false }) => {
  const [evento, setEvento] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);

  const cargarDetalles = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [eventoResponse, historialResponse, archivosResponse] = await Promise.all([
        eventosAPI.obtenerPorId(eventoId),
        eventosAPI.obtenerHistorial(eventoId),
        eventosAPI.obtenerArchivos(eventoId)
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

      if (archivosResponse.data.success) {
        setArchivos(archivosResponse.data.archivos || []);
      } else {
        setArchivos([]);
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

  const descargarArchivo = async (archivo) => {
    try {
      const response = await eventosAPI.descargarArchivo(eventoId, archivo.id);
      
      // Crear blob y descargar
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', archivo.nombre_archivo);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando archivo:', error);
      alert('Error al descargar el archivo');
    }
  };

  const formatearTamano = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const abrirDetallesArchivo = (archivo) => {
    setSelectedFile(archivo);
    setShowFileModal(true);
  };

  const cerrarModalArchivo = () => {
    setSelectedFile(null);
    setShowFileModal(false);
  };

  const obtenerIconoArchivo = (extension) => {
    if (!extension) return '📄';
    const ext = extension.toLowerCase();
    
    if (ext === 'pdf') return '📕';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return '🖼️';
    if (['doc', 'docx', 'txt'].includes(ext)) return '📄';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) return '🎬';
    if (['mp3', 'wav', 'flac', 'm4a'].includes(ext)) return '🎵';
    
    return '📄';
  };

  const puedeVistaPreviaImagen = (extension) => {
    if (!extension) return false;
    const ext = extension.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
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

  //Extraer valor anterior/nuevo por campo
  const obtenerValorCambio = (campo, valoresViejos, valoresNuevos) => {
    try {
      const viejos = typeof valoresViejos === 'string' ? JSON.parse(valoresViejos) : valoresViejos;
      const nuevos = typeof valoresNuevos === 'string' ? JSON.parse(valoresNuevos) : valoresNuevos;
      
      return {
        anterior: viejos?.[campo] || 'N/A',
        actual: nuevos?.[campo] || 'N/A'
      };
    } catch (error) {
      console.warn('Error extrayendo valores:', error);
      return { anterior: 'N/A', actual: 'N/A' };
    }
  };

  //Detectar si es un campo que necesita mostrar valores detallados
  const esCampoDetallado = (cambio) => {
    const camposDetallados = ['Descripción', 'Observaciones', 'Links'];
    return camposDetallados.some(campo => cambio.includes(campo));
  };

  //Extraer el nombre del campo del texto de cambio
  const extraerNombroCampo = (cambio) => {
    const mapa = {
      'Descripción': 'descripcion',
      'Observaciones': 'observaciones',
      'Links': 'links'
    };
    
    for (const [texto, campo] of Object.entries(mapa)) {
      if (cambio.includes(texto)) {
        return campo;
      }
    }
    return null;
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
        {!readOnly && (
          <button
            onClick={handleGenerarPDF}
            className="btn-generar-pdf"
            disabled={generandoPDF || !evento}
          >
            {generandoPDF ? '🔄 Generando PDF...' : '📄 Generar PDF'}
          </button>
        )}
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

            {/* SECCIÓN: ARCHIVOS ADJUNTOS E INFORMACIÓN DE AUDITORÍA (2 COLUMNAS) */}
            <div className="archivos-auditoría-row">
              {/* ARCHIVOS ADJUNTOS */}
              <div className="info-subsection">
                <h4>📎 Archivos Adjuntos</h4>
                {(archivos && archivos.length > 0) || evento?.archivo_adjunto ? (
                  <div className="archivos-tabla-container">
                    <table className="archivos-tabla">
                      <thead>
                        <tr>
                          <th>Nombre del Archivo</th>
                          <th>Tamaño</th>
                          <th>Tipo</th>
                          <th>Fecha de Carga</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Mostrar archivo legacy primero si existe */}
                        {evento?.archivo_adjunto && (
                          <tr key="legacy-archivo" className="archivo-legacy">
                            <td>
                              <span 
                                className="archivo-nombre-clickable"
                                title="Archivo legacy - Click para descargar"
                              >
                                📄 {evento.archivo_adjunto} <span style={{fontSize: '0.8em', color: '#999'}}>(legacy)</span>
                              </span>
                            </td>
                            <td>-</td>
                            <td>
                              {evento.archivo_adjunto.split('.').pop().toLowerCase() || 'desconocido'}
                            </td>
                            <td>
                              {evento.fecha_carga ? new Date(evento.fecha_carga).toLocaleDateString('es-ES') : 'N/A'}
                            </td>
                            <td>
                              <div className="archivo-acciones">
                                <a 
                                  href={`/uploads/${evento.archivo_adjunto}`}
                                  download
                                  className="btn-archivo btn-descargar"
                                  title="Descargar archivo"
                                >
                                  ⬇️ Descargar
                                </a>
                              </div>
                            </td>
                          </tr>
                        )}
                        {/* Mostrar archivos nuevos */}
                        {archivos.map((archivo) => (
                          <tr key={archivo.id}>
                            <td>
                              <span 
                                className="archivo-nombre-clickable"
                                onClick={() => descargarArchivo(archivo)}
                                title="Click para descargar"
                              >
                                📄 {archivo.nombre_archivo}
                              </span>
                            </td>
                            <td>{formatearTamano(archivo.tamaño)}</td>
                            <td>{archivo.tipo_archivo || 'N/A'}</td>
                            <td>
                              {new Date(archivo.fecha_carga).toLocaleDateString('es-ES')}
                            </td>
                            <td>
                              <div className="archivo-acciones">
                                <button 
                                  onClick={() => descargarArchivo(archivo)} 
                                  className="btn-archivo btn-descargar"
                                  title="Descargar archivo"
                                >
                                  ⬇️ Descargar
                                </button>
                                <button 
                                  onClick={() => abrirDetallesArchivo(archivo)}
                                  className="btn-archivo btn-detalles"
                                  title="Ver detalles del archivo"
                                >
                                  ℹ️ Detalles
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="archivos-resumen">
                      <small>
                        Total: {(evento?.archivo_adjunto ? 1 : 0) + archivos.length} archivo(s) - 
                        Tamaño total: {formatearTamano((evento?.archivo_adjunto ? 0 : 0) + archivos.reduce((sum, a) => sum + (a.tamaño || 0), 0))}
                      </small>
                    </div>
                  </div>
                ) : (
                  <span className="texto-vacio">No hay archivos adjuntos</span>
                )}
              </div>

              {/* INFORMACIÓN DE AUDITORÍA */}
              <div className="info-subsection">
                <h4>📋 Información de Auditoría</h4>
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
        </div>

        {/* Historial de Cambios - MODIFICADO */}
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
                          {cambios.map((cambio, index) => {
                            // Verificar si es un campo que necesita mostrar valores detallados
                            const isDetallado = esCampoDetallado(cambio);
                            
                            if (isDetallado && registro.valores_viejos && registro.valores_nuevos) {
                              const nombreCampo = extraerNombroCampo(cambio);
                              const valores = obtenerValorCambio(nombreCampo, registro.valores_viejos, registro.valores_nuevos);
                              
                              return (
                                <li key={index} className="cambio-item cambio-detallado">
                                  <div className="cambio-titulo">{cambio}</div>
                                  <div className="cambio-comparacion">
                                    <div className="valor-anterior">
                                      <strong>Antes:</strong>
                                      <p className="valor-texto">
                                        {valores.anterior && valores.anterior !== 'N/A' 
                                          ? valores.anterior 
                                          : '(vacío)'}
                                      </p>
                                    </div>
                                    <div className="flecha">→</div>
                                    <div className="valor-nuevo">
                                      <strong>Después:</strong>
                                      <p className="valor-texto">
                                        {valores.actual && valores.actual !== 'N/A' 
                                          ? valores.actual 
                                          : '(vacío)'}
                                      </p>
                                    </div>
                                  </div>
                                </li>
                              );
                            }
                            
                            // Si no es un campo detallado, mostrar como antes
                            return (
                              <li key={index} className="cambio-item">
                                {cambio}
                              </li>
                            );
                          })}
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

      {/* MODAL DE DETALLES DE ARCHIVO */}
      {showFileModal && selectedFile && (
        <div className="modal-overlay" onClick={cerrarModalArchivo}>
          <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {obtenerIconoArchivo(selectedFile.tipo_archivo)} Detalles del Archivo
              </h3>
              <button 
                
                onClick={cerrarModalArchivo}
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* VISTA PREVIA */}
              {puedeVistaPreviaImagen(selectedFile.tipo_archivo) ? (
                <div className="archivo-preview">
                  <img 
                    src={`/uploads/${selectedFile.archivo_path}`}
                    alt={selectedFile.nombre_archivo}
                    className="preview-imagen"
                  />
                </div>
              ) : (
                <div className="archivo-no-preview">
                  <div className="icono-grande">
                    {obtenerIconoArchivo(selectedFile.tipo_archivo)}
                  </div>
                  <p className="tipo-archivo">{selectedFile.tipo_archivo || 'Archivo'}</p>
                </div>
              )}

              {/* INFORMACIÓN DEL ARCHIVO */}
              <div className="archivo-info">
                <div className="info-item">
                  <label>Nombre del Archivo:</label>
                  <span className="info-valor">{selectedFile.nombre_archivo}</span>
                </div>

                <div className="info-item">
                  <label>Tamaño:</label>
                  <span className="info-valor">{formatearTamano(selectedFile.tamaño)}</span>
                </div>

                <div className="info-item">
                  <label>Tipo de Archivo:</label>
                  <span className="info-valor">{selectedFile.tipo_archivo || 'No especificado'}</span>
                </div>

                <div className="info-item">
                  <label>Fecha de Carga:</label>
                  <span className="info-valor">
                    {new Date(selectedFile.fecha_carga).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <div className="info-item">
                  <label>Ruta Interna:</label>
                  <span className="info-valor info-ruta">{selectedFile.archivo_path}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-modal btn-descargar"
                onClick={() => {
                  descargarArchivo(selectedFile);
                  cerrarModalArchivo();
                }}
              >
                ⬇️ Descargar
              </button>
              <button 
                className="btn-modal btn-descargar"
                onClick={cerrarModalArchivo}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventoDetail;