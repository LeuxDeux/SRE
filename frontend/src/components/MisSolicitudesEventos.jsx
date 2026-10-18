import React, { useCallback, useEffect, useState } from 'react';
import { eventosAPI } from '../services/api';
import '../styles/SolicitudesEventos.css';

const etiquetasEstado = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

const formatearFecha = (fecha) => {
  if (!fecha) return 'Sin fecha';
  const partes = String(fecha).slice(0, 10).split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fecha;
};

const formatearFechaHora = (fecha) =>
  fecha ? new Date(fecha).toLocaleString('es-AR', { hour12: false }) : 'Sin fecha';

const MisSolicitudesEventos = ({ onVolver }) => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarSolicitudes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await eventosAPI.obtenerMisSolicitudes();
      setSolicitudes(response.data.solicitudes || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudieron cargar tus solicitudes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  return (
    <section className="solicitudes-page" aria-label="Mis solicitudes de eventos">
      <div className="solicitudes-heading">
        <div>
          <p className="solicitudes-eyebrow">Registro de eventos</p>
          <h3>Mis solicitudes</h3>
          <p>Consulta el estado de los eventos que enviaste para revisión.</p>
        </div>
        <div className="mis-solicitudes-actions">
          <button type="button" className="solicitud-refresh" onClick={cargarSolicitudes} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
          <button type="button" className="solicitud-refresh" onClick={onVolver}>
            Volver al tablero
          </button>
        </div>
      </div>

      {error && <div className="solicitud-error" role="alert">{error}</div>}
      {loading ? (
        <p className="solicitudes-loading">Cargando tus solicitudes...</p>
      ) : solicitudes.length === 0 ? (
        <div className="solicitud-empty">
          <strong>Todavía no enviaste solicitudes</strong>
          <span>Cuando solicites un evento, su estado aparecerá aquí.</span>
        </div>
      ) : (
        <div className="solicitudes-list">
          {solicitudes.map((solicitud) => (
            <article className={`solicitud-item solicitud-item-${solicitud.estado_aprobacion}`} key={solicitud.id}>
              <div className="solicitud-topline">
                <div>
                  <span className="solicitud-id">Evento #{solicitud.id}</span>
                  <span className={`solicitud-status solicitud-status-${solicitud.estado_aprobacion}`}>
                    {etiquetasEstado[solicitud.estado_aprobacion] || solicitud.estado_aprobacion}
                  </span>
                </div>
                <span className="solicitud-time">Enviada {formatearFechaHora(solicitud.fecha_carga)}</span>
              </div>
              <div className="solicitud-content">
                <div className="solicitud-main">
                  <h4>{solicitud.nombre}</h4>
                  <p>{solicitud.descripcion || 'Sin descripción.'}</p>
                  <div className="solicitud-details">
                    <div><span>Fecha y horario</span><strong>{formatearFecha(solicitud.fecha_evento)} · {solicitud.hora_inicio?.slice(0, 5) || 'Sin hora'} a {solicitud.hora_fin?.slice(0, 5) || 'Sin hora'}</strong></div>
                    <div><span>Lugar</span><strong>{solicitud.lugar || 'No especificado'}</strong></div>
                    <div><span>Categoría</span><strong>{solicitud.categoria_nombre || 'Sin categoría'}</strong></div>
                    <div><span>Secretaría responsable</span><strong>{solicitud.secretaria_responsable_nombre || 'Sin asignar'}</strong></div>
                    {solicitud.resuelto_por_nombre && <div><span>Resuelta por</span><strong>{solicitud.resuelto_por_nombre}</strong></div>}
                    {solicitud.resuelto_at && <div><span>Fecha de resolución</span><strong>{formatearFechaHora(solicitud.resuelto_at)}</strong></div>}
                  </div>
                  {solicitud.estado_aprobacion === 'rechazada' && solicitud.motivo_rechazo && (
                    <p className="solicitud-motivo-rechazo"><strong>Motivo del rechazo:</strong> {solicitud.motivo_rechazo}</p>
                  )}
                  {solicitud.estado_aprobacion === 'pendiente' && (
                    <p className="solicitud-pendiente-info">La secretaría correspondiente todavía debe revisar esta solicitud.</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default MisSolicitudesEventos;
