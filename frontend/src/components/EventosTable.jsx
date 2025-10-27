import React, { useState, useEffect } from 'react';
import { eventosAPI } from '../services/api';
import '../styles/EventosTable.css';

const EventosTable = ({ onEditEvento, onViewDetails, onNuevoEvento }) => {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const formatearFecha = (fechaString) => {
    return new Date(fechaString).toLocaleDateString('es-ES');
  };

  const formatearFechaHora = (fechaString) => {
    return new Date(fechaString).toLocaleString('es-ES');
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
                <th>Nombre</th>
                <th>Fecha Evento</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Archivo</th>
                <th>Fecha Creación</th>
                <th>Creado por</th>
                <th>Secretaría</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => (
                <tr 
                  key={evento.id} 
                  className={fueModificado(evento) ? 'fila-modificada' : ''}
                >
                  <td className="evento-nombre">
                    {evento.nombre}
                    {fueModificado(evento) && (
                      <span className="modificado-badge" title="Este evento fue modificado">
                        ✏️
                      </span>
                    )}
                  </td>
                  <td className="evento-fecha">{formatearFecha(evento.fecha_evento)}</td>
                  <td>
                    <span className={`badge ${getBadgeColor(evento.categoria)}`}>
                      {evento.categoria}
                    </span>
                  </td>
                  <td className="evento-descripcion">
                    {evento.descripcion || '-'}
                  </td>
                  <td className="evento-archivo">
                    {evento.archivo_adjunto ? (
                      <a 
                        href={`http://localhost:5000/api/eventos/archivo/${evento.archivo_adjunto}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="archivo-link"
                        title="Descargar archivo"
                      >
                        📎 Descargar
                      </a>
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
                  <td className="evento-usuario">{evento.usuario_nombre}</td>
                  <td className="evento-secretaria">{evento.secretaria}</td>
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
                    <button 
                      onClick={() => handleEliminar(evento.id, evento.nombre)}
                      className="btn btn-danger"
                      title="Eliminar evento"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EventosTable;