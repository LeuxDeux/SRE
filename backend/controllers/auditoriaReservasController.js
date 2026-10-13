const db = require('../config/database');

const fechaValida = (fecha) => /^\d{4}-\d{2}-\d{2}$/.test(fecha || '');

const obtenerAuditoriaReservas = async (req, res) => {
  try {
    const [usuarios] = await db.execute(
      'SELECT id, role, secretaria_id FROM usuarios WHERE id = ? AND activo = 1',
      [req.user.id],
    );
    const usuario = usuarios[0];
    if (!usuario) {
      return res.status(401).json({ success: false, error: 'Usuario no válido' });
    }
    if (!['admin', 'secretaria'].includes(usuario.role)) {
      return res.status(403).json({ success: false, error: 'No tienes permiso para consultar la auditoría' });
    }
    const paginaSolicitada = Number.parseInt(req.query.pagina, 10);
    const limiteSolicitado = Number.parseInt(req.query.limite, 10);
    const pagina = Number.isSafeInteger(paginaSolicitada)
      ? Math.min(1000000, Math.max(1, paginaSolicitada))
      : 1;
    const limite = Number.isSafeInteger(limiteSolicitado)
      ? Math.min(100, Math.max(1, limiteSolicitado))
      : 25;
    const offset = (pagina - 1) * limite;

    let where = ' WHERE 1 = 1';
    const parametros = [];
    if (req.query.secretaria_id) {
      const secretariaId = Number(req.query.secretaria_id);
      if (!Number.isInteger(secretariaId) || secretariaId < 1) {
        return res.status(400).json({ success: false, error: 'Secretaría inválida' });
      }
      where += ' AND a.secretaria_id = ?';
      parametros.push(secretariaId);
    }

    if (req.query.accion) {
      where += ' AND a.accion = ?';
      parametros.push(String(req.query.accion).slice(0, 80));
    }
    if (req.query.entidad_tipo) {
      where += ' AND a.entidad_tipo = ?';
      parametros.push(String(req.query.entidad_tipo).slice(0, 50));
    }
    if (req.query.fecha_desde) {
      if (!fechaValida(req.query.fecha_desde)) {
        return res.status(400).json({ success: false, error: 'Fecha inicial inválida' });
      }
      where += ' AND a.fecha_accion >= ?';
      parametros.push(req.query.fecha_desde);
    }
    if (req.query.fecha_hasta) {
      if (!fechaValida(req.query.fecha_hasta)) {
        return res.status(400).json({ success: false, error: 'Fecha final inválida' });
      }
      where += ' AND a.fecha_accion < DATE_ADD(?, INTERVAL 1 DAY)';
      parametros.push(req.query.fecha_hasta);
    }

    const [conteos] = await db.execute(
      `SELECT COUNT(*) AS total FROM auditoria_modulo_reservas a${where}`,
      parametros,
    );
    const [registros] = await db.execute(
      `SELECT a.id, a.actor_id, a.actor_role, a.secretaria_id,
              s.nombre AS secretaria_nombre, a.accion, a.entidad_tipo,
              a.entidad_id, a.reserva_id, r.numero_reserva,
              e.nombre AS espacio_nombre, rec.nombre AS recurso_nombre,
              COALESCE(e.nombre, rec.nombre) AS entidad_nombre,
              a.datos_anteriores, a.datos_nuevos, a.observaciones,
              a.fecha_accion, u.username, u.nombre_completo AS actor_nombre
       FROM auditoria_modulo_reservas a
       LEFT JOIN usuarios u ON u.id = a.actor_id
       LEFT JOIN secretarias s ON s.id = a.secretaria_id
       LEFT JOIN reservas r ON r.id = a.reserva_id
       LEFT JOIN espacios e ON e.id = CASE
         WHEN a.entidad_tipo IN ('espacio', 'asignacion_espacio') THEN a.entidad_id
         ELSE r.espacio_id
       END
       LEFT JOIN recursos rec ON rec.id = CASE
         WHEN a.entidad_tipo IN ('recurso', 'recurso_reserva') THEN a.entidad_id
         ELSE NULL
       END
       ${where}
       ORDER BY a.fecha_accion DESC, a.id DESC
      LIMIT ${limite} OFFSET ${offset}`,
          parametros,
    );

    const total = Number(conteos[0]?.total || 0);
    return res.json({
      success: true,
      registros,
      paginacion: {
        pagina,
        limite,
        total,
        paginas: Math.ceil(total / limite),
      },
    });
  } catch (error) {
    console.error('Error consultando auditoría de reservas:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

module.exports = { obtenerAuditoriaReservas };
