const pool = require("../config/database");
const {
  obtenerReglasAprobacion,
  areasVisibles,
  puedeAprobarArea,
} = require("../utils/aprobaciones");
const registrarAuditoriaEventos = require("../utils/auditoriaEventos");

/**
 * FUNCIÓN AUXILIAR: detectarCambios
 * Compara un evento antiguo con uno nuevo y detecta qué campos han cambiado
 * @param {Object} eventoViejo - El evento antes de los cambios
 * @param {Object} eventoNuevo - El evento con los nuevos valores
 * @returns {Array} Lista de strings describiendo los cambios detectados
 */
const detectarCambios = async (eventoViejo, eventoNuevo) => {
  const cambios = [];
  const valoresViejos = {};
  const valoresNuevos = {};

  const campos = [
    "nombre",
    "descripcion",
    "links",
    "observaciones",
    "correo_contacto",
    "telefono",
    "lugar",
    "publico_destinatario",
    "fecha_evento",
    "fecha_fin",
    "hora_inicio",
    "hora_fin",
    "categoria_id",
  ];

  // Primero: Recorrer todos los campos para guardar valores completos
  for (const campo of campos) {
    const valorViejo = eventoViejo[campo];
    const valorNuevo = eventoNuevo[campo];

    // Solo registrar si hay cambio real
    if (valorNuevo !== valorViejo) {
      valoresViejos[campo] = valorViejo;
      valoresNuevos[campo] = valorNuevo;
    }
  }

  // Segundo: Mantener tu lógica actual de cambios detallados
  // Comparar nombre
  if (eventoNuevo.nombre !== eventoViejo.nombre) {
    cambios.push(`Nombre: "${eventoViejo.nombre}" → "${eventoNuevo.nombre}"`);
  }

  // Comparar fechas
  const crearFechaLocal = (fechaInput) => {
    if (!fechaInput) return null;
    if (fechaInput instanceof Date) return fechaInput;

    if (typeof fechaInput === "string") {
      if (fechaInput.includes("T") || fechaInput.includes("Z")) {
        return new Date(fechaInput);
      } else {
        const [año, mes, dia] = fechaInput.split("-").map(Number);
        return new Date(año, mes - 1, dia);
      }
    }

    return new Date(fechaInput);
  };

  const fechaVieja = crearFechaLocal(eventoViejo.fecha_evento);
  const fechaNueva = crearFechaLocal(eventoNuevo.fecha_evento);

  if (
    fechaVieja &&
    fechaNueva &&
    fechaVieja.toLocaleDateString("es-ES") !==
      fechaNueva.toLocaleDateString("es-ES")
  ) {
    cambios.push(
      `Fecha del evento: ${fechaVieja.toLocaleDateString("es-ES")} → ${fechaNueva.toLocaleDateString("es-ES")}`,
    );
  }

  // Comparar categoría - CONVERTIR A NÚMERO PARA EVITAR FALSOS POSITIVOS
  const catViejaId = Number(eventoViejo.categoria_id);
  const catNuevaId = Number(eventoNuevo.categoria_id);

  if (catNuevaId !== catViejaId) {
    // Solo proceder si hay un cambio real
    let nombreCatVieja = "Sin categoría";
    let nombreCatNueva = "Sin categoría";

    if (catViejaId) {
      try {
        const [catViejaResult] = await pool.query(
          "SELECT nombre FROM categorias WHERE id = ?",
          [catViejaId],
        );
        nombreCatVieja = catViejaResult?.[0]?.nombre || "Sin categoría";
      } catch (error) {
        console.warn("Error obteniendo categoría vieja:", error);
      }
    }

    if (catNuevaId) {
      try {
        const [catNuevaResult] = await pool.query(
          "SELECT nombre FROM categorias WHERE id = ?",
          [catNuevaId],
        );
        nombreCatNueva = catNuevaResult?.[0]?.nombre || "Sin categoría";
      } catch (error) {
        console.warn("Error obteniendo categoría nueva:", error);
      }
    }

    cambios.push(`Categoría: "${nombreCatVieja}" → "${nombreCatNueva}"`);
  }

  // Comparar descripción
  const descVieja = eventoViejo.descripcion || "";
  const descNueva = eventoNuevo.descripcion || "";

  if (descNueva !== descVieja) {
    if (!descVieja && descNueva) {
      cambios.push("Descripción: Se agregó una descripción");
    } else if (descVieja && !descNueva) {
      cambios.push("Descripción: Se eliminó la descripción");
    } else {
      cambios.push("Descripción: Se modificó la descripción");
    }
  }

  // Comparar correo de contacto
  if (eventoNuevo.correo_contacto !== eventoViejo.correo_contacto) {
    if (!eventoViejo.correo_contacto && eventoNuevo.correo_contacto) {
      cambios.push("Correo de contacto: Se agregó un correo");
    } else if (eventoViejo.correo_contacto && !eventoNuevo.correo_contacto) {
      cambios.push("Correo de contacto: Se eliminó el correo");
    } else {
      cambios.push(
        `Correo de contacto: "${eventoViejo.correo_contacto}" → "${eventoNuevo.correo_contacto}"`,
      );
    }
  }

  // Comparar teléfono
  if (eventoNuevo.telefono !== eventoViejo.telefono) {
    if (!eventoViejo.telefono && eventoNuevo.telefono) {
      cambios.push("Teléfono: Se agregó un teléfono");
    } else if (eventoViejo.telefono && !eventoNuevo.telefono) {
      cambios.push("Teléfono: Se eliminó el teléfono");
    } else {
      cambios.push(
        `Teléfono: "${eventoViejo.telefono}" → "${eventoNuevo.telefono}"`,
      );
    }
  }

  // Comparar hora inicio
  if (eventoNuevo.hora_inicio !== eventoViejo.hora_inicio) {
    if (!eventoViejo.hora_inicio && eventoNuevo.hora_inicio) {
      cambios.push("Hora de inicio: Se agregó una hora");
    } else if (eventoViejo.hora_inicio && !eventoNuevo.hora_inicio) {
      cambios.push("Hora de inicio: Se eliminó la hora");
    } else {
      cambios.push(
        `Hora de inicio: ${eventoViejo.hora_inicio} → ${eventoNuevo.hora_inicio}`,
      );
    }
  }

  // Comparar hora fin
  if (eventoNuevo.hora_fin !== eventoViejo.hora_fin) {
    if (!eventoViejo.hora_fin && eventoNuevo.hora_fin) {
      cambios.push("Hora de finalización: Se agregó una hora");
    } else if (eventoViejo.hora_fin && !eventoNuevo.hora_fin) {
      cambios.push("Hora de finalización: Se eliminó la hora");
    } else {
      cambios.push(
        `Hora de finalización: ${eventoViejo.hora_fin} → ${eventoNuevo.hora_fin}`,
      );
    }
  }

  // Comparar lugar
  if (eventoNuevo.lugar !== eventoViejo.lugar) {
    if (!eventoViejo.lugar && eventoNuevo.lugar) {
      cambios.push("Lugar: Se agregó un lugar");
    } else if (eventoViejo.lugar && !eventoNuevo.lugar) {
      cambios.push("Lugar: Se eliminó el lugar");
    } else {
      cambios.push(`Lugar: "${eventoViejo.lugar}" → "${eventoNuevo.lugar}"`);
    }
  }

  // Comparar público destinatario
  if (eventoNuevo.publico_destinatario !== eventoViejo.publico_destinatario) {
    if (!eventoViejo.publico_destinatario && eventoNuevo.publico_destinatario) {
      cambios.push("Público destinatario: Se agregó un público destinatario");
    } else if (
      eventoViejo.publico_destinatario &&
      !eventoNuevo.publico_destinatario
    ) {
      cambios.push("Público destinatario: Se eliminó el público destinatario");
    } else {
      cambios.push(
        `Público destinatario: "${eventoViejo.publico_destinatario}" → "${eventoNuevo.publico_destinatario}"`,
      );
    }
  }

  // Comparar links
  if (eventoNuevo.links !== eventoViejo.links) {
    if (!eventoViejo.links && eventoNuevo.links) {
      cambios.push("Links relevantes: Se agregaron links");
    } else if (eventoViejo.links && !eventoNuevo.links) {
      cambios.push("Links relevantes: Se eliminaron los links");
    } else {
      cambios.push("Links relevantes: Se modificaron los links");
    }
  }

  // Comparar observaciones
  if (eventoNuevo.observaciones !== eventoViejo.observaciones) {
    if (!eventoViejo.observaciones && eventoNuevo.observaciones) {
      cambios.push("Observaciones: Se agregaron observaciones");
    } else if (eventoViejo.observaciones && !eventoNuevo.observaciones) {
      cambios.push("Observaciones: Se eliminaron las observaciones");
    } else {
      cambios.push("Observaciones: Se modificaron las observaciones");
    }
  }

  // Comparar fecha fin
  if (eventoNuevo.fecha_fin !== eventoViejo.fecha_fin) {
    const finVieja = crearFechaLocal(eventoViejo.fecha_fin);
    const finNueva = crearFechaLocal(eventoNuevo.fecha_fin);

    if (
      finVieja &&
      finNueva &&
      finVieja.toLocaleDateString("es-ES") !==
        finNueva.toLocaleDateString("es-ES")
    ) {
      cambios.push(
        `Fecha fin: ${finVieja.toLocaleDateString("es-ES")} → ${finNueva.toLocaleDateString("es-ES")}`,
      );
    } else if (!finVieja && finNueva) {
      cambios.push("Fecha fin: Se agregó fecha de finalización");
    } else if (finVieja && !finNueva) {
      cambios.push("Fecha fin: Se eliminó fecha de finalización");
    }
  }

  // Tercero: Retornar ambos tipos de información
  return {
    cambiosDetallados: cambios,
    valoresViejos: Object.keys(valoresViejos).length > 0 ? valoresViejos : null,
    valoresNuevos: Object.keys(valoresNuevos).length > 0 ? valoresNuevos : null,
  };
};

/**
 * FUNCIÓN AUXILIAR: registrarEnHistorial
 * Guarda un registro en la tabla de historial_eventos para auditoría
 * @param {Number} evento_id - ID del evento modificado
 * @param {Number} usuario_id - ID del usuario que realizó la acción
 * @param {String} accion - Tipo de acción ('creado', 'actualizado', 'eliminado')
 * @param {Array} cambios - Lista de cambios realizados
 */
const registrarEnHistorial = async (
  evento_id,
  usuario_id,
  accion,
  cambiosDetallados,
  valoresViejos = null,
  valoresNuevos = null,
) => {
  if (
    (Array.isArray(cambiosDetallados) && cambiosDetallados.length > 0) ||
    accion === "creado" ||
    accion === "eliminado"
  ) {
    await pool.query(
      "INSERT INTO historial_eventos (evento_id, usuario_id, accion, cambios, valores_viejos, valores_nuevos) VALUES (?, ?, ?, ?, ?, ?)",
      [
        evento_id,
        usuario_id,
        accion,
        JSON.stringify(cambiosDetallados),
        valoresViejos ? JSON.stringify(valoresViejos) : null,
        valoresNuevos ? JSON.stringify(valoresNuevos) : null,
      ],
    );
  }
};

const obtenerUsuarioActivo = async (usuarioId) => {
  const [usuarios] = await pool.query(
    `SELECT u.id, u.role, u.secretaria_id, s.nombre AS secretaria_nombre
     FROM usuarios u
     LEFT JOIN secretarias s ON s.id = u.secretaria_id
     WHERE u.id = ? AND u.activo = 1`,
    [usuarioId],
  );
  return usuarios[0] || null;
};

const validarAntelacionSolicitudEvento = async (categoriaId, fechaEvento) => {
  if (!categoriaId) {
    return { error: 'La categoría del evento es obligatoria.' };
  }

  const [categorias] = await pool.query(
    'SELECT nombre, dias_antelacion FROM categorias WHERE id = ? AND activa = TRUE',
    [categoriaId],
  );
  if (categorias.length === 0) {
    return { error: 'La categoría seleccionada no existe o no está activa.' };
  }

  const diasAntelacion = Number(categorias[0].dias_antelacion);
  if (!Number.isFinite(diasAntelacion) || diasAntelacion < 0) {
    return { error: 'La categoría no tiene una regla de antelación válida.' };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  hoy.setDate(hoy.getDate() + Math.max(0, diasAntelacion - 1));
  const fechaMinima = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const fechaSolicitada = String(fechaEvento).slice(0, 10);

  if (fechaSolicitada < fechaMinima) {
    return {
      error: `La categoría ${categorias[0].nombre} requiere ${diasAntelacion} días de antelación. Fecha mínima permitida: ${fechaMinima}.`,
      fecha_minima: fechaMinima,
    };
  }

  return null;
};

const notificarEventoAprobado = async (eventoId) => {
  try {
    const [eventos] = await pool.query(
      `SELECT e.*, c.nombre AS categoria_nombre, c.color AS categoria_color,
              GROUP_CONCAT(ce.email) AS categoria_emails,
              u.nombre_completo AS usuario_nombre
       FROM eventos e
       LEFT JOIN categorias c ON e.categoria_id = c.id
       LEFT JOIN categorias_emails ce ON c.id = ce.categoria_id
       LEFT JOIN usuarios u ON e.usuario_id = u.id
       WHERE e.id = ? AND e.estado_aprobacion = 'aprobada'
       GROUP BY e.id`,
      [eventoId],
    );

    if (eventos.length === 0) return false;

    const evento = eventos[0];
    const correosDestino = [];
    const correoSecretaria = process.env.CORREO_SECRETARIA_PRINCIPAL;
    const correoAdicional = process.env.CORREO_ADICIONAL?.trim();

    if (correoSecretaria) correosDestino.push(correoSecretaria);
    if (correoAdicional && !correosDestino.includes(correoAdicional)) {
      correosDestino.push(correoAdicional);
    }
    if (evento.categoria_emails) {
      const correosCategoria = evento.categoria_emails
        .split(',')
        .map((correo) => correo.trim())
        .filter((correo) => correo && !correosDestino.includes(correo));
      correosDestino.push(...correosCategoria);
    }

    if (correosDestino.length === 0) return false;

    const [archivos] = await pool.query(
      `SELECT nombre_archivo, archivo_path
       FROM eventos_archivos WHERE evento_id = ? ORDER BY fecha_carga ASC`,
      [eventoId],
    );
    const { enviarPDFPorCorreo } = require('../utils/emailService');
    await enviarPDFPorCorreo(evento, correosDestino, 'creado', archivos);
    return true;
  } catch (error) {
    console.error('Error enviando correo del evento aprobado:', error.message);
    return false;
  }
};

const resolverEventoPendiente = async (req, res, estadoFinal, motivoRechazo = null) => {
  const usuario = await obtenerUsuarioActivo(req.user.id);
  if (!usuario) {
    return res.status(401).json({ success: false, error: 'Usuario no válido' });
  }
  if (!['admin', 'secretaria'].includes(usuario.role)) {
    return res.status(403).json({ success: false, error: 'No tienes permisos para resolver solicitudes' });
  }
  if (usuario.role === 'secretaria' && !usuario.secretaria_id) {
    return res.status(403).json({ success: false, error: 'Tu usuario no tiene una secretaría asignada' });
  }

  const eventoId = Number(req.params.id);
  if (!Number.isInteger(eventoId) || eventoId < 1) {
    return res.status(400).json({ success: false, error: 'Identificador de evento inválido' });
  }

  let secretariaResponsableAuditoria = null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [eventos] = await connection.execute(
      'SELECT * FROM eventos WHERE id = ? FOR UPDATE',
      [eventoId],
    );
    if (eventos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
    }

    const evento = eventos[0];
    secretariaResponsableAuditoria = evento.secretaria_id_responsable ?? null;
    if (evento.estado_aprobacion !== 'pendiente') {
      await connection.rollback();
      return res.status(409).json({ success: false, error: 'La solicitud ya fue resuelta' });
    }
    if (usuario.role === 'secretaria') {
      const reglas = await obtenerReglasAprobacion();
      if (!puedeAprobarArea(usuario.secretaria_id, evento.secretaria_id_responsable, reglas)) {
        await connection.rollback();
        return res.status(403).json({ success: false, error: 'La solicitud pertenece a un área que no podés aprobar' });
      }
    }

    // Si el evento proviene de una reserva, no se puede aprobar hasta que la
    // reserva esté confirmada (la reserva es la fuente de verdad).
    if (estadoFinal === 'aprobada' && evento.reserva_id) {
      const [reservasVinculadas] = await connection.execute(
        'SELECT estado FROM reservas WHERE id = ?',
        [evento.reserva_id],
      );
      if (reservasVinculadas.length === 0 || reservasVinculadas[0].estado !== 'confirmada') {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: 'Primero debés aprobar la reserva asociada a este evento',
        });
      }
    }

    const [resultado] = await connection.execute(
      `UPDATE eventos
       SET estado_aprobacion = ?, resuelto_por = ?, resuelto_at = CURRENT_TIMESTAMP,
           motivo_rechazo = ?, ultima_modificacion = ?
       WHERE id = ? AND estado_aprobacion = 'pendiente'`,
      [estadoFinal, usuario.id, motivoRechazo, evento.ultima_modificacion, eventoId],
    );
    if (resultado.affectedRows !== 1) {
      await connection.rollback();
      return res.status(409).json({ success: false, error: 'La solicitud ya fue resuelta' });
    }

    const cambios = estadoFinal === 'aprobada'
      ? ['Solicitud aprobada y evento publicado']
      : ['Solicitud rechazada', `Motivo: ${motivoRechazo}`];
    await connection.execute(
      `INSERT INTO historial_eventos
       (evento_id, usuario_id, accion, cambios, valores_viejos, valores_nuevos)
       VALUES (?, ?, 'actualizado', ?, ?, ?)`,
      [
        eventoId,
        usuario.id,
        JSON.stringify(cambios),
        JSON.stringify({ estado_aprobacion: 'pendiente' }),
        JSON.stringify({ estado_aprobacion: estadoFinal, motivo_rechazo: motivoRechazo }),
      ],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Error resolviendo solicitud de evento:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  } finally {
    connection.release();
  }

  // Auditoría del módulo de eventos (best-effort, tras el commit)
  await registrarAuditoriaEventos({
    req,
    accion: estadoFinal === 'aprobada' ? 'aprobar' : 'rechazar',
    entidadTipo: 'evento',
    entidadId: eventoId,
    eventoId,
    secretariaId: secretariaResponsableAuditoria,
    datosAnteriores: { estado_aprobacion: 'pendiente' },
    datosNuevos: { estado_aprobacion: estadoFinal, motivo_rechazo: motivoRechazo },
  });

  const correoEnviado = estadoFinal === 'aprobada'
    ? await notificarEventoAprobado(eventoId)
    : false;
  const [eventosResueltos] = await pool.query(
    `SELECT e.*, u.nombre_completo AS usuario_nombre,
            c.nombre AS categoria_nombre, c.color AS categoria_color
     FROM eventos e
     LEFT JOIN usuarios u ON u.id = e.usuario_id
     LEFT JOIN categorias c ON c.id = e.categoria_id
     WHERE e.id = ?`,
    [eventoId],
  );

  return res.json({
    success: true,
    evento: eventosResueltos[0],
    correo_enviado: correoEnviado,
    message: estadoFinal === 'aprobada'
      ? 'Solicitud aprobada y evento publicado'
      : 'Solicitud rechazada',
  });
};

const eventosController = {
  listarSolicitudesPendientes: async (req, res) => {
    try {
      const usuario = await obtenerUsuarioActivo(req.user.id);
      if (!usuario) {
        return res.status(401).json({ success: false, error: 'Usuario no válido' });
      }
      if (!['admin', 'secretaria'].includes(usuario.role)) {
        return res.status(403).json({ success: false, error: 'No tienes permisos para ver solicitudes' });
      }
      if (usuario.role === 'secretaria' && !usuario.secretaria_id) {
        return res.status(403).json({ success: false, error: 'Tu usuario no tiene una secretaría asignada' });
      }

      const estadoSolicitado = req.query.estado || 'pendiente';
      const estadosPermitidos = ['pendiente', 'aprobada', 'rechazada', 'todas'];
      if (!estadosPermitidos.includes(estadoSolicitado)) {
        return res.status(400).json({ success: false, error: 'Filtro de estado inválido' });
      }

      let consulta = `
        SELECT e.*, u.nombre_completo AS solicitante_nombre,
               c.nombre AS categoria_nombre,
               s.nombre AS secretaria_responsable_nombre,
               res.nombre_completo AS resuelto_por_nombre,
               (SELECT COUNT(*) FROM eventos_archivos ea WHERE ea.evento_id = e.id) AS total_archivos,
               (SELECT r.estado FROM reservas r WHERE r.id = e.reserva_id) AS reserva_estado
        FROM eventos e
        LEFT JOIN usuarios u ON u.id = e.usuario_id
        LEFT JOIN categorias c ON c.id = e.categoria_id
        LEFT JOIN secretarias s ON s.id = e.secretaria_id_responsable
        LEFT JOIN usuarios res ON res.id = e.resuelto_por
      `;
      const parametros = [];
      if (estadoSolicitado === 'todas') {
        consulta += " WHERE e.estado_aprobacion IN ('pendiente', 'aprobada', 'rechazada')";
      } else {
        consulta += ' WHERE e.estado_aprobacion = ?';
        parametros.push(estadoSolicitado);
      }
      if (usuario.role === 'secretaria') {
        const reglas = await obtenerReglasAprobacion();
        const visibles = areasVisibles(usuario.secretaria_id, reglas);
        if (visibles !== null) {
          const ids = visibles.length > 0 ? visibles : [-1];
          consulta += ` AND e.secretaria_id_responsable IN (${ids.map(() => '?').join(',')})`;
          parametros.push(...ids);
        }
      } else if (req.query.secretaria_id) {
        const secretariaId = Number(req.query.secretaria_id);
        if (!Number.isInteger(secretariaId) || secretariaId < 1) {
          return res.status(400).json({ success: false, error: 'Secretaría inválida' });
        }
        consulta += ' AND e.secretaria_id_responsable = ?';
        parametros.push(secretariaId);
      }
      consulta += ' ORDER BY e.fecha_carga ASC';

      const [solicitudes] = await pool.query(consulta, parametros);
      return res.json({ success: true, solicitudes });
    } catch (error) {
      console.error('Error listando solicitudes de eventos:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  },

  obtenerMisSolicitudes: async (req, res) => {
    try {
      const usuario = await obtenerUsuarioActivo(req.user.id);
      if (!usuario) {
        return res.status(401).json({ success: false, error: 'Usuario no válido' });
      }

      const [solicitudes] = await pool.query(
        `SELECT e.*, c.nombre AS categoria_nombre,
                s.nombre AS secretaria_responsable_nombre,
                res.nombre_completo AS resuelto_por_nombre,
                (SELECT COUNT(*) FROM eventos_archivos ea WHERE ea.evento_id = e.id) AS total_archivos
         FROM eventos e
         LEFT JOIN categorias c ON c.id = e.categoria_id
         LEFT JOIN secretarias s ON s.id = e.secretaria_id_responsable
         LEFT JOIN usuarios res ON res.id = e.resuelto_por
         WHERE e.usuario_id = ?
           AND e.estado_aprobacion IN ('pendiente', 'aprobada', 'rechazada')
         ORDER BY e.fecha_carga DESC`,
        [usuario.id],
      );

      return res.json({ success: true, solicitudes });
    } catch (error) {
      console.error('Error obteniendo solicitudes propias:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  },

  aprobarEventoPendiente: async (req, res) =>
    resolverEventoPendiente(req, res, 'aprobada'),

  rechazarEventoPendiente: async (req, res) => {
    const motivo = req.body?.motivo_rechazo?.trim();
    if (!motivo) {
      return res.status(400).json({ success: false, error: 'El motivo de rechazo es obligatorio' });
    }
    return resolverEventoPendiente(req, res, 'rechazada', motivo);
  },

  /**
   * CONTROLADOR: obtenerEventos
   * Obtiene todos los eventos de la base de datos con información del usuario creador
   * Ruta: GET /api/eventos
   */
  obtenerEventos: async (req, res) => {
    try {
      // Consulta que une la tabla eventos con usuarios para obtener el nombre del creador
      // Cuenta archivos nuevos (eventos_archivos) + archivos legacy (archivo_adjunto)
      const [eventos] = await pool.query(`
        SELECT e.*, u.nombre_completo as usuario_nombre, 
               c.nombre as categoria_nombre, c.color as categoria_color,
               (COUNT(ea.id) + IF(e.archivo_adjunto IS NOT NULL AND e.archivo_adjunto != '', 1, 0)) as total_archivos
        FROM eventos e 
        LEFT JOIN usuarios u ON e.usuario_id = u.id 
        LEFT JOIN categorias c ON e.categoria_id = c.id
        LEFT JOIN eventos_archivos ea ON e.id = ea.evento_id
        WHERE e.estado_aprobacion IN ('no_requerida', 'aprobada')
        GROUP BY e.id
        ORDER BY e.fecha_evento DESC
      `);

      res.json({
        success: true,
        eventos,
      });
    } catch (error) {
      console.error("Error obteniendo eventos:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  /**
   * CONTROLADOR: obtenerEvento
   * Obtiene un evento específico por su ID
   * Ruta: GET /api/eventos/:id
   */
  obtenerEvento: async (req, res) => {
    try {
      const { id } = req.params;

      const [eventos] = await pool.query(
        `
        SELECT e.*, u.nombre_completo as usuario_nombre,
               c.nombre as categoria_nombre, c.color as categoria_color
        FROM eventos e 
        LEFT JOIN usuarios u ON e.usuario_id = u.id 
        LEFT JOIN categorias c ON e.categoria_id = c.id
        WHERE e.id = ?
          AND e.estado_aprobacion IN ('no_requerida', 'aprobada')
      `,
        [id],
      );

      // Verificar si el evento existe
      if (eventos.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Evento no encontrado",
        });
      }

      res.json({
        success: true,
        evento: eventos[0],
      });
    } catch (error) {
      console.error("Error obteniendo evento:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  /**
   * CONTROLADOR: crearEvento
   * Crea un nuevo evento en la base de datos y guarda múltiples archivos adjuntos
   * Ruta: POST /api/eventos (protegida con authMiddleware)
   */
  crearEvento: async (req, res) => {
    try {
      console.log("📥 Body recibido:", req.body);
      console.log("📁 Archivos recibidos:", req.files?.length || 0);

      // Extraer datos del body y del usuario autenticado
      const {
        nombre,
        fecha_evento,
        fecha_fin,
        descripcion,
        categoria_id,
        correo_contacto,
        telefono,
        hora_inicio,
        hora_fin,
        lugar,
        publico_destinatario,
        links,
        observaciones,
      } = req.body;

      const [usuarios] = await pool.query(
        `SELECT u.role, u.secretaria_id, s.nombre AS secretaria_nombre
         FROM usuarios u
         LEFT JOIN secretarias s ON s.id = u.secretaria_id
         WHERE u.id = ? AND u.activo = 1`,
        [req.user.id],
      );
      if (usuarios.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no válido',
        });
      }

      const usuarioActual = usuarios[0];
      const usuario_id = req.user.id;
      const secretaria = usuarioActual.secretaria_nombre || req.user.secretaria || 'Administración';
      const estadoAprobacion = usuarioActual.role === 'usuario' ? 'pendiente' : 'no_requerida';

      if (estadoAprobacion === 'pendiente' && !usuarioActual.secretaria_id) {
        return res.status(400).json({
          success: false,
          error: 'Tu usuario debe tener una secretaría asignada para solicitar la publicación de eventos',
        });
      }
      const fechaFinValue =
        fecha_fin && fecha_fin.toString().trim() ? fecha_fin : null;
      const horaInicioValue =
        hora_inicio && hora_inicio.toString().trim() ? hora_inicio : null;
      const horaFinValue =
        hora_fin && hora_fin.toString().trim() ? hora_fin : null;

      // Validaciones básicas de campos requeridos
      if (!nombre || !fecha_evento) {
        return res.status(400).json({
          success: false,
          error: "Nombre y fecha del evento son requeridos",
        });
      }

      if (estadoAprobacion === 'pendiente') {
        const errorAntelacion = await validarAntelacionSolicitudEvento(categoria_id, fecha_evento);
        if (errorAntelacion) {
          return res.status(400).json({
            success: false,
            ...errorAntelacion,
          });
        }
      }

      // Validar límite total de 250MB
      let totalSize = 0;
      if (req.files && req.files.length > 0) {
        totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
        const maxTotalSize = 250 * 1024 * 1024; // 250MB
        if (totalSize > maxTotalSize) {
          return res.status(400).json({
            success: false,
            error: `El tamaño total de archivos (${(totalSize / 1024 / 1024).toFixed(2)}MB) excede el límite de 250MB`,
          });
        }
      }

      const cambiosIniciales = [
        estadoAprobacion === 'pendiente'
          ? 'Solicitud de evento creada, pendiente de aprobación'
          : 'Evento creado inicialmente',
      ];

      // Registrar archivos si se subieron
      if (req.files && req.files.length > 0) {
        cambiosIniciales.push(`Con ${req.files.length} archivo(s) adjunto(s)`);
      }

      // Registrar si tiene descripción
      if (descripcion) {
        cambiosIniciales.push("Con descripción");
      }

      // Registrar nuevos campos si están presentes
      if (correo_contacto) cambiosIniciales.push("Con correo de contacto");
      if (telefono) cambiosIniciales.push("Con teléfono");
      if (hora_inicio) cambiosIniciales.push("Con hora de inicio");
      if (hora_fin) cambiosIniciales.push("Con hora de finalización");
      if (lugar) cambiosIniciales.push("Con lugar especificado");
      if (publico_destinatario)
        cambiosIniciales.push("Con público destinatario");
      if (links) cambiosIniciales.push("Con links relevantes");
      if (observaciones) cambiosIniciales.push("Con observaciones adicionales");

      // Evitar duplicados idénticos por doble envío:
      // mismo usuario + TODOS los campos iguales + creado hace menos de 2 minutos.
      // Dos eventos "parecidos" (que difieren en algún campo) se permiten.
      const [duplicados] = await pool.query(
        `SELECT id FROM eventos
         WHERE usuario_id = ?
           AND nombre = ?
           AND fecha_evento = ?
           AND IFNULL(fecha_fin, '') = IFNULL(?, '')
           AND IFNULL(descripcion, '') = IFNULL(?, '')
           AND IFNULL(categoria_id, 0) = IFNULL(?, 0)
           AND IFNULL(correo_contacto, '') = IFNULL(?, '')
           AND IFNULL(telefono, '') = IFNULL(?, '')
           AND IFNULL(hora_inicio, '') = IFNULL(?, '')
           AND IFNULL(hora_fin, '') = IFNULL(?, '')
           AND IFNULL(lugar, '') = IFNULL(?, '')
           AND IFNULL(publico_destinatario, '') = IFNULL(?, '')
           AND IFNULL(links, '') = IFNULL(?, '')
           AND IFNULL(observaciones, '') = IFNULL(?, '')
           AND fecha_carga >= (NOW() - INTERVAL 120 SECOND)
         LIMIT 1`,
        [
          usuario_id,
          nombre,
          fecha_evento,
          fechaFinValue,
          descripcion || '',
          categoria_id || 0,
          correo_contacto || '',
          telefono || '',
          horaInicioValue,
          horaFinValue,
          lugar || '',
          publico_destinatario || '',
          links || '',
          observaciones || '',
        ],
      );
      if (duplicados.length > 0) {
        return res.status(409).json({
          success: false,
          error: "Este evento ya fue registrado (envío duplicado).",
        });
      }

      // Insertar el nuevo evento en la base de datos (sin archivo_adjunto, ahora se usa eventos_archivos)
      const [result] = await pool.query(
        `
        INSERT INTO eventos (
          nombre, fecha_evento, fecha_fin, descripcion, categoria_id, usuario_id, secretaria,
          correo_contacto, telefono, hora_inicio, hora_fin, lugar, publico_destinatario, links, observaciones,
          estado_aprobacion, secretaria_id_responsable
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          nombre,
          fecha_evento,
          fechaFinValue,
          descripcion,
          categoria_id,
          usuario_id,
          secretaria,
          correo_contacto,
          telefono,
          horaInicioValue,
          horaFinValue,
          lugar,
          publico_destinatario,
          links,
          observaciones,
          estadoAprobacion,
          estadoAprobacion === 'pendiente' ? usuarioActual.secretaria_id : null,
        ],
      );

      const eventoId = result.insertId;

      // Guardar archivos en la tabla eventos_archivos si se subieron
      if (req.files && req.files.length > 0) {
        const path = require("path");
        for (const file of req.files) {
          // Obtener solo la extensión del archivo (sin el punto)
          const extension = path
            .extname(file.originalname)
            .substring(1)
            .toLowerCase();
          await pool.query(
            `
            INSERT INTO eventos_archivos (evento_id, nombre_archivo, archivo_path, tamao, tipo_archivo)
            VALUES (?, ?, ?, ?, ?)
          `,
            [eventoId, file.originalname, file.filename, file.size, extension],
          );
        }
      }

      // Registrar la creación en el historial
      await registrarEnHistorial(
        eventoId,
        usuario_id,
        "creado",
        cambiosIniciales,
        null,
        {
          nombre,
          fecha_evento,
          fechaFinValue,
          descripcion,
          categoria_id,
          correo_contacto,
          telefono,
          hora_inicio,
          hora_fin,
          lugar,
          publico_destinatario,
          links,
          observaciones,
        },
      );

      // Auditoría del módulo de eventos
      await registrarAuditoriaEventos({
        req,
        accion: estadoAprobacion === 'pendiente' ? 'solicitar' : 'crear',
        entidadTipo: 'evento',
        entidadId: eventoId,
        eventoId,
        secretariaId: usuarioActual.secretaria_id || null,
        datosNuevos: {
          nombre,
          fecha_evento,
          categoria_id,
          estado_aprobacion: estadoAprobacion,
        },
      });

      // Los eventos pendientes no se publican ni notifican por correo.
      if (estadoAprobacion !== 'pendiente') {
        try {
        // Obtener evento con categoría e emails
        const [eventoParaEmail] = await pool.query(
          `
          SELECT e.*, 
                 c.nombre as categoria_nombre, 
                 c.color as categoria_color,
                 GROUP_CONCAT(ce.email) as categoria_emails,
                 u.nombre_completo as usuario_nombre
          FROM eventos e
          LEFT JOIN categorias c ON e.categoria_id = c.id
          LEFT JOIN categorias_emails ce ON c.id = ce.categoria_id
          LEFT JOIN usuarios u ON e.usuario_id = u.id
          WHERE e.id = ?
          GROUP BY e.id
        `,
          [eventoId],
        );

        if (eventoParaEmail.length > 0) {
          const evento = eventoParaEmail[0];
          const correoSecretaria = process.env.CORREO_SECRETARIA_PRINCIPAL;
          const correoAdicional = process.env.CORREO_ADICIONAL?.trim();

          // Construir array de correos
          const correosDestino = [];
          if (correoSecretaria) correosDestino.push(correoSecretaria);
          if (correoAdicional && correoAdicional !== correoSecretaria) {
            correosDestino.push(correoAdicional);
          }

          // Agregar emails de la categoría
          if (evento.categoria_emails) {
            const emailsCategoria = evento.categoria_emails
              .split(',')
              .map(e => e.trim())
              .filter(e => e && !correosDestino.includes(e));
            correosDestino.push(...emailsCategoria);
          }

          // Enviar si hay correos de destino
          if (correosDestino.length > 0) {
            // Obtener archivos del evento para incluirlos en el email
            const [archivos] = await pool.query(
              `SELECT nombre_archivo, archivo_path FROM eventos_archivos WHERE evento_id = ? ORDER BY fecha_carga ASC`,
              [eventoId]
            );

            const { enviarPDFPorCorreo } = require("../utils/emailService");
            // No bloqueante: no esperamos el envío para responder al usuario
            enviarPDFPorCorreo(evento, correosDestino, "creado", archivos)
              .then(() => console.log(`✅ Email de evento creado enviado a: ${correosDestino.join(", ")} con ${archivos.length} archivo(s) adjunto(s)`))
              .catch((emailError) => console.error("⚠️ Error enviando email automático:", emailError.message));
          } else {
            console.log("⚠️ No hay correos configurados para enviar notificación");
          }
        }
        } catch (emailError) {
          // No fallar la creación del evento si falla el email
          console.error("⚠️ Error enviando email automático:", emailError.message);
        }
      }

      // Obtener el evento recién creado con información completa
      const [eventos] = await pool.query(
        `
        SELECT e.*, u.nombre_completo as usuario_nombre,
               c.nombre as categoria_nombre, c.color as categoria_color
        FROM eventos e 
        LEFT JOIN usuarios u ON e.usuario_id = u.id 
        LEFT JOIN categorias c ON e.categoria_id = c.id
        WHERE e.id = ?
      `,
        [eventoId],
      );

      // Obtener archivos del evento
      const [archivos] = await pool.query(
        `
        SELECT id, nombre_archivo, archivo_path, tamao, tipo_archivo, fecha_carga
        FROM eventos_archivos
        WHERE evento_id = ?
        ORDER BY fecha_carga DESC
      `,
        [eventoId],
      );

      res.status(201).json({
        success: true,
        evento: eventos[0],
        archivos: archivos,
        message: estadoAprobacion === 'pendiente'
          ? 'Solicitud de evento registrada y pendiente de aprobación'
          : 'Evento creado exitosamente',
      });
    } catch (error) {
      console.error("Error creando evento:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  /**
   * CONTROLADOR: actualizarEvento
   * Actualiza un evento existente y maneja múltiples archivos adjuntos
   * Ruta: PUT /api/eventos/:id (protegida con authMiddleware)
   */
  actualizarEvento: async (req, res) => {
    try {
      const { id } = req.params;
      let {
        nombre,
        fecha_evento,
        fecha_fin,
        descripcion,
        categoria_id,
        correo_contacto,
        telefono,
        hora_inicio,
        hora_fin,
        lugar,
        publico_destinatario,
        links,
        observaciones,
        archivos_a_eliminar, // Array de IDs de archivos a eliminar
      } = req.body;

      // ✅ PARSEAR archivos_a_eliminar si viene como JSON string
      if (typeof archivos_a_eliminar === "string") {
        try {
          archivos_a_eliminar = JSON.parse(archivos_a_eliminar);
        } catch (e) {
          archivos_a_eliminar = [];
        }
      }

      console.log(
        "📋 archivos_a_eliminar parseado:",
        archivos_a_eliminar,
        "Tipo:",
        typeof archivos_a_eliminar,
      );

      const fechaFinValue =
        fecha_fin && fecha_fin.toString().trim() ? fecha_fin : null;
      const horaInicioValue =
        hora_inicio && hora_inicio.toString().trim() ? hora_inicio : null;
      const horaFinValue =
        hora_fin && hora_fin.toString().trim() ? hora_fin : null;

      // Verificar que el evento existe antes de actualizar
      const [eventos] = await pool.query("SELECT * FROM eventos WHERE id = ?", [
        id,
      ]);
      if (eventos.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Evento no encontrado",
        });
      }

      const eventoViejo = eventos[0];

      // Solo admin o el creador del evento pueden editarlo
      if (req.user.role !== "admin" && Number(eventoViejo.usuario_id) !== Number(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: "No tenés permiso para editar este evento",
        });
      }

      // Detectar qué campos han cambiado
      const { cambiosDetallados, valoresViejos, valoresNuevos } =
        await detectarCambios(eventoViejo, {
          nombre,
          fecha_evento,
          fecha_fin: fechaFinValue,
          descripcion,
          categoria_id,
          correo_contacto,
          telefono,
          hora_inicio,
          hora_fin,
          lugar,
          publico_destinatario,
          links,
          observaciones,
        });

      console.log("🔍 Cambios detectados:", cambiosDetallados);

      // Validar límite total de 250MB para archivos nuevos
      let totalSizeNew = 0;
      if (req.files && req.files.length > 0) {
        totalSizeNew = req.files.reduce((sum, file) => sum + file.size, 0);
      }

      // 🔧 CORREGIR: Obtener tamaño total de archivos existentes correctamente
      let totalSizeExisting = 0;

      if (
        archivos_a_eliminar &&
        Array.isArray(archivos_a_eliminar) &&
        archivos_a_eliminar.length > 0
      ) {
        // Si hay archivos a eliminar, sumar solo los que NO se eliminarán
        const placeholders = archivos_a_eliminar.map(() => "?").join(",");
        const query = `
          SELECT SUM(tamao) as total FROM eventos_archivos 
          WHERE evento_id = ? AND id NOT IN (${placeholders})
        `;
        const params = [id, ...archivos_a_eliminar];

        console.log("🔍 Query de tamaño:", query);
        console.log("📊 Params:", params);

        const [result] = await pool.query(query, params);
        totalSizeExisting = result[0]?.total || 0;
      } else {
        // Si no hay archivos a eliminar, contar todos
        const [result] = await pool.query(
          `SELECT SUM(tamao) as total FROM eventos_archivos WHERE evento_id = ?`,
          [id],
        );
        totalSizeExisting = result[0]?.total || 0;
      }

      const totalSize = totalSizeNew + totalSizeExisting;
      const maxTotalSize = 250 * 1024 * 1024; // 250MB

      console.log(
        `📁 Tamaño nuevo: ${(totalSizeNew / 1024 / 1024).toFixed(2)}MB, Existente: ${(totalSizeExisting / 1024 / 1024).toFixed(2)}MB, Total: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
      );

      if (totalSize > maxTotalSize) {
        return res.status(400).json({
          success: false,
          error: `El tamaño total de archivos (${(totalSize / 1024 / 1024).toFixed(2)}MB) excede el límite de 250MB`,
        });
      }

      // Manejar eliminación de archivos
      if (
        archivos_a_eliminar &&
        Array.isArray(archivos_a_eliminar) &&
        archivos_a_eliminar.length > 0
      ) {
        const fs = require("fs");
        const path = require("path");

        console.log(
          `🗑️ Eliminando ${archivos_a_eliminar.length} archivo(s): ${archivos_a_eliminar.join(", ")}`,
        );

        // Obtener info de archivos a eliminar para borrar físicamente
        const placeholders = archivos_a_eliminar.map(() => "?").join(",");
        const queryDelete = `
          SELECT id, archivo_path, nombre_archivo FROM eventos_archivos 
          WHERE id IN (${placeholders}) AND evento_id = ?
        `;
        const params = [...archivos_a_eliminar, id];

        console.log("🔍 Query de eliminación:", queryDelete);
        console.log("📊 Params:", params);

        const [archivosABorrar] = await pool.query(queryDelete, params);

        console.log(`📋 Archivos encontrados para eliminar:`, archivosABorrar);

        // Borrar archivos físicamente del servidor
        for (const archivo of archivosABorrar) {
          const filePath = path.join(
            __dirname,
            "../uploads",
            archivo.archivo_path,
          );
          console.log(
            `   Intentando eliminar: ${filePath} (existe: ${fs.existsSync(filePath)})`,
          );

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`   ✅ Físicamente eliminado: ${archivo.archivo_path}`);
          } else {
            console.warn(
              `   ⚠️ Archivo no existe en disco: ${archivo.archivo_path}`,
            );
          }
        }

        // Eliminar registros de la BD
        const queryBD = `
          DELETE FROM eventos_archivos WHERE id IN (${placeholders}) AND evento_id = ?
        `;

        console.log("🗑️ Query BD:", queryBD, "Params:", params);

        const result = await pool.query(queryBD, params);
        console.log(`✅ Registros eliminados de BD:`, result[0].affectedRows);

        cambiosDetallados.push(
          `Archivos: Se eliminaron ${archivos_a_eliminar.length} archivo(s)`,
        );
      }

      // Manejar nuevos archivos
      if (req.files && req.files.length > 0) {
        console.log(
          `📤 Agregando ${req.files.length} archivo(s) nuevos al evento`,
        );
        const path = require("path");
        for (const file of req.files) {
          // Obtener solo la extensión del archivo (sin el punto)
          const extension = path
            .extname(file.originalname)
            .substring(1)
            .toLowerCase();
          await pool.query(
            `
            INSERT INTO eventos_archivos (evento_id, nombre_archivo, archivo_path, tamao, tipo_archivo)
            VALUES (?, ?, ?, ?, ?)
          `,
            [id, file.originalname, file.filename, file.size, extension],
          );
          console.log(`   ✅ Archivo insertado: ${file.originalname}`);
        }
        cambiosDetallados.push(
          `Archivos: Se agregaron ${req.files.length} nuevo(s) archivo(s)`,
        );
      }

      // Actualizar siempre la fecha de modificación si hay cambios CUALQUIERA (campos u archivos)
      if (cambiosDetallados.length > 0) {
        // Registrar los cambios en el historial
        console.log(
          `📝 Registrando cambios en historial: ${cambiosDetallados.length} cambio(s)`,
        );
        await registrarEnHistorial(
          id,
          req.user.id,
          "actualizado",
          cambiosDetallados,
          valoresViejos,
          valoresNuevos,
        );

        // Siempre actualizar la fecha de última modificación y otros campos
        await pool.query(
          `
          UPDATE eventos
          SET 
            nombre = ?, 
            fecha_evento = ?,
            fecha_fin = ?,
            descripcion = ?, 
            categoria_id = ?,
            correo_contacto = ?,
            telefono = ?,
            hora_inicio = ?,
            hora_fin = ?,
            lugar = ?,
            publico_destinatario = ?,
            links = ?,
            observaciones = ?,
            ultima_modificacion = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
          [
            nombre,
            fecha_evento,
            fechaFinValue,
            descripcion,
            categoria_id,
            correo_contacto,
            telefono,
            horaInicioValue,
            horaFinValue,
            lugar,
            publico_destinatario,
            links,
            observaciones,
            id,
          ],
        );

        await registrarAuditoriaEventos({
          req,
          accion: "editar",
          entidadTipo: "evento",
          entidadId: Number(id),
          eventoId: Number(id),
          secretariaId: eventoViejo.secretaria_id_responsable ?? null,
          datosAnteriores: valoresViejos,
          datosNuevos: valoresNuevos,
        });

        console.log(`✅ Evento actualizado: ${id}`);
      } else {
        console.log(`⚠️ No hay cambios para registrar en el evento ${id}`);
      }

      // Obtener el evento actualizado con información completa
      const [eventosActualizados] = await pool.query(
        `
        SELECT e.*, u.nombre_completo as usuario_nombre,
               c.nombre as categoria_nombre, c.color as categoria_color
        FROM eventos e 
        LEFT JOIN usuarios u ON e.usuario_id = u.id 
        LEFT JOIN categorias c ON e.categoria_id = c.id
        WHERE e.id = ?
      `,
        [id],
      );

      // Obtener archivos actualizados del evento
      const [archivos] = await pool.query(
        `
        SELECT id, nombre_archivo, archivo_path, tamao, tipo_archivo, fecha_carga
        FROM eventos_archivos
        WHERE evento_id = ?
        ORDER BY fecha_carga DESC
      `,
        [id],
      );

      res.json({
        success: true,
        evento: eventosActualizados[0],
        archivos: archivos,
        message:
          cambiosDetallados.length > 0
            ? "Evento actualizado exitosamente"
            : "No se realizaron cambios",
      });
    } catch (error) {
      console.error("Error actualizando evento:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  /**
   * CONTROLADOR: eliminarEvento
   * Elimina un evento y registra la acción en el historial
   * Ruta: DELETE /api/eventos/:id (protegida con authMiddleware)
   */
  eliminarEvento: async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar que el evento existe antes de eliminar
      const [eventos] = await pool.query("SELECT * FROM eventos WHERE id = ?", [
        id,
      ]);
      if (eventos.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Evento no encontrado",
        });
      }

      // Solo admin o el creador del evento pueden eliminarlo
      const eventoAEliminar = eventos[0];
      if (req.user.role !== "admin" && Number(eventoAEliminar.usuario_id) !== Number(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: "No tenés permiso para eliminar este evento",
        });
      }

      // Registrar la eliminación en el historial ANTES de eliminar el evento
      await registrarEnHistorial(id, req.user.id, "eliminado", [
        "Evento eliminado del sistema",
      ]);

      // Eliminar el evento de la base de datos
      await pool.query("DELETE FROM eventos WHERE id = ?", [id]);

      // Auditoría del módulo de eventos (sobrevive a la eliminación)
      await registrarAuditoriaEventos({
        req,
        accion: "eliminar",
        entidadTipo: "evento",
        entidadId: Number(id),
        eventoId: Number(id),
        secretariaId: eventoAEliminar.secretaria_id_responsable ?? null,
        datosAnteriores: {
          nombre: eventoAEliminar.nombre,
          descripcion: eventoAEliminar.descripcion,
          fecha_evento: eventoAEliminar.fecha_evento,
          fecha_fin: eventoAEliminar.fecha_fin,
          hora_inicio: eventoAEliminar.hora_inicio,
          hora_fin: eventoAEliminar.hora_fin,
          lugar: eventoAEliminar.lugar,
          categoria_id: eventoAEliminar.categoria_id,
          publico_destinatario: eventoAEliminar.publico_destinatario,
          estado_aprobacion: eventoAEliminar.estado_aprobacion,
        },
      });

      res.json({
        success: true,
        message: "Evento eliminado exitosamente",
      });
    } catch (error) {
      console.error("Error eliminando evento:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  /**
   * CONTROLADOR: obtenerArchivosEvento
   * Obtiene todos los archivos adjuntos de un evento
   * Ruta: GET /api/eventos/:id/archivos
   */
  obtenerArchivosEvento: async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar que el evento existe
      const [eventos] = await pool.query(
        `SELECT id FROM eventos
         WHERE id = ? AND estado_aprobacion IN ('no_requerida', 'aprobada')`,
        [id],
      );
      if (eventos.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Evento no encontrado",
        });
      }

      // Obtener todos los archivos del evento
      const [archivos] = await pool.query(
        `
        SELECT id, nombre_archivo, archivo_path, tamao, tipo_archivo, fecha_carga
        FROM eventos_archivos
        WHERE evento_id = ?
        ORDER BY fecha_carga DESC
      `,
        [id],
      );

      res.json({
        success: true,
        archivos: archivos,
        total: archivos.length,
        tamañoTotal: archivos.reduce((sum, file) => sum + file.tamao, 0),
      });
    } catch (error) {
      console.error("Error obteniendo archivos:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  /**
   * CONTROLADOR: eliminarArchivoEvento
   * Elimina un archivo específico de un evento
   * Ruta: DELETE /api/eventos/:id/archivos/:archivoId (protegida con authMiddleware)
   */
  eliminarArchivoEvento: async (req, res) => {
    try {
      const { id, archivoId } = req.params;

      // Verificar que el evento existe
      const [eventos] = await pool.query(
        "SELECT id FROM eventos WHERE id = ?",
        [id],
      );
      if (eventos.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Evento no encontrado",
        });
      }

      // Obtener info del archivo a eliminar
      const [archivos] = await pool.query(
        `
        SELECT archivo_path, nombre_archivo FROM eventos_archivos 
        WHERE id = ? AND evento_id = ?
      `,
        [archivoId, id],
      );

      if (archivos.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Archivo no encontrado",
        });
      }

      const archivo = archivos[0];
      const fs = require("fs");
      const path = require("path");

      // Eliminar archivo físicamente del servidor
      const filePath = path.join(__dirname, "../uploads", archivo.archivo_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Archivo eliminado: ${archivo.archivo_path}`);
      }

      // Eliminar registro de la BD
      await pool.query(
        `
        DELETE FROM eventos_archivos WHERE id = ? AND evento_id = ?
      `,
        [archivoId, id],
      );

      // Registrar en historial
      await registrarEnHistorial(id, req.user.id, "actualizado", [
        `Archivo eliminado: ${archivo.nombre_archivo}`,
      ]);

      res.json({
        success: true,
        message: "Archivo eliminado exitosamente",
      });
    } catch (error) {
      console.error("Error eliminando archivo:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  /**
   * CONTROLADOR: descargarArchivo
   * Permite descargar un archivo adjunto de un evento
   * Ruta: GET /api/eventos/:eventoId/archivos/:archivoId/download
   */
  descargarArchivo: async (req, res) => {
    try {
      const { eventoId, archivoId } = req.params;

      // Verificar que el archivo existe en BD y pertenece al evento
      const [archivos] = await pool.query(
        `SELECT ea.archivo_path, ea.nombre_archivo, ea.tipo_archivo
         FROM eventos_archivos ea
         INNER JOIN eventos e ON e.id = ea.evento_id
         WHERE ea.id = ? AND ea.evento_id = ?
           AND e.estado_aprobacion IN ('no_requerida', 'aprobada')`,
        [archivoId, eventoId]
      );

      if (archivos.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Archivo no encontrado'
        });
      }

      const archivo = archivos[0];
      const path = require("path");
      const fs = require("fs");

      // Construir la ruta completa del archivo
      const filePath = path.join(__dirname, "../uploads", archivo.archivo_path);

      // Verificar que el archivo existe físicamente en el servidor
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: 'Archivo no encontrado en el servidor'
        });
      }

      // Descargar con el nombre original
      res.download(filePath, archivo.nombre_archivo, (err) => {
        if (err) {
          console.error('Error en descarga:', err);
        }
      });
    } catch (error) {
      console.error("Error descargando archivo:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  /**
   * CONTROLADOR: obtenerHistorial
   * Obtiene el historial de cambios de un evento
   * Ruta: GET /api/eventos/:id/historial
   */
  obtenerHistorial: async (req, res) => {
    try {
      const { id } = req.params;

      // Consulta que une historial_eventos con usuarios para obtener información de quién realizó cada acción
      const [historial] = await pool.query(
        `
        SELECT 
        he.*, 
        u.username, 
        u.role, 
        u.secretaria_id,
        s.nombre as secretaria
      FROM historial_eventos he
      INNER JOIN eventos e ON e.id = he.evento_id
      LEFT JOIN usuarios u ON he.usuario_id = u.id 
      LEFT JOIN secretarias s ON u.secretaria_id = s.id
      WHERE he.evento_id = ?
        AND e.estado_aprobacion IN ('no_requerida', 'aprobada')
      ORDER BY he.fecha DESC
      `,
        [id],
      );

      res.json({
        success: true,
        historial,
      });
    } catch (error) {
      console.error("Error obteniendo historial:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  /**
   * CONTROLADOR: enviarPDFCorreo
   * Genera y envía el PDF del evento por correo
   * Ruta: POST /api/eventos/:id/enviar-pdf (protegida)
   */
  enviarPDFCorreo: async (req, res) => {
    try {
      const { id } = req.params;
      const { tipoAccion = "creado" } = req.body;

      // Obtener evento con datos completos (incluyendo todos los emails de la categoría)
      const [eventos] = await pool.query(
        `
      SELECT e.*, 
             c.nombre as categoria_nombre, 
             c.color as categoria_color,
             GROUP_CONCAT(ce.email) as categoria_emails,
             u.nombre_completo as usuario_nombre
      FROM eventos e
      LEFT JOIN categorias c ON e.categoria_id = c.id
      LEFT JOIN categorias_emails ce ON c.id = ce.categoria_id
      LEFT JOIN usuarios u ON e.usuario_id = u.id
      WHERE e.id = ?
        AND e.estado_aprobacion IN ('no_requerida', 'aprobada')
      GROUP BY e.id
    `,
        [id],
      );

      if (eventos.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Evento no encontrado",
        });
      }

      const evento = eventos[0];

      // Obtener correos del .env
      const correoSecretaria = process.env.CORREO_SECRETARIA_PRINCIPAL;
      const correoAdicional = process.env.CORREO_ADICIONAL?.trim();

      // Array de correos a enviar (sin duplicados)
      const correosDestino = [correoSecretaria];

      if (correoAdicional && correoAdicional !== correoSecretaria) {
        correosDestino.push(correoAdicional);
      }

      // Agregar TODOS los emails de la categoría (de la tabla categorias_emails)
      if (evento.categoria_emails) {
        const emailsCategoria = evento.categoria_emails
          .split(',')
          .map(email => email.trim())
          .filter(email => email && !correosDestino.includes(email));
        
        correosDestino.push(...emailsCategoria);
        if (emailsCategoria.length > 0) {
          console.log(
            `✅ Emails de categoría agregados: ${emailsCategoria.join(", ")}`
          );
        }
      }

      console.log(`📧 Enviando PDF a: ${correosDestino.join(", ")}`);

      // Obtener archivos del evento adjuntos
      const [archivos] = await pool.query(
        `SELECT nombre_archivo, archivo_path FROM eventos_archivos WHERE evento_id = ? ORDER BY fecha_carga ASC`,
        [id]
      );

      // Enviar UN SOLO EMAIL a todos los destinatarios con archivos adjuntos
      const { enviarPDFPorCorreo } = require("../utils/emailService");

      try {
        await enviarPDFPorCorreo(evento, correosDestino, "creado", archivos);
      } catch (emailError) {
        console.error(`❌ Error enviando email:`, emailError);
        throw emailError;
      }

      res.json({
        success: true,
        message: `PDF enviado exitosamente a ${correosDestino.length} destinatario(s) con ${archivos.length} archivo(s)`,
        destinatarios: correosDestino,
      });
    } catch (error) {
      console.error("❌ Error enviando PDF:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Error al enviar el PDF",
      });
    }
  },

  /**
   * CONTROLADOR: descargarMultiplesArchivos
   * Descarga todos los archivos de un evento (nuevos + legacy) como ZIP
   * Ruta: GET /api/eventos/:id/descargar-todos
   */
  descargarMultiplesArchivos: async (req, res) => {
    try {
      const { id } = req.params;
      const path = require("path");
      const fs = require("fs");
      const archiver = require("archiver");
      const os = require("os");

      // Obtener evento
      const [eventos] = await pool.query(
        `SELECT nombre, fecha_evento, archivo_adjunto FROM eventos
         WHERE id = ? AND estado_aprobacion IN ('no_requerida', 'aprobada')`,
        [id],
      );

      if (eventos.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Evento no encontrado",
        });
      }

      const evento = eventos[0];

      // Obtener archivos nuevos
      const [archivos] = await pool.query(
        "SELECT nombre_archivo, archivo_path FROM eventos_archivos WHERE evento_id = ? ORDER BY fecha_carga ASC",
        [id],
      );

      console.log(`📦 Generando ZIP para evento ${id}: "${evento.nombre}"`);
      console.log(`📁 Archivos encontrados en BD: ${archivos.length}`);
      archivos.forEach((a) =>
        console.log(`  - ${a.nombre_archivo} (path: ${a.archivo_path})`),
      );

      // Crear nombre del ZIP
      const nombreZip = `Evento_${evento.nombre.replace(/[^a-z0-9]/gi, "_")}.zip`;

      // Crear directorio temporal para el ZIP
      const uploadsDir = path.join(__dirname, "../uploads");
      const tempZipPath = path.join(
        uploadsDir,
        `temp_${Date.now()}_${nombreZip}`,
      );

      // Crear el archivo ZIP
      const output = fs.createWriteStream(tempZipPath);
      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      let archivoEncontrado = false;

      // Agregar archivos nuevos al ZIP
      archivos.forEach((archivo) => {
        // Usar archivo_path si existe, sino usar nombre_archivo
        const nombreEnDisco = archivo.archivo_path || archivo.nombre_archivo;
        const filePath = path.join(uploadsDir, nombreEnDisco);

        console.log(`🔍 Buscando: ${filePath}`);

        if (fs.existsSync(filePath)) {
          console.log(`✅ Archivo encontrado: ${nombreEnDisco}`);
          archive.file(filePath, { name: archivo.nombre_archivo });
          archivoEncontrado = true;
        } else {
          console.log(`❌ Archivo NO encontrado: ${nombreEnDisco}`);
        }
      });

      // Agregar archivo legacy si existe
      if (evento.archivo_adjunto) {
        const legacyPath = path.join(uploadsDir, evento.archivo_adjunto);
        console.log(`🔍 Buscando legacy: ${legacyPath}`);

        if (fs.existsSync(legacyPath)) {
          console.log(
            `✅ Archivo legacy encontrado: ${evento.archivo_adjunto}`,
          );
          archive.file(legacyPath, { name: evento.archivo_adjunto });
          archivoEncontrado = true;
        } else {
          console.log(
            `❌ Archivo legacy NO encontrado: ${evento.archivo_adjunto}`,
          );
        }
      }

      if (!archivoEncontrado) {
        console.error(`❌ No hay archivos para descargar (evento ${id})`);
        return res.status(404).json({
          success: false,
          error: "No hay archivos para descargar",
        });
      }

      // Pipe output
      archive.pipe(output);

      output.on("finish", () => {
        console.log(`✅ ZIP creado exitosamente: ${nombreZip}`);
        // Enviar el ZIP
        res.download(tempZipPath, nombreZip, (error) => {
          // Eliminar el archivo temporal después de descargar
          if (fs.existsSync(tempZipPath)) {
            fs.unlink(tempZipPath, (err) => {
              if (err) console.error("Error eliminando ZIP temporal:", err);
              else console.log(`🗑️ ZIP temporal eliminado`);
            });
          }
        });
      });

      output.on("error", (error) => {
        console.error("Error creando ZIP:", error);
        res.status(500).json({
          success: false,
          error: "Error creando archivo ZIP",
        });
      });

      archive.finalize();
    } catch (error) {
      console.error("Error descargando múltiples archivos:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },
};

module.exports = eventosController;
module.exports.notificarEventoAprobado = notificarEventoAprobado;
