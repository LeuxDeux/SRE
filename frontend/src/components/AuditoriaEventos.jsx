import React, { useCallback, useEffect, useState } from 'react';
import { eventosAPI } from '../services/api';
import '../styles/AuditoriaReservas.css';

const filtrosIniciales = {
  accion: '',
  entidad_tipo: '',
  fecha_desde: '',
  fecha_hasta: '',
};

const parsearDatos = (valor) => {
  if (valor == null || valor === '') return null;
  if (typeof valor !== 'string') return valor;
  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
};

const etiquetasAccion = {
  solicitar: 'Solicitud',
  crear: 'Creación',
  editar: 'Edición',
  eliminar: 'Eliminación',
  aprobar: 'Aprobación',
  rechazar: 'Rechazo',
};

const etiquetasEntidad = {
  evento: 'Evento',
};

const etiquetasCampos = {
  nombre: 'nombre',
  descripcion: 'descripción',
  fecha_evento: 'fecha del evento',
  fecha_fin: 'fecha de fin',
  hora_inicio: 'hora de inicio',
  hora_fin: 'hora de fin',
  lugar: 'lugar',
  categoria_id: 'categoría',
  correo_contacto: 'correo de contacto',
  telefono: 'teléfono',
  publico_destinatario: 'público destinatario',
  links: 'links',
  observaciones: 'observaciones',
  estado_aprobacion: 'estado de aprobación',
  motivo_rechazo: 'motivo de rechazo',
};

const formatearValor = (campo, valor) => {
  if (valor == null || valor === '') return 'sin especificar';
  if (campo.startsWith('fecha_') && /^\d{4}-\d{2}-\d{2}/.test(String(valor))) {
    const [anio, mes, dia] = String(valor).slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  }
  if (campo.startsWith('hora_')) return String(valor).slice(0, 5);
  return String(valor);
};

const obtenerCambiosHumanos = (registro) => {
  const anteriores = parsearDatos(registro.datos_anteriores) || {};
  const nuevos = parsearDatos(registro.datos_nuevos) || {};
  const cambios = [];

  // Para eliminaciones: mostrar los datos que tenía el evento eliminado
  if (registro.accion === 'eliminar') {
    return Object.entries(etiquetasCampos)
      .filter(([campo]) => campo in anteriores && anteriores[campo] != null && anteriores[campo] !== '')
      .map(([campo, etiqueta]) => `${etiqueta}: ${formatearValor(campo, anteriores[campo])}`);
  }
  Object.entries(etiquetasCampos).forEach(([campo, etiqueta]) => {
    if (!(campo in nuevos)) return;
    if (campo in anteriores && String(anteriores[campo] ?? '') === String(nuevos[campo] ?? '')) return;
    const valorNuevo = formatearValor(campo, nuevos[campo]);
    if (campo in anteriores) {
      cambios.push(`Se cambió ${etiqueta} de ${formatearValor(campo, anteriores[campo])} a ${valorNuevo}.`);
    } else {
      cambios.push(`Se agregó ${etiqueta}: ${valorNuevo}.`);
    }
  });
  return cambios;
};

const describirRegistro = (registro) => {
  const actor = registro.actor_nombre || registro.username || 'Un usuario';
  const evento = registro.evento_nombre
    ? `“${registro.evento_nombre}”`
    : (registro.evento_id ? `#${registro.evento_id}` : 'un evento');

  switch (registro.accion) {
    case 'solicitar':
      return `${actor} envió a aprobación el evento ${evento}.`;
    case 'crear':
      return `${actor} creó/publicó el evento ${evento}.`;
    case 'editar': {
      const cambios = obtenerCambiosHumanos(registro);
      return cambios.length
        ? `${actor} editó ${evento}: ${cambios.join(' ')}`
        : `${actor} editó el evento ${evento}.`;
    }
    case 'eliminar':
      return `${actor} eliminó el evento ${evento}.`;
    case 'aprobar':
      return `${actor} aprobó y publicó el evento ${evento}.`;
    case 'rechazar': {
      const nuevos = parsearDatos(registro.datos_nuevos) || {};
      return `${actor} rechazó el evento ${evento}${nuevos.motivo_rechazo ? ` (motivo: ${nuevos.motivo_rechazo})` : ''}.`;
    }
    default:
      return `${actor} realizó una acción sobre el evento ${evento}.`;
  }
};

const AuditoriaEventos = ({ onVolver }) => {
  const [registros, setRegistros] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, limite: 25, total: 0, paginas: 0 });
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarAuditoria = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(
        Object.entries({ ...filtros, pagina: paginacion.pagina, limite: paginacion.limite })
          .filter(([, value]) => value !== '' && value != null),
      );
      const response = await eventosAPI.obtenerAuditoriaEventos(params);
      setRegistros(response.data.registros || []);
      if (response.data.paginacion) {
        setPaginacion(response.data.paginacion);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo cargar la auditoría.');
    } finally {
      setLoading(false);
    }
  }, [filtros, paginacion.pagina, paginacion.limite]);

  useEffect(() => {
    cargarAuditoria();
  }, [cargarAuditoria]);

  const actualizarFiltro = (campo, valor) => {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }));
    setPaginacion((actual) => ({ ...actual, pagina: 1 }));
  };

  const cambiarPagina = (pagina) => {
    setPaginacion((actual) => ({ ...actual, pagina }));
  };

  return (
    <section className="auditoria-page" aria-label="Auditoría del módulo de eventos">
      <div className="auditoria-heading">
        <div>
          <p className="auditoria-eyebrow">Registro de eventos</p>
          <h3>Auditoría del módulo de eventos</h3>
          <p>Registro de acciones sobre los eventos a comunicar.</p>
        </div>
        <button type="button" className="auditoria-back" onClick={onVolver}>Volver</button>
      </div>

      <div className="auditoria-filtros">
        <label>
          Acción
          <select value={filtros.accion} onChange={(event) => actualizarFiltro('accion', event.target.value)}>
            <option value="">Todas</option>
            <option value="solicitar">Solicitud</option>
            <option value="crear">Creación</option>
            <option value="editar">Edición</option>
            <option value="aprobar">Aprobación</option>
            <option value="rechazar">Rechazo</option>
            <option value="eliminar">Eliminación</option>
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={filtros.fecha_desde} onChange={(event) => actualizarFiltro('fecha_desde', event.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={filtros.fecha_hasta} onChange={(event) => actualizarFiltro('fecha_hasta', event.target.value)} />
        </label>
        <button type="button" className="auditoria-clear" onClick={() => {
          setFiltros(filtrosIniciales);
          setPaginacion((actual) => ({ ...actual, pagina: 1 }));
        }}>
          Limpiar filtros
        </button>
      </div>

      <div className="auditoria-summary">
        <strong>{paginacion.total}</strong>
        <span>acciones registradas</span>
      </div>

      {error && <div className="auditoria-error" role="alert">{error}</div>}
      {loading ? (
        <p className="auditoria-loading">Cargando auditoría...</p>
      ) : registros.length === 0 ? (
        <div className="auditoria-empty">
          No hay acciones para los filtros seleccionados.
        </div>
      ) : (
        <div className="auditoria-table-wrap">
          <table className="auditoria-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Actor</th>
                <th>Acción</th>
                <th>Evento</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((registro) => (
                <tr key={registro.id}>
                  <td>{new Date(registro.fecha_accion).toLocaleString('es-AR', { hour12: false })}</td>
                  <td>
                    <strong>{registro.actor_nombre || registro.username || `Usuario ${registro.actor_id || 'eliminado'}`}</strong>
                    <small>{registro.actor_role}{registro.secretaria_nombre ? ` · ${registro.secretaria_nombre}` : ''}</small>
                  </td>
                  <td>{etiquetasAccion[registro.accion] || 'Actualización'}</td>
                  <td>{etiquetasEntidad[registro.entidad_tipo] || 'Evento'}{registro.evento_nombre ? ` · ${registro.evento_nombre}` : registro.evento_id ? ` #${registro.evento_id}` : ''}</td>
                  <td>
                    <p>{describirRegistro(registro)}</p>
                    {registro.observaciones && <small>{registro.observaciones}</small>}
                    {obtenerCambiosHumanos(registro).length > 0 && (
                      <details>
                        <summary>Ver más detalles</summary>
                        <ul>
                          {obtenerCambiosHumanos(registro).map((cambio, index) => <li key={index}>{cambio}</li>)}
                        </ul>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="auditoria-paginacion">
        <button type="button" onClick={() => cambiarPagina(paginacion.pagina - 1)} disabled={loading || paginacion.pagina <= 1}>
          Anterior
        </button>
        <span>Página {paginacion.pagina} de {Math.max(1, paginacion.paginas)}</span>
        <button type="button" onClick={() => cambiarPagina(paginacion.pagina + 1)} disabled={loading || paginacion.pagina >= paginacion.paginas}>
          Siguiente
        </button>
      </div>
    </section>
  );
};

export default AuditoriaEventos;
