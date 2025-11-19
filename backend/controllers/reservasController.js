const db = require('../config/database');
const generarNumeroReserva = async () => {
    const year = new Date().getFullYear();
    const [result] = await db.execute(
        'SELECT COUNT(*) as total FROM reservas WHERE YEAR(fecha_solicitud) = ?',
        [year]
    );
    const numero = result[0].total + 1;
    return `RES-${year}-${numero.toString().padStart(3, '0')}`;
};
const reservasController = {
    // Validar disponibilidad de un espacio en una franja horaria
    validarDisponibilidad: async (req, res) => {
        try {
            const { espacio_id, fecha_inicio, hora_inicio, fecha_fin, hora_fin, excluir_reserva_id } = req.body;

            // Validaciones básicas
            if (!espacio_id || !fecha_inicio || !hora_inicio || !fecha_fin || !hora_fin) {
                return res.status(400).json({
                    success: false,
                    error: 'Faltan campos requeridos: espacio_id, fecha_inicio, hora_inicio, fecha_fin, hora_fin'
                });
            }

            // Consulta para encontrar conflictos
            const [conflictos] = await db.execute(
                `SELECT id, numero_reserva, titulo, fecha_inicio, hora_inicio, fecha_fin, hora_fin, estado 
         FROM reservas 
         WHERE espacio_id = ? 
         AND estado IN ('pendiente', 'confirmada')
         AND id != ?
         AND (
           -- Conversión correcta de fechas/horas considerando zona horaria
           (DATE(fecha_inicio) < ? OR (DATE(fecha_inicio) = ? AND TIME(hora_inicio) < ?))
           AND
           (DATE(fecha_fin) > ? OR (DATE(fecha_fin) = ? AND TIME(hora_fin) > ?))
         )`,
                [
                    espacio_id,
                    excluir_reserva_id || -1,
                    // Usamos DATE() y TIME() para evitar problemas de zona horaria
                    fecha_fin, fecha_fin, hora_fin,
                    fecha_inicio, fecha_inicio, hora_inicio
                ]
            );

            res.json({
                success: true,
                disponible: conflictos.length === 0,
                conflictos: conflictos,
                totalConflictos: conflictos.length
            });

        } catch (error) {
            console.error('Error validando disponibilidad:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    },

    // Obtener todas las reservas (para admin)
    obtenerReservas: async (req, res) => {
        try {
            const [reservas] = await db.execute(
                `SELECT r.*, e.nombre as espacio_nombre, u.nombre_completo as usuario_nombre 
         FROM reservas r 
         JOIN espacios e ON r.espacio_id = e.id 
         JOIN usuarios u ON r.usuario_id = u.id 
         ORDER BY r.fecha_solicitud DESC 
         LIMIT 50`
            );
            res.json(reservas);
        } catch (error) {
            console.error('Error obteniendo reservas:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },
    crearReserva: async (req, res) => {
        try {
            const {
                espacio_id, usuario_id, fecha_inicio, hora_inicio, fecha_fin, hora_fin,
                titulo, descripcion, motivo, cantidad_participantes, recursos_solicitados
            } = req.body;

            // Validar campos obligatorios
            if (!espacio_id || !usuario_id || !fecha_inicio || !hora_inicio ||
                !fecha_fin || !hora_fin || !titulo) {
                return res.status(400).json({
                    success: false,
                    error: 'Faltan campos obligatorios'
                });
            }

            // Validar disponibilidad primero
            const [conflictos] = await db.execute(
                `SELECT id FROM reservas 
       WHERE espacio_id = ? 
       AND estado IN ('pendiente', 'confirmada')
       AND (
         (DATE(fecha_inicio) < ? OR (DATE(fecha_inicio) = ? AND TIME(hora_inicio) < ?))
         AND
         (DATE(fecha_fin) > ? OR (DATE(fecha_fin) = ? AND TIME(hora_fin) > ?))
       )`,
                [espacio_id, fecha_fin, fecha_fin, hora_fin, fecha_inicio, fecha_inicio, hora_inicio]
            );

            if (conflictos.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'El espacio no está disponible en ese horario'
                });
            }

            // Generar número de reserva
            const numero_reserva = await generarNumeroReserva();

            // Crear la reserva con valores por defecto para campos opcionales
            const [result] = await db.execute(
                `INSERT INTO reservas (
        numero_reserva, usuario_id, espacio_id, fecha_inicio, hora_inicio,
        fecha_fin, hora_fin, titulo, descripcion, motivo, cantidad_participantes,
        creador_id, requiere_aprobacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    numero_reserva,
                    usuario_id,
                    espacio_id,
                    fecha_inicio,
                    hora_inicio,
                    fecha_fin,
                    hora_fin,
                    titulo,
                    descripcion || '',           // Si no viene, usar string vacío
                    motivo || 'reunion',         // Si no viene, usar 'reunion' por defecto
                    cantidad_participantes || 1, // Si no viene, usar 1 por defecto
                    req.user.id,
                    true
                ]
            );

            const reservaId = result.insertId;

            // Insertar recursos solicitados si los hay
            if (recursos_solicitados && recursos_solicitados.length > 0) {
                for (const recurso of recursos_solicitados) {
                    await db.execute(
                        'INSERT INTO reservas_recursos (reserva_id, recurso_id, cantidad_solicitada) VALUES (?, ?, ?)',
                        [reservaId, recurso.recurso_id, recurso.cantidad || 1]
                    );
                }
            }

            res.json({
                success: true,
                reserva: {
                    id: reservaId,
                    numero_reserva: numero_reserva,
                    mensaje: 'Reserva creada exitosamente. Está pendiente de aprobación.'
                }
            });

        } catch (error) {
            console.error('Error creando reserva:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor: ' + error.message
            });
        }
    },
    cancelarReserva: async (req, res) => {
        try {
            const { id } = req.params;
            const usuarioId = req.user.id;
            const usuarioRole = req.user.role;

            // Verificar que la reserva existe
            const [reservas] = await db.execute(
                `SELECT * FROM reservas WHERE id = ?`,
                [id]
            );

            if (reservas.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Reserva no encontrada'
                });
            }

            const reserva = reservas[0];

            // Verificar permisos: admin puede cancelar cualquier reserva, usuario solo las propias
            if (usuarioRole !== 'admin' && reserva.creador_id !== usuarioId) {
                return res.status(403).json({
                    success: false,
                    error: 'No tienes permiso para cancelar esta reserva'
                });
            }

            // Verificar que no esté ya cancelada o completada
            if (reserva.estado === 'cancelada') {
                return res.status(400).json({
                    success: false,
                    error: 'La reserva ya está cancelada'
                });
            }

            // Cancelar la reserva
            await db.execute(
                `UPDATE reservas SET estado = 'cancelada' WHERE id = ?`,
                [id]
            );

            res.json({
                success: true,
                mensaje: 'Reserva cancelada exitosamente'
            });

        } catch (error) {
            console.error('Error cancelando reserva:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    },
    aprobarReserva: async (req, res) => {
        try {
            const { id } = req.params;

            // Solo admin puede aprobar
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Solo administradores pueden aprobar reservas'
                });
            }

            // Verificar que la reserva existe y está pendiente
            const [reservas] = await db.execute(
                `SELECT * FROM reservas WHERE id = ?`,
                [id]
            );

            if (reservas.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Reserva no encontrada'
                });
            }

            const reserva = reservas[0];

            if (reserva.estado !== 'pendiente') {
                return res.status(400).json({
                    success: false,
                    error: 'Solo se pueden aprobar reservas pendientes'
                });
            }

            // Aprobar la reserva
            await db.execute(
                `UPDATE reservas SET estado = 'confirmada', aprobador_id = ?, fecha_aprobacion = NOW() WHERE id = ?`,
                [req.user.id, id]
            );

            res.json({
                success: true,
                mensaje: 'Reserva aprobada exitosamente'
            });

        } catch (error) {
            console.error('Error aprobando reserva:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
};


module.exports = reservasController;