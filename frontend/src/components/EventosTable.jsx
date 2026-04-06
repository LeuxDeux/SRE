import React, { useState, useEffect } from 'react';
import { eventosAPI } from '../services/api';
import '../styles/EventosTable.css';
import { useAuth } from '../context/AuthContext';

const EventosTable = ({ onEditEvento, onViewDetails, onNuevoEvento }) => {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModalDescargas, setShowModalDescargas] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [archivosModal, setArchivosModal] = useState([]);
  const [cargandoArchivos, setCargandoArchivos] = useState(false);
  const { user } = useAuth(); // ✅ Agregar useAuth

  useEffect(() => {
    cargarEventos();
  }, []);

  const cargarEventos = async () => {
    try {
      setLoading(true);
      const response = await eventosAPI.obtenerTodos();
      setEventos(response.data.eventos);
      setError(null);
    } catch (error) {
      console.error('Error cargando eventos:', error);
      setError('Error al cargar los eventos');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id, nombre) => {
    // ✅ Verificar si es admin
    if (user.role !== 'admin') {
      alert('❌ Solo los administradores pueden eliminar eventos');
      return;
    }


    if (!window.confirm(`¿Estás seguro de eliminar el evento "${nombre}"?`)) {
      return;
    }

    try {
      await eventosAPI.eliminar(id);
      cargarEventos();
    } catch (error) {
      console.error('Error eliminando evento:', error);
      alert('Error al eliminar el evento');
    }
  };

  const handleDescargarTodos = async (eventoId, eventoNombre) => {
    try {
      setCargandoArchivos(true);
      setEventoSeleccionado({ id: eventoId, nombre: eventoNombre });
      
      // Cargar archivos del evento
      const response = await eventosAPI.obtenerArchivos(eventoId);
      
      if (response.data.success) {
        // Obtener también el evento para el archivo legacy
        const eventoResponse = await eventosAPI.obtenerPorId(eventoId);
        const evento = eventoResponse.data.evento;
        
        // Combinar archivos nuevos + legacy
        const archivos = response.data.archivos || [];
        
        // Agregar archivo legacy si existe
        if (evento.archivo_adjunto) {
          archivos.unshift({
            id: 'legacy',
            nombre_archivo: evento.archivo_adjunto,
            tamaño: null,
            tipo_archivo: evento.archivo_adjunto.split('.').pop().toLowerCase(),
            fecha_carga: evento.fecha_carga,
            isLegacy: true
          });
        }
        
        setArchivosModal(archivos);
        setShowModalDescargas(true);
      }
    } catch (error) {
      console.error('Error cargando archivos:', error);
      alert('Error al cargar los archivos');
    } finally {
      setCargandoArchivos(false);
    }
  };

  const cerrarModalDescargas = () => {
    setShowModalDescargas(false);
    setEventoSeleccionado(null);
    setArchivosModal([]);
  };

  const descargarArchivo = async (archivo) => {
    try {
      if (archivo.isLegacy) {
        // Descargar archivo legacy directamente
        const link = document.createElement('a');
        link.href = `/uploads/${archivo.nombre_archivo}`;
        link.download = archivo.nombre_archivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Descargar archivo nuevo
        const response = await eventosAPI.descargarArchivo(eventoSeleccionado.id, archivo.id);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', archivo.nombre_archivo);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error descargando archivo:', error);
      alert('Error al descargar el archivo');
    }
  };

  const formatearTamano = (bytes) => {
    if (!bytes) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatearFecha = (fechaString) => {
    return new Date(fechaString).toLocaleDateString('es-ES');
  };

  const formatearFechaHora = (fechaString) => {
    return new Date(fechaString).toLocaleString('es-ES');
  };

  const getBadgeColor = (categoriaColor) => {
    // Usar el color que viene del backend
    return categoriaColor ? 'badge-custom' : 'badge-default';
  };

  const fueModificado = (evento) => {
    return evento.ultima_modificacion !== evento.fecha_carga;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando eventos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>❌ {error}</p>
        <button onClick={cargarEventos} className="retry-button">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="eventos-table-container">
      <div className="table-header">
        <h2>📅 Lista de Eventos</h2>
        <button onClick={cargarEventos} className="refresh-button">
          🔄 Actualizar
        </button>
      </div>

      {eventos.length === 0 ? (
        <div className="empty-state">
          <p>No hay eventos registrados</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="eventos-table">
            <thead>
              <tr>
                <th style={{ width: '14%' }}>Nombre</th>
                <th style={{ width: '8%' }}>Fecha Evento</th>
                <th style={{ width: '10%' }}>Categoría</th>
                <th style={{ width: '14%' }}>Descripción</th>
                <th style={{ width: '8%' }}>Archivo</th>
                <th style={{ width: '11%' }}>Fecha Creación</th>
                <th style={{ width: '10%' }}>Creado por</th>
                <th style={{ width: '10%' }}>Secretaría</th>
                <th style={{ width: '15%' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => (
                <tr 
                  key={evento.id} 
                  className={fueModificado(evento) ? 'fila-modificada' : ''}
                >
                  <td className="evento-nombre" title={evento.nombre}>
                    {evento.nombre}
                    {fueModificado(evento) && (
                      <span className="modificado-badge" title="Este evento fue modificado">
                        ✏️
                      </span>
                    )}
                  </td>
                  <td className="evento-fecha">{formatearFecha(evento.fecha_evento)}</td>
                  <td className="evento-categoria" title={evento.categoria_nombre || 'Sin categoría'}>
                    <span
                      className={`badge ${getBadgeColor(evento.categoria_color)}`}
                      style={{
                        backgroundColor: evento.categoria_color || '#6c757d',
                        color: 'white'
                      }}
                    >
                      {evento.categoria_nombre || 'Sin categoría'}
                    </span>
                  </td>
                  <td className="evento-descripcion" title={evento.descripcion || ''}>
                    {evento.descripcion || '-'}
                  </td>
                  <td className="evento-archivo">
                    {evento.total_archivos > 0 ? (
                      <button
                        className="archivo-badge-btn"
                        onClick={() => handleDescargarTodos(evento.id, evento.nombre)}
                        disabled={cargandoArchivos && eventoSeleccionado?.id === evento.id}
                        title="Haz clic para ver los archivos disponibles"
                      >
                        {cargandoArchivos && eventoSeleccionado?.id === evento.id ? '⏳' : '📎'} {evento.total_archivos} {evento.total_archivos === 1 ? 'archivo' : 'archivos'}
                      </button>
                    ) : (
                      <span className="sin-archivo">-</span>
                    )}
                  </td>
                  <td className="evento-fecha-creacion">
                    {formatearFechaHora(evento.fecha_carga)}
                    {fueModificado(evento) && (
                      <div className="modificacion-info">
                        <small title={`Modificado: ${formatearFechaHora(evento.ultima_modificacion)}`}>
                          *
                        </small>
                      </div>
                    )}
                  </td>
                  <td className="evento-usuario" title={evento.usuario_nombre}>{evento.usuario_nombre}</td>
                  <td className="evento-secretaria" title={evento.secretaria}>{evento.secretaria}</td>
                  <td className="evento-acciones">
                    <button 
                      onClick={() => onViewDetails(evento.id)}
                      className="btn btn-info"
                      title="Ver detalles e historial"
                    >
                      👁️
                    </button>
                    <button 
                      onClick={() => onEditEvento(evento)}
                      className="btn btn-warning"
                      title="Editar evento"
                    >
                      ✏️
                    </button>
                    {/* ✅ Solo mostrar botón eliminar para admins */}
                    {user.role === 'admin' && (
                      <button 
                        onClick={() => handleEliminar(evento.id, evento.nombre)}
                        className="btn btn-danger"
                        title="Eliminar evento"
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE DESCARGAS */}
      {showModalDescargas && (
        <div className="modal-overlay" onClick={cerrarModalDescargas}>
          <div className="modal-content modal-descargas" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📎 Descargar Archivos</h3>
              <button className="modal-close" onClick={cerrarModalDescargas}>✕</button>
            </div>

            <div className="modal-body">
              {archivosModal.length > 0 ? (
                <div className="descargas-tabla-container">
                  <table className="descargas-tabla">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Tamaño</th>
                        <th>Tipo</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivosModal.map((archivo) => (
                        <tr key={archivo.id} className={archivo.isLegacy ? 'archivo-legacy' : ''}>
                          <td>
                            <span>
                              📄 {archivo.nombre_archivo}
                              {archivo.isLegacy && (
                                <span style={{fontSize: '0.8em', color: '#999', marginLeft: '8px'}}>
                                  (legacy)
                                </span>
                              )}
                            </span>
                          </td>
                          <td>{formatearTamano(archivo.tamaño)}</td>
                          <td>{archivo.tipo_archivo || 'desconocido'}</td>
                          <td>
                            <button
                              className="btn-descargar-modal"
                              onClick={() => descargarArchivo(archivo)}
                              title="Descargar"
                            >
                              ⬇️ Descargar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{textAlign: 'center', color: '#999'}}>No hay archivos disponibles</p>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={cerrarModalDescargas}
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

export default EventosTable;