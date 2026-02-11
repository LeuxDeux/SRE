import React, { useState, useEffect } from 'react';
import { espaciosRecursosAPI, reservasRecursosAPI } from '../services/api';
import '../styles/SelectorRecursos.css';

const SelectorRecursos = ({ reservaId, espacioId, onClose, onActualizar }) => {
  const [recursosAsignados, setRecursosAsignados] = useState([]);
  const [recursosDisponibles, setRecursosDisponibles] = useState([]);
  const [recursosReservados, setRecursosReservados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    recurso_id: '',
    cantidad_solicitada: 1,
    observaciones: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Obtener recursos asignados al espacio
      const recursosEspacioRes = await espaciosRecursosAPI.obtenerRecursosDeEspacio(espacioId);
      const recursosEspacio = recursosEspacioRes.data || recursosEspacioRes || [];
      setRecursosAsignados(recursosEspacio);

      // Obtener recursos ya reservados
      const recursosReservadosRes = await reservasRecursosAPI.obtenerRecursosDeReserva(reservaId);
      const recursosReservadosData = recursosReservadosRes.data?.recursos || recursosReservadosRes?.recursos || [];
      setRecursosReservados(recursosReservadosData);

      // Calcular disponibles (asignados al espacio pero no en esta reserva)
      const idsReservados = recursosReservadosData.map(r => r.recurso_id);
      const disponibles = recursosEspacio.filter(r => !idsReservados.includes(r.recurso_id));
      setRecursosDisponibles(disponibles);

      setError(null);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los recursos');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cantidad_solicitada' ? parseInt(value) || 1 : value
    }));
  };

  const handleAgregarRecurso = async (e) => {
    e.preventDefault();
    try {
      if (!formData.recurso_id) {
        setError('Selecciona un recurso');
        return;
      }

      await reservasRecursosAPI.agregarRecursoAReserva(reservaId, [
        {
          recurso_id: parseInt(formData.recurso_id),
          cantidad_solicitada: formData.cantidad_solicitada,
          observaciones: formData.observaciones
        }
      ]);

      // Recargar
      await cargarDatos();
      setFormData({ recurso_id: '', cantidad_solicitada: 1, observaciones: '' });
      setError(null);

      // Notificar al componente padre
      if (onActualizar) onActualizar();
    } catch (err) {
      console.error('Error agregando recurso:', err);
      setError(err.response?.data?.error || 'Error al agregar el recurso');
    }
  };

  const handleQuitarRecurso = async (recursoId) => {
    if (!window.confirm('¿Estás seguro de quitar este recurso?')) return;

    try {
      await reservasRecursosAPI.quitarRecursoDeReserva(reservaId, recursoId);
      await cargarDatos();
      setError(null);

      if (onActualizar) onActualizar();
    } catch (err) {
      console.error('Error quitando recurso:', err);
      setError('Error al quitar el recurso');
    }
  };

  const getRecursoAsignado = (recursoId) => {
    return recursosAsignados.find(r => r.id === recursoId);
  };

  if (loading) {
    return <div className="modal-overlay"><div className="modal"><p>Cargando...</p></div></div>;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-selector-recursos" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🎛️ Gestionar Recursos de Reserva</h3>
          <button onClick={onClose} className="btn-cerrar">✖️</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-content">
          {/* FORMULARIO PARA AGREGAR RECURSO */}
          {recursosDisponibles.length > 0 && (
            <div className="formulario-recursos">
              <h4>➕ Agregar Recurso</h4>
              <form onSubmit={handleAgregarRecurso}>
                <div className="form-group">
                  <label>Recurso</label>
                  <select
                    name="recurso_id"
                    value={formData.recurso_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Seleccionar recurso...</option>
                    {recursosDisponibles.map(recurso => (
                      <option key={recurso.id} value={recurso.recurso_id}>
                        {recurso.nombre} (Máx: {recurso.cantidad_maxima})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Cantidad Solicitada</label>
                  <input
                    type="number"
                    name="cantidad_solicitada"
                    value={formData.cantidad_solicitada}
                    onChange={handleInputChange}
                    min="1"
                    max={
                      recursosDisponibles.find(r => r.recurso_id === parseInt(formData.recurso_id))?.cantidad_maxima || 1
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Observaciones (opcional)</label>
                  <textarea
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleInputChange}
                    placeholder="Ej: Necesito proyector 4K..."
                    rows="2"
                  />
                </div>

                <button type="submit" className="btn-agregar">
                  ➕ Agregar Recurso
                </button>
              </form>
            </div>
          )}

          {/* LISTA DE RECURSOS EN ESTA RESERVA */}
          <div className="lista-recursos-reservados">
            <h4>📋 Recursos en la Reserva ({recursosReservados.length})</h4>
            {recursosReservados.length > 0 ? (
              <div className="recursos-list">
                {recursosReservados.map(rr => {
                  const recurso = getRecursoAsignado(rr.recurso_id);
                  return (
                    <div key={rr.id} className="recurso-item">
                      <div className="recurso-info">
                        <strong>{rr.recurso_nombre}</strong>
                        <div className="detalles">
                          <span>Solicitado: {rr.cantidad_solicitada}</span>
                          {rr.cantidad_confirmada !== null && (
                            <span className="confirmado">
                              ✅ Confirmado: {rr.cantidad_confirmada}
                            </span>
                          )}
                          {rr.cantidad_confirmada === null && (
                            <span className="pendiente">⏳ Pendiente de confirmación</span>
                          )}
                        </div>
                        {rr.observaciones && (
                          <small className="observaciones">📝 {rr.observaciones}</small>
                        )}
                      </div>
                      <button
                        onClick={() => handleQuitarRecurso(rr.recurso_id)}
                        className="btn-quitar"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="sin-datos">No hay recursos solicitados en esta reserva.</p>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-cerrar-modal">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectorRecursos;
