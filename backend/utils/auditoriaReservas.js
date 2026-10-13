const db = require('../config/database');

const serializar = (valor) => valor == null ? null : JSON.stringify(valor);

const registrarAuditoriaReservas = async ({
  req,
  accion,
  entidadTipo,
  entidadId = null,
  reservaId = null,
  secretariaId = null,
  datosAnteriores = null,
  datosNuevos = null,
  observaciones = null,
}) => {
  const actorId = req.user?.id;
  if (!actorId || !accion || !entidadTipo) return false;

  try {
    const [usuarios] = await db.execute(
      'SELECT role FROM usuarios WHERE id = ?',
      [actorId],
    );
    const actorRole = usuarios[0]?.role || req.user.role || 'desconocido';

    await db.execute(
      `INSERT INTO auditoria_modulo_reservas
       (actor_id, actor_role, secretaria_id, accion, entidad_tipo, entidad_id,
        reserva_id, datos_anteriores, datos_nuevos, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actorId,
        actorRole,
        secretariaId,
        accion,
        entidadTipo,
        entidadId,
        reservaId,
        serializar(datosAnteriores),
        serializar(datosNuevos),
        observaciones,
      ],
    );
    return true;
  } catch (error) {
    console.error('Error registrando auditoría del módulo de reservas:', error.message);
    return false;
  }
};

module.exports = registrarAuditoriaReservas;
