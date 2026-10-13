import React, { useCallback, useEffect, useState } from 'react';
import { eventosAPI, secretariasAPI } from '../services/api';
import '../styles/SolicitudesEventos.css';

const SolicitudesEventos = ({ user }) => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('pendiente');
  const [secretariaFiltro, setSecretariaFiltro] = useState('');
  const [secretarias, setSecretarias] = useState([]);
  const [procesandoId, setProcesandoId] = useState(null);
  const [solicitudAprobacion, setSolicitudAprobacion] = useState(null);
  const [solicitudRechazo, setSolicitudRechazo] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const cargarSolicitudes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { estado: estadoFiltro };
      if (user?.role === 'admin' && secretariaFiltro) {
        params.secretaria_id = secretariaFiltro;
      }
      const response = await eventosAPI.obtenerSolicitudesPendientes(params);
      setSolicitudes(response.data.solicitudes || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro, secretariaFiltro, user?.role]);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    secretariasAPI.obtenerTodas()
      .then((response) => setSecretarias(response.data.secretarias || []))
      .catch(() => setSecretarias([]));
  }, [user?.role]);

  const cambiarFiltro = (estado) => {
    setEstadoFiltro(estado);
    setError('');
    setMensaje('');
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    const partes = String(fecha).slice(0, 10).split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fecha;
  };

  const formatearFechaHora = (fecha) =>
    fecha ? new Date(fecha).toLocaleString('es-AR') : 'Sin fecha';

  const aprobarSolicitud = async (solicitud) => {
    setProcesandoId(solicitud.id);
    setError('');
    setMensaje('');
    try {
      const response = await eventosAPI.aprobarSolicitud(solicitud.id);
      setSolicitudAprobacion(null);
      setMensaje(response.data.correo_enviado
        ? 'Solicitud aprobada. El evento fue publicado y se envió el correo.'
        : 'Solicitud aprobada y publicada. No se pudo enviar el correo; revisa la configuración de destinatarios.');
      await cargarSolicitudes();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo aprobar la solicitud.');
    } finally {
      setProcesandoId(null);
    }
  };

  const abrirRechazo = (solicitud) => {
    setSolicitudRechazo(solicitud);
    setMotivoRechazo('');
  };

  const rechazarSolicitud = async (event) => {
    event.preventDefault();
    if (!solicitudRechazo || !motivoRechazo.trim()) return;
    setProcesandoId(solicitudRechazo.id);
    setError('');
    setMensaje('');
    try {
      const response = await eventosAPI.rechazarSolicitud(
        solicitudRechazo.id,
        motivoRechazo.trim(),
      );
      setMensaje(response.data.message || 'Solicitud rechazada.');
      setSolicitudRechazo(null);
      setMotivoRechazo('');
      await cargarSolicitudes();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo rechazar la solicitud.');
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <section className="solicitudes-page" aria-label="Bandeja de solicitudes de eventos">
      <div className="solicitudes-heading">
        <div>
          <p className="solicitudes-eyebrow">
            Bandeja de revisión · {user?.role === 'admin' ? 'Todas las secretarías' : user?.secretaria || 'Mi secretaría'}
          </p>
          <h3>Solicitudes para comunicar</h3>
          <p>Al aprobar, el evento se publica y se intenta enviar el correo correspondiente.</p>
        </div>
        <button type="button" className="solicitud-refresh" onClick={cargarSolicitudes} disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="solicitud-filtros">
        <div className="solicitud-tabs" role="tablist" aria-label="Filtrar solicitudes">
          {[
            ['pendiente', 'Pendientes'],
            ['aprobada', 'Aprobadas'],
            ['rechazada', 'Rechazadas'],
            ['todas', 'Todas'],
          ].map(([estado, label]) => (
            <button
              type="button"
              role="tab"
              aria-selected={estadoFiltro === estado}
              className={estadoFiltro === estado ? 'solicitud-tab solicitud-tab-active' : 'solicitud-tab'}
              key={estado}
              onClick={() => cambiarFiltro(estado)}
            >
              {label}
            </button>
          ))}
        </div>
        {user?.role === 'admin' && (
          <select
            aria-label="Filtrar por secretaría"
            value={secretariaFiltro}
            onChange={(event) => setSecretariaFiltro(event.target.value)}
          >
            <option value="">Todas las secretarías</option>
            {secretarias.map((secretaria) => (
              <option key={secretaria.id} value={secretaria.id}>{secretaria.nombre}</option>
            ))}
          </select>
        )}
      </div>

      <div className="solicitudes-summary" aria-label="Resumen de solicitudes">
        <div><strong>{solicitudes.length}</strong><span>{estadoFiltro === 'todas' ? 'Solicitudes' : `${estadoFiltro === 'pendiente' ? 'Pendientes' : estadoFiltro === 'aprobada' ? 'Aprobadas' : 'Rechazadas'}`}</span></div>
      </div>

      {mensaje && <p className="solicitud-feedback" role="status">{mensaje}</p>}
      {error && (
        <div className="solicitud-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={cargarSolicitudes}>Reintentar</button>
        </div>
      )}

      {loading ? (
        <p className="solicitudes-loading">Cargando solicitudes...</p>
      ) : solicitudes.length === 0 ? (
        <div className="solicitud-empty">
          <strong>No hay solicitudes pendientes</strong>
          <span>Las solicitudes de tu ámbito aparecerán aquí.</span>
        </div>
      ) : (
        <div className="solicitudes-list">
          {solicitudes.map((solicitud) => (
            <article className={`solicitud-item solicitud-item-${solicitud.estado_aprobacion}`} key={solicitud.id}>
              <div className="solicitud-topline">
                <div>
                  <span className="solicitud-id">Evento #{solicitud.id}</span>
                  <span className={`solicitud-status solicitud-status-${solicitud.estado_aprobacion}`}>
                    {solicitud.estado_aprobacion === 'aprobada' ? 'Aprobada' : solicitud.estado_aprobacion === 'rechazada' ? 'Rechazada' : 'Pendiente'}
                  </span>
                </div>
                <span className="solicitud-time">Recibida {formatearFechaHora(solicitud.fecha_carga)}</span>
              </div>

              <div className="solicitud-content">
                <div className="solicitud-main">
                  <h4>{solicitud.nombre}</h4>
                  <p>{solicitud.descripcion || 'Sin descripción.'}</p>
                  <div className="solicitud-details">
                    <div><span>Solicitante</span><strong>{solicitud.solicitante_nombre || 'Usuario'}</strong></div>
                    <div><span>Fecha y horario</span><strong>{formatearFecha(solicitud.fecha_evento)} · {solicitud.hora_inicio?.slice(0, 5) || 'Sin hora'} a {solicitud.hora_fin?.slice(0, 5) || 'Sin hora'}</strong></div>
                    <div><span>Lugar</span><strong>{solicitud.lugar || 'No especificado'}</strong></div>
                    <div><span>Categoría</span><strong>{solicitud.categoria_nombre || 'Sin categoría'}</strong></div>
                    <div><span>Secretaría responsable</span><strong>{solicitud.secretaria_responsable_nombre || 'Sin asignar'}</strong></div>
                    <div><span>Archivos adjuntos</span><strong>{solicitud.total_archivos || 0}</strong></div>
                    {solicitud.reserva_id && (
                      <div>
                        <span>Origen</span>
                        <strong>
                          Reserva #{solicitud.reserva_id}
                          {solicitud.reserva_estado ? ` (${solicitud.reserva_estado})` : ''}
                        </strong>
                      </div>
                    )}
                    {solicitud.resuelto_por_nombre && <div><span>Resuelta por</span><strong>{solicitud.resuelto_por_nombre}</strong></div>}
                    {solicitud.resuelto_at && <div><span>Fecha de resolución</span><strong>{formatearFechaHora(solicitud.resuelto_at)}</strong></div>}
                  </div>
                  {solicitud.estado_aprobacion === 'rechazada' && solicitud.motivo_rechazo && (
                    <p className="solicitud-motivo-rechazo"><strong>Motivo:</strong> {solicitud.motivo_rechazo}</p>
                  )}
                </div>
              </div>

              {solicitud.estado_aprobacion === 'pendiente' && solicitudRechazo?.id === solicitud.id ? (
                <form className="solicitud-rechazo-form" onSubmit={rechazarSolicitud}>
                  <label htmlFor={`motivo-rechazo-${solicitud.id}`}>Motivo del rechazo *</label>
                  <textarea
                    id={`motivo-rechazo-${solicitud.id}`}
                    value={motivoRechazo}
                    onChange={(event) => setMotivoRechazo(event.target.value)}
                    maxLength={2000}
                    rows={3}
                    required
                    autoFocus
                  />
                  <div>
                    <button type="button" onClick={() => setSolicitudRechazo(null)} disabled={procesandoId === solicitud.id}>
                      Cancelar
                    </button>
                    <button type="submit" className="solicitud-reject" disabled={procesandoId === solicitud.id || !motivoRechazo.trim()}>
                      {procesandoId === solicitud.id ? 'Rechazando...' : 'Confirmar rechazo'}
                    </button>
                  </div>
                </form>
              ) : solicitud.estado_aprobacion === 'pendiente' ? (
                <div className="solicitud-actions">
                  <span>
                    {solicitud.reserva_id && solicitud.reserva_estado !== 'confirmada'
                      ? 'Este evento proviene de una reserva. Primero aprobá la reserva para poder publicarlo.'
                      : 'La resolución quedará registrada con tu usuario y fecha.'}
                  </span>
                  <div>
                    <button type="button" className="solicitud-reject" onClick={() => abrirRechazo(solicitud)} disabled={procesandoId === solicitud.id}>
                      Rechazar
                    </button>
                    <button
                      type="button"
                      className="solicitud-approve"
                      onClick={() => setSolicitudAprobacion(solicitud)}
                      disabled={procesandoId === solicitud.id || (solicitud.reserva_id && solicitud.reserva_estado !== 'confirmada')}
                    >
                      Aprobar y publicar
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {solicitudAprobacion && (
        <div
          className="solicitud-confirm-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && procesandoId !== solicitudAprobacion.id) {
              setSolicitudAprobacion(null);
              setError('');
            }
          }}
        >
          <section
            className="solicitud-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="solicitud-confirm-title"
          >
            <h3 id="solicitud-confirm-title">¿Aprobar y publicar este evento?</h3>
            <p className="solicitud-confirm-name">{solicitudAprobacion.nombre}</p>
            <p>
              El evento quedará visible en el tablero y se intentará enviar el correo de comunicación.
              Esta decisión no modifica ninguna reserva.
            </p>
            <div className="solicitud-confirm-meta">
              <span>Fecha del evento</span>
              <strong>{formatearFecha(solicitudAprobacion.fecha_evento)}</strong>
            </div>
            {error && <p className="solicitud-confirm-error" role="alert">{error}</p>}
            <div className="solicitud-confirm-actions">
              <button
                type="button"
                onClick={() => {
                  setSolicitudAprobacion(null);
                  setError('');
                }}
                disabled={procesandoId === solicitudAprobacion.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="solicitud-approve"
                onClick={() => aprobarSolicitud(solicitudAprobacion)}
                disabled={procesandoId === solicitudAprobacion.id}
                autoFocus
              >
                {procesandoId === solicitudAprobacion.id ? 'Aprobando...' : 'Confirmar aprobación'}
              </button>
            </div>
          </section>
        </div>
      )}

    </section>
  );
};

export default SolicitudesEventos;
