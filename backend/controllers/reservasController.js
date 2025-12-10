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
        const { espacio_id, fecha_inicio, hora_inicio, fecha_fin, hora_fin, titulo, descripcion, motivo, cantidad_participantes, participantes_email, observaciones } = req.body;
        const usuario_id = req.user.id;

        // Validaciones básicas
        if (!espacio_id || !fecha_inicio || !hora_inicio || !fecha_fin || !hora_fin || !titulo) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos'
            });
        }

        // Verificar que el espacio existe y obtener su configuración
        const [espacios] = await db.execute(
            'SELECT id, requiere_aprobacion FROM espacios WHERE id = ?',
            [espacio_id]
        );

        if (espacios.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'El espacio no existe'
            });
        }

        const espacio = espacios[0];

        // Validar disponibilidad
        const [conflictos] = await db.execute(
            `SELECT id FROM reservas 
             WHERE espacio_id = ? 
             AND estado NOT IN ('cancelada', 'rechazada')
             AND (
                (fecha_inicio <= ? AND fecha_fin >= ?)
             )`,
            [espacio_id, fecha_fin, fecha_inicio]
        );

        if (conflictos.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'El espacio no está disponible en ese horario'
            });
        }

        // Generar número de reserva
        const numero_reserva = await generarNumeroReserva();

        // Determinar estado según si el espacio requiere aprobación
        const estado = espacio.requiere_aprobacion ? 'pendiente' : 'confirmada';

        // Usar valores por defecto si vienen undefined
        const motivo_final = motivo || 'reunion';
        const cantidad_final = cantidad_participantes || 1;
        const email_final = participantes_email || null;
        const obs_final = observaciones || null;

        // Crear la reserva
        const [result] = await db.execute(
            `INSERT INTO reservas 
            (numero_reserva, usuario_id, espacio_id, fecha_inicio, hora_inicio, fecha_fin, hora_fin, titulo, descripcion, motivo, cantidad_participantes, estado, requiere_aprobacion, creador_id, participantes_email, observaciones)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [numero_reserva, usuario_id, espacio_id, fecha_inicio, hora_inicio, fecha_fin, hora_fin, titulo, descripcion, motivo_final, cantidad_final, estado, espacio.requiere_aprobacion, usuario_id, email_final, obs_final]
        );

        console.log('✅ Reserva creada:', result.insertId);

        res.status(201).json({
            success: true,
            message: `Reserva creada exitosamente${espacio.requiere_aprobacion ? ' (pendiente de aprobación)' : ' (confirmada automáticamente)'}`,
            reserva: {
                id: result.insertId,
                numero_reserva,
                estado
            }
        });

    } catch (error) {
        console.error('❌ Error creando reserva:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear la reserva'
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
    },
    obtenerReservaPorId: async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener detalles de la reserva con JOINs
        const [reservas] = await db.execute(
        `SELECT r.*, 
                e.nombre as espacio_nombre, 
                e.capacidad,
                e.ubicacion,
                e.estado as espacio_estado,
                e.requiere_aprobacion as espacio_requiere_aprobacion,
                u.nombre_completo as usuario_nombre,
                u.email as usuario_email,
                u.telefono as usuario_telefono,
                sec.nombre as secretaria_nombre,
                apr.nombre_completo as aprobador_nombre
        FROM reservas r
        LEFT JOIN espacios e ON r.espacio_id = e.id
        LEFT JOIN usuarios u ON r.usuario_id = u.id
        LEFT JOIN secretarias sec ON u.secretaria_id = sec.id
        LEFT JOIN usuarios apr ON r.aprobador_id = apr.id
        WHERE r.id = ?`,
        [id]
        );
        console.log('Reserva obtenida:', reservas);
        if (reservas.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Reserva no encontrada'
        });
        }

        const reserva = reservas[0];

        // Obtener recursos solicitados para esta reserva
        const [recursos] = await db.execute(
        `SELECT rr.id, 
                rr.recurso_id,
                rr.cantidad_solicitada, 
                rr.observaciones,
                r.nombre as recurso_nombre
        FROM reservas_recursos rr
        LEFT JOIN recursos r ON rr.recurso_id = r.id
        WHERE rr.reserva_id = ?
        ORDER BY r.nombre ASC`,
        [id]
        );
        console.log('Recursos obtenidos para la reserva:', recursos);
        res.json({
        success: true,
        reserva: {
            ...reserva,
            recursos: recursos || []
        }
        });

    } catch (error) {
        console.error('Error obteniendo reserva:', error);
        res.status(500).json({
        success: false,
        error: 'Error al obtener la reserva'
        });
    }
    },
    rechazarReserva: async (req, res) => {
    try {
        const { id } = req.params;

        // Solo admin puede rechazar
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden rechazar reservas'
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
                error: 'Solo se pueden rechazar reservas pendientes'
            });
        }

        // Rechazar la reserva
        await db.execute(
            `UPDATE reservas SET estado = 'rechazada', aprobador_id = ? WHERE id = ?`,
            [req.user.id, id]
        );

        res.json({
            success: true,
            mensaje: 'Reserva rechazada exitosamente'
        });

    } catch (error) {
        console.error('Error rechazando reserva:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}
};



module.exports = reservasController;