import React, { useCallback, useEffect, useState } from 'react';
import { eventosAPI, secretariasAPI, reservasAPI } from '../services/api';
import '../styles/SolicitudesEventos.css';

const SolicitudesEventos = ({ user }) => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('pendiente');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [secretariaFiltro, setSecretariaFiltro] = useState('');
  const [secretarias, setSecretarias] = useState([]);
  const [procesandoId, setProcesandoId] = useState(null);
  const [solicitudAprobacion, setSolicitudAprobacion] = useState(null);
  const [solicitudRechazo, setSolicitudRechazo] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [reservasPendientes, setReservasPendientes] = useState([]);
  const [procesandoReservaId, setProcesandoReservaId] = useState(null);

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

  const cargarReservasPendientes = useCallback(async () => {
    try {
      const response = await reservasAPI.obtenerTodas();
      const pendientes = (response.data || []).filter(
        (reserva) => reserva.estado === 'pendiente'
          && (user?.role === 'admin' || Number(reserva.puede_aprobar) === 1),
      );
      setReservasPendientes(pendientes);
    } catch (requestError) {
      setReservasPendientes([]);
    }
  }, [user?.role]);

  useEffect(() => {
    cargarReservasPendientes();
  }, [cargarReservasPendientes]);

  const aprobarReserva = async (reserva) => {
    if (!window.confirm(`¿Aprobar la reserva ${reserva.numero_reserva}?`)) return;
    setProcesandoReservaId(reserva.id);
    setError('');
    setMensaje('');
    try {
      await reservasAPI.aprobar(reserva.id);
      setMensaje(`Reserva ${reserva.numero_reserva} aprobada.`);
      await cargarReservasPendientes();
      await cargarSolicitudes();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo aprobar la reserva.');
    } finally {
      setProcesandoReservaId(null);
    }
  };

  const rechazarReserva = async (reserva) => {
    if (!window.confirm(`¿Rechazar la reserva ${reserva.numero_reserva}?`)) return;
    setProcesandoReservaId(reserva.id);
    setError('');
    setMensaje('');
    try {
      await reservasAPI.rechazar(reserva.id);
      setMensaje(`Reserva ${reserva.numero_reserva} rechazada.`);
      await cargarReservasPendientes();
      await cargarSolicitudes();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo rechazar la reserva.');
    } finally {
      setProcesandoReservaId(null);
    }
  };

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
          <h3>Solicitudes de aprobación</h3>
          <p>Eventos a comunicar y reservas de espacios que esperan tu aprobación.</p>
        </div>
        <button type="button" className="solicitud-refresh" onClick={cargarSolicitudes} disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="solicitud-tabs solicitud-tabs-tipo" role="tablist" aria-label="Filtrar por tipo de solicitud">
        {[
          ['todos', 'Todos'],
          ['eventos', 'Eventos'],
          ['reservas', 'Reservas'],
        ].map(([tipo, label]) => (
          <button
            type="button"
            role="tab"
            aria-selected={tipoFiltro === tipo}
            className={tipoFiltro === tipo ? 'solicitud-tab solicitud-tab-active' : 'solicitud-tab'}
            key={tipo}
            onClick={() => setTipoFiltro(tipo)}
          >
            {label}
          </button>
        ))}
      </div>

      {(tipoFiltro === 'todos' || tipoFiltro === 'eventos') && (
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
      )}

      <div className="solicitudes-summary" aria-label="Resumen de solicitudes">
        {(tipoFiltro === 'todos' || tipoFiltro === 'eventos') && (
          <div>
            <strong>{solicitudes.length}</strong>
            <span>
              Eventos {estadoFiltro === 'todas' ? '' : `(${estadoFiltro === 'pendiente' ? 'pendientes' : estadoFiltro === 'aprobada' ? 'aprobados' : 'rechazados'})`}
            </span>
          </div>
        )}
        {(tipoFiltro === 'todos' || tipoFiltro === 'reservas') && (
          <div><strong>{reservasPendientes.length}</strong><span>Reservas pendientes</span></div>
        )}
      </div>

      {mensaje && <p className="solicitud-feedback" role="status">{mensaje}</p>}
      {error && (
        <div className="solicitud-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={cargarSolicitudes}>Reintentar</button>
        </div>
      )}

      {(tipoFiltro === 'todos' || tipoFiltro === 'eventos') && (
        <>
          <h4 className="solicitudes-subtitle">Solicitudes de eventos pendientes</h4>

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
        </>
      )}

      {(tipoFiltro === 'todos' || tipoFiltro === 'reservas') && (
      <section className="solicitudes-reservas">
        <h4 className="solicitudes-subtitle">Solicitudes de reservas pendientes</h4>
        {reservasPendientes.length === 0 ? (
          <div className="solicitud-empty">
            <strong>No hay reservas pendientes</strong>
            <span>Las reservas de espacios que esperan tu aprobación aparecerán aquí.</span>
          </div>
        ) : (
          <div className="solicitudes-list">
            {reservasPendientes.map((reserva) => (
              <article className="solicitud-item solicitud-item-pendiente" key={`reserva-${reserva.id}`}>
                <div className="solicitud-topline">
                  <div>
                    <span className="solicitud-id">Reserva {reserva.numero_reserva}</span>
                    <span className="solicitud-status solicitud-status-pendiente">Pendiente</span>
                  </div>
                  <span className="solicitud-time">Solicitada {formatearFechaHora(reserva.fecha_solicitud)}</span>
                </div>

                <div className="solicitud-content">
                  <div className="solicitud-main">
                    <h4>{reserva.titulo}</h4>
                    <p>{reserva.descripcion || 'Sin descripción.'}</p>
                    <div className="solicitud-details">
                      <div><span>Espacio</span><strong>{reserva.espacio_nombre}</strong></div>
                      <div><span>Solicitante</span><strong>{reserva.usuario_nombre || 'Usuario'}</strong></div>
                      <div><span>Fecha</span><strong>{formatearFecha(reserva.fecha_inicio)}</strong></div>
                      <div><span>Horario</span><strong>{reserva.hora_inicio?.slice(0, 5)} a {reserva.hora_fin?.slice(0, 5)}</strong></div>
                    </div>
                  </div>
                </div>

                <div className="solicitud-actions">
                  <span>La resolución quedará registrada con tu usuario y fecha.</span>
                  <div>
                    <button type="button" className="solicitud-reject" onClick={() => rechazarReserva(reserva)} disabled={procesandoReservaId === reserva.id}>
                      Rechazar
                    </button>
                    <button type="button" className="solicitud-approve" onClick={() => aprobarReserva(reserva)} disabled={procesandoReservaId === reserva.id}>
                      Aprobar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
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
