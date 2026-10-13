import React, { useCallback, useEffect, useState } from 'react';
import { reservasAPI } from '../services/api';
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
  crear: 'Creación',
  auto_confirmacion_creacion: 'Confirmación automática',
  editar: 'Edición',
  aprobar: 'Aprobación',
  rechazar: 'Rechazo',
  cancelar: 'Cancelación',
  eliminar_logico: 'Baja de reserva',
  eliminar: 'Eliminación',
  reactivar: 'Reactivación',
  asignar_recursos: 'Asignación de recursos',
  quitar_recurso_espacio: 'Retiro de recurso del espacio',
  agregar_recurso_reserva: 'Recurso agregado a reserva',
  editar_recurso_reserva: 'Recurso de reserva actualizado',
  confirmar_recurso_reserva: 'Cantidad de recurso confirmada',
  quitar_recurso_reserva: 'Recurso retirado de reserva',
};

const etiquetasEntidad = {
  reserva: 'Reserva',
  espacio: 'Espacio',
  recurso: 'Recurso',
  asignacion_espacio: 'Asignación de recursos',
  recurso_reserva: 'Recurso de reserva',
};

const etiquetasCampos = {
  fecha_inicio: 'fecha de inicio',
  hora_inicio: 'hora de inicio',
  fecha_fin: 'fecha de fin',
  hora_fin: 'hora de fin',
  titulo: 'título',
  descripcion: 'descripción',
  motivo: 'motivo',
  cantidad_participantes: 'cantidad de participantes',
  notificar_participantes: 'notificación a participantes',
  nombre: 'nombre',
  capacidad: 'capacidad',
  ubicacion: 'ubicación',
  estado: 'estado',
  requiere_aprobacion: 'requisito de aprobación',
  max_horas_por_reserva: 'máximo de horas por reserva',
  cantidad_total: 'cantidad total',
  activo: 'estado de activación',
};

const formatearValor = (campo, valor) => {
  if (valor == null || valor === '') return 'sin especificar';
  if (campo.startsWith('fecha_') && /^\d{4}-\d{2}-\d{2}/.test(String(valor))) {
    const [anio, mes, dia] = String(valor).slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  }
  if (campo.startsWith('hora_')) return String(valor).slice(0, 5);
  if (campo === 'notificar_participantes') return valor ? 'activada' : 'desactivada';
  if (campo === 'requiere_aprobacion') return valor ? 'sí' : 'no';
  if (campo === 'activo') return valor ? 'activo' : 'inactivo';
  return String(valor);
};

const obtenerCambiosHumanos = (registro) => {
  const anteriores = parsearDatos(registro.datos_anteriores) || {};
  const nuevos = parsearDatos(registro.datos_nuevos) || {};
  const cambios = [];

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

  if (Array.isArray(nuevos.recursos_ids)) {
    cambios.push('Se actualizaron los recursos asociados a la reserva.');
  }

  if (
    Array.isArray(anteriores.recursos_solicitados) ||
    Array.isArray(nuevos.recursos_solicitados)
  ) {
    const recursosAntes = Array.isArray(anteriores.recursos_solicitados)
      ? anteriores.recursos_solicitados
      : [];
    const recursosDespues = Array.isArray(nuevos.recursos_solicitados)
      ? nuevos.recursos_solicitados
      : [];
    const antesPorId = new Map(recursosAntes.map((recurso) => [Number(recurso.recurso_id), recurso]));
    const despuesPorId = new Map(recursosDespues.map((recurso) => [Number(recurso.recurso_id), recurso]));
    const recursosAgregados = [];
    const recursosQuitados = [];

    recursosDespues.forEach((recurso) => {
      const anterior = antesPorId.get(Number(recurso.recurso_id));
      if (!anterior) {
        recursosAgregados.push(recurso);
      } else if (Number(anterior.cantidad_solicitada) !== Number(recurso.cantidad_solicitada)) {
        cambios.push(`Se cambió la cantidad de ${recurso.recurso_nombre} de ${anterior.cantidad_solicitada} a ${recurso.cantidad_solicitada}.`);
      }
    });

    recursosAntes.forEach((recurso) => {
      if (!despuesPorId.has(Number(recurso.recurso_id))) {
        recursosQuitados.push(recurso);
      }
    });

    if (recursosAgregados.length === 1 && recursosQuitados.length === 1) {
      cambios.push(`Se cambió el recurso ${recursosQuitados[0].recurso_nombre} por ${recursosAgregados[0].recurso_nombre} en la reserva.`);
    } else {
      recursosAgregados.forEach((recurso) => {
        cambios.push(`Se agregó el recurso ${recurso.recurso_nombre} a la reserva.`);
      });
      recursosQuitados.forEach((recurso) => {
        cambios.push(`Se quitó el recurso ${recurso.recurso_nombre} de la reserva.`);
      });
    }
  }

  return cambios;
};

const describirCambiosAsignacion = (registro) => {
  const anterioresDato = parsearDatos(registro.datos_anteriores);
  const nuevosDato = parsearDatos(registro.datos_nuevos);
  const anteriores = Array.isArray(anterioresDato) ? anterioresDato : [];
  const nuevos = Array.isArray(nuevosDato) ? nuevosDato : [];
  const anterioresPorId = new Map(anteriores.map((item) => [Number(item.recurso_id), item]));
  const nuevosPorId = new Map(nuevos.map((item) => [Number(item.recurso_id), item]));
  const mensajes = [];

  nuevos.forEach((item) => {
    const anterior = anterioresPorId.get(Number(item.recurso_id));
    const nombre = item.recurso_nombre || anterior?.recurso_nombre || 'el recurso';
    if (!anterior) {
      mensajes.push(`Se agregó el recurso ${nombre} a ${registro.espacio_nombre || 'un espacio'}.`);
    } else if (Number(anterior.cantidad_maxima) !== Number(item.cantidad_maxima)) {
      mensajes.push(`Se cambió el máximo permitido para ${nombre} de ${anterior.cantidad_maxima} a ${item.cantidad_maxima}.`);
    }
  });

  anteriores.forEach((item) => {
    if (!nuevosPorId.has(Number(item.recurso_id))) {
      mensajes.push(`Se quitó el recurso ${item.recurso_nombre || 'seleccionado'} de ${registro.espacio_nombre || 'un espacio'}.`);
    }
  });

  return mensajes;
};

const describirRegistro = (registro) => {
  const actor = registro.actor_nombre || registro.username || 'Un usuario';
  const reserva = registro.numero_reserva || (registro.reserva_id ? `reserva #${registro.reserva_id}` : 'la reserva');
  const espacio = registro.espacio_nombre ? ` en ${registro.espacio_nombre}` : '';
  const recurso = registro.recurso_nombre || 'el recurso';
  const entidad = registro.entidad_nombre || registro.entidad_id || '';

  switch (registro.accion) {
    case 'crear':
      if (registro.entidad_tipo === 'reserva') return `${actor} creó la reserva ${reserva}${espacio}.`;
      if (registro.entidad_tipo === 'espacio') return `${actor} creó el espacio ${entidad ? `“${entidad}”` : ''}.`;
      if (registro.entidad_tipo === 'recurso') return `${actor} agregó el recurso ${entidad ? `“${entidad}”` : ''}.`;
      break;
    case 'auto_confirmacion_creacion':
      return `${actor} creó y confirmó automáticamente la reserva ${reserva}${espacio}.`;
    case 'aprobar':
      return `${actor} aprobó la reserva ${reserva}${espacio}.`;
    case 'rechazar':
      return `${actor} rechazó la reserva ${reserva}${espacio}.`;
    case 'cancelar':
      return `${actor} canceló la reserva ${reserva}${espacio}.`;
    case 'eliminar_logico':
      return `${actor} dio de baja la reserva ${reserva}${espacio}.`;
    case 'editar': {
      if (registro.entidad_tipo === 'reserva') {
        const cambios = obtenerCambiosHumanos(registro);
        return cambios.length ? `${actor} editó la reserva ${reserva}: ${cambios.join(' ')}` : `${actor} actualizó la reserva ${reserva}${espacio}.`;
      }
      if (registro.entidad_tipo === 'espacio') return `${actor} actualizó los datos del espacio ${entidad ? `“${entidad}”` : ''}.`;
      if (registro.entidad_tipo === 'recurso') return `${actor} actualizó los datos del recurso ${entidad ? `“${entidad}”` : ''}.`;
      break;
    }
    case 'eliminar':
      if (registro.entidad_tipo === 'espacio') return `${actor} eliminó el espacio ${entidad ? `“${entidad}”` : ''}.`;
      if (registro.entidad_tipo === 'recurso') return `${actor} eliminó el recurso ${entidad ? `“${entidad}”` : ''}.`;
      break;
    case 'reactivar':
      return `${actor} reactivó el recurso ${entidad ? `“${entidad}”` : ''}.`;
    case 'asignar_recursos': {
      const cambios = describirCambiosAsignacion(registro);
      return cambios.length
        ? `${actor} modificó recursos: ${cambios.join(' ')}`
        : `${actor} revisó la asignación de recursos de ${registro.espacio_nombre || 'un espacio'}.`;
    }
    case 'quitar_recurso_espacio': {
      const anterior = parsearDatos(registro.datos_anteriores);
      return `${actor} quitó el recurso ${anterior?.recurso_nombre || recurso} de ${registro.espacio_nombre || 'un espacio'}.`;
    }
    case 'agregar_recurso_reserva':
      return `${actor} agregó el recurso ${recurso} a ${reserva}.`;
    case 'editar_recurso_reserva': {
      const anteriores = parsearDatos(registro.datos_anteriores) || {};
      const nuevos = parsearDatos(registro.datos_nuevos) || {};
      return `${actor} cambió la cantidad solicitada de ${recurso} de ${anteriores.cantidad_solicitada ?? 'sin dato'} a ${nuevos.cantidad_solicitada ?? 'sin dato'} en ${reserva}.`;
    }
    case 'confirmar_recurso_reserva': {
      const anteriores = parsearDatos(registro.datos_anteriores) || {};
      const nuevos = parsearDatos(registro.datos_nuevos);
      return `${actor} confirmó una cantidad de ${nuevos?.cantidad_confirmada ?? 'solicitada'} para ${recurso} en ${reserva}${anteriores.cantidad_confirmada != null ? ` (antes: ${anteriores.cantidad_confirmada})` : ''}.`;
    }
    case 'quitar_recurso_reserva':
      return `${actor} quitó el recurso ${recurso} de ${reserva}.`;
    default:
      return `${actor} realizó una acción sobre ${etiquetasEntidad[registro.entidad_tipo] || 'un elemento'}.`;
  }

  return `${actor} actualizó ${etiquetasEntidad[registro.entidad_tipo] || 'un elemento'}${entidad ? ` “${entidad}”` : ''}.`;
};

const AuditoriaReservas = ({ onVolver }) => {
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
      const response = await reservasAPI.obtenerAuditoria(params);
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
    <section className="auditoria-page" aria-label="Auditoría del módulo de reservas">
      <div className="auditoria-heading">
        <div>
          <p className="auditoria-eyebrow">Gestión de Reservas</p>
          <h3>Auditoría del módulo</h3>
          <p>Registro de acciones sobre reservas, espacios, recursos y asignaciones.</p>
        </div>
        <button type="button" className="auditoria-back" onClick={onVolver}>Volver a Reservas</button>
      </div>

      <div className="auditoria-filtros">
        <label>
          Acción
          <select value={filtros.accion} onChange={(event) => actualizarFiltro('accion', event.target.value)}>
            <option value="">Todas</option>
            <option value="crear">Crear</option>
            <option value="auto_confirmacion_creacion">Confirmación automática</option>
            <option value="editar">Editar</option>
            <option value="aprobar">Aprobar</option>
            <option value="rechazar">Rechazar</option>
            <option value="cancelar">Cancelar</option>
            <option value="eliminar_logico">Eliminar</option>
            <option value="reactivar">Reactivar</option>
            <option value="asignar_recursos">Asignar recursos</option>
            <option value="quitar_recurso_espacio">Quitar asignación</option>
            <option value="agregar_recurso_reserva">Agregar recurso a reserva</option>
            <option value="editar_recurso_reserva">Editar recurso de reserva</option>
            <option value="confirmar_recurso_reserva">Confirmar recurso de reserva</option>
            <option value="quitar_recurso_reserva">Quitar recurso de reserva</option>
          </select>
        </label>
        <label>
          Tipo de elemento
          <select value={filtros.entidad_tipo} onChange={(event) => actualizarFiltro('entidad_tipo', event.target.value)}>
            <option value="">Todos</option>
            <option value="reserva">Reserva</option>
            <option value="espacio">Espacio</option>
            <option value="recurso">Recurso</option>
            <option value="asignacion_espacio">Asignación de espacio</option>
            <option value="recurso_reserva">Recurso de reserva</option>
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
                <th>Elemento</th>
                <th>Reserva</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((registro) => (
                <tr key={registro.id}>
                  <td>{new Date(registro.fecha_accion).toLocaleString('es-AR')}</td>
                  <td>
                    <strong>{registro.actor_nombre || registro.username || `Usuario ${registro.actor_id || 'eliminado'}`}</strong>
                    <small>{registro.actor_role}{registro.secretaria_nombre ? ` · ${registro.secretaria_nombre}` : ''}</small>
                  </td>
                  <td>{etiquetasAccion[registro.accion] || 'Actualización'}</td>
                  <td>{etiquetasEntidad[registro.entidad_tipo] || 'Elemento'}{registro.entidad_nombre ? ` · ${registro.entidad_nombre}` : registro.entidad_id ? ` #${registro.entidad_id}` : ''}</td>
                  <td>{registro.numero_reserva || (registro.reserva_id ? `#${registro.reserva_id}` : '—')}</td>
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

export default AuditoriaReservas;
