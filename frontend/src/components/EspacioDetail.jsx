import React, { useState, useEffect } from 'react';
import { espaciosAPI, reservasAPI } from '../services/api';
import '../styles/EspacioDetail.css';

const EspacioDetail = ({ espacioId, onClose }) => {
  const [espacio, setEspacio] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editandoReserva, setEditandoReserva] = useState(null);
  const [formReservaEditada, setFormReservaEditada] = useState({});

  useEffect(() => {
    cargarDetalles();
  }, [espacioId]);

  const cargarDetalles = async () => {
    try {
      setLoading(true);
      console.log('📍 Cargando detalles del espacio ID:', espacioId);
      
      const [espacioRes, recursosRes, reservasRes] = await Promise.all([
        espaciosAPI.obtenerPorId(espacioId),
        espaciosAPI.obtenerRecursosDeEspacio(espacioId),
        reservasAPI.obtenerTodas()
      ]);

      console.log('✅ Espacio obtenido:', espacioRes.data);
      console.log('✅ Recursos obtenidos:', recursosRes.data);
      console.log('✅ Reservas obtenidas:', reservasRes.data);

      setEspacio(espacioRes.data);
      setRecursos(recursosRes.data || []);
      // Filtrar reservas para este espacio y que estén confirmadas
      const reservasDelEspacio = (reservasRes.data || []).filter(r => 
        r.espacio_id === espacioId && r.estado === 'confirmada'
      );
      setReservas(reservasDelEspacio);
      setError('');
    } catch (err) {
      console.error('Error cargando detalles:', err);
      setError('Error al cargar los detalles del espacio: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditarReserva = (reserva) => {
    setEditandoReserva(reserva.id);
    setFormReservaEditada({
      fecha_inicio: reserva.fecha_inicio,
      fecha_fin: reserva.fecha_fin,
      hora_inicio: reserva.hora_inicio,
      hora_fin: reserva.hora_fin,
      descripcion: reserva.descripcion || '',
      notas: reserva.notas || ''
    });
  };

  const handleCancelarEdicion = () => {
    setEditandoReserva(null);
    setFormReservaEditada({});
  };

  const handleGuardarReserva = async () => {
    try {
      setLoading(true);
      await reservasAPI.actualizar(editandoReserva, formReservaEditada);
      await cargarDetalles();
      setEditandoReserva(null);
    } catch (err) {
      console.error('Error actualizando reserva:', err);
      setError('Error al actualizar la reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarReserva = async (reservaId) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
      return;
    }

    try {
      setLoading(true);
      await reservasAPI.cancelar(reservaId);
      await cargarDetalles();
    } catch (err) {
      console.error('Error cancelando reserva:', err);
      setError('Error al cancelar la reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormReservaEditada(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content loading">
          ⏳ Cargando detalles del espacio {espacioId}...
        </div>
      </div>
    );
  }

  if (!espacio) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <p>Espacio no encontrado</p>
          <button onClick={onClose} className="btn-cerrar">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="detail-header">
          <h2>📍 {espacio.nombre}</h2>
          <button onClick={onClose} className="btn-cerrar">✕</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* INFORMACIÓN DEL ESPACIO */}
        <div className="detail-section">
          <h3>ℹ️ Información General</h3>
          <div className="info-grid">
            <div className="info-item">
              <strong>Capacidad:</strong>
              <span>{espacio.capacidad || 'No especificada'}</span>
            </div>
            <div className="info-item">
              <strong>Ubicación:</strong>
              <span>{espacio.ubicacion || '-'}</span>
            </div>
            <div className="info-item">
              <strong>Estado:</strong>
              <span className={`estado ${espacio.estado}`}>{espacio.estado}</span>
            </div>
            <div className="info-item">
              <strong>Máx. horas por reserva:</strong>
              <span>{espacio.max_horas_por_reserva || '-'} horas</span>
            </div>
            <div className="info-item">
              <strong>Requiere aprobación:</strong>
              <span>{espacio.requiere_aprobacion ? '✓ Sí' : '✗ No'}</span>
            </div>
          </div>

          {espacio.descripcion && (
            <div className="descripcion-section">
              <strong>Descripción:</strong>
              <p>{espacio.descripcion}</p>
            </div>
          )}
        </div>

        {/* RECURSOS DISPONIBLES */}
        {recursos.length > 0 && (
          <div className="detail-section">
            <h3>🎛️ Recursos Disponibles</h3>
            <div className="recursos-grid">
              {recursos.map(recurso => (
                <div key={recurso.id} className="recurso-card">
                  <strong>{recurso.nombre}</strong>
                  <div className="recurso-detalles">
                    <span>Máx. disponibles: {recurso.cantidad_maxima}</span>
                    <span>Stock total: {recurso.cantidad_total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESERVAS CONFIRMADAS */}
        <div className="detail-section">
          <h3>📅 Reservas Confirmadas ({reservas.length})</h3>

          {reservas.length > 0 ? (
            <div className="reservas-list">
              {reservas.map(reserva => (
                <div key={reserva.id} className="reserva-card">
                  {editandoReserva === reserva.id ? (
                    // FORMULARIO DE EDICIÓN
                    <div className="reserva-edicion">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Fecha Inicio</label>
                          <input
                            type="date"
                            name="fecha_inicio"
                            value={formReservaEditada.fecha_inicio}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group">
                          <label>Hora Inicio</label>
                          <input
                            type="time"
                            name="hora_inicio"
                            value={formReservaEditada.hora_inicio}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Fecha Fin</label>
                          <input
                            type="date"
                            name="fecha_fin"
                            value={formReservaEditada.fecha_fin}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group">
                          <label>Hora Fin</label>
                          <input
                            type="time"
                            name="hora_fin"
                            value={formReservaEditada.hora_fin}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Descripción</label>
                        <textarea
                          name="descripcion"
                          value={formReservaEditada.descripcion}
                          onChange={handleInputChange}
                          rows="2"
                        />
                      </div>

                      <div className="form-actions">
                        <button onClick={handleGuardarReserva} className="btn-guardar">
                          💾 Guardar Cambios
                        </button>
                        <button onClick={handleCancelarEdicion} className="btn-cancelar">
                          ✕ Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // VISTA DE DETALLES
                    <div className="reserva-info">
                      <div className="reserva-header">
                        <strong>Reserva #{reserva.id}</strong>
                        <span className={`estado ${reserva.estado}`}>{reserva.estado}</span>
                      </div>

                      <div className="reserva-detalles">
                        <p>
                          <strong>Solicitante:</strong> {reserva.usuario_nombre || 'N/A'}
                        </p>
                        <p>
                          <strong>Período:</strong> {new Date(reserva.fecha_inicio).toLocaleDateString('es-ES')} {reserva.hora_inicio} → {new Date(reserva.fecha_fin).toLocaleDateString('es-ES')} {reserva.hora_fin}
                        </p>
                        {reserva.descripcion && (
                          <p>
                            <strong>Descripción:</strong> {reserva.descripcion}
                          </p>
                        )}
                        {reserva.notas && (
                          <p>
                            <strong>Notas:</strong> {reserva.notas}
                          </p>
                        )}
                        {reserva.recursos && reserva.recursos.length > 0 && (
                          <div className="recursos-reserva">
                            <strong>Recursos solicitados:</strong>
                            <ul>
                              {reserva.recursos.map(r => (
                                <li key={r.id}>{r.nombre} x{r.cantidad}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="reserva-acciones">
                        <button
                          onClick={() => handleEditarReserva(reserva)}
                          className="btn-editar"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleCancelarReserva(reserva.id)}
                          className="btn-eliminar"
                        >
                          🗑️ Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No hay reservas confirmadas para este espacio.</p>
          )}
        </div>

        <button onClick={onClose} className="btn-cerrar-modal">Cerrar Detalles</button>
      </div>
    </div>
  );
};

export default EspacioDetail;
