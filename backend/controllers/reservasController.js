const db = require('../config/database');
const { enviarCorreoReserva, enviarCorreoEdicionReserva } = require('../utils/emailService');

const generarNumeroReserva = async () => {
    const year = new Date().getFullYear();
    const [result] = await db.execute(
        'SELECT COUNT(*) as total FROM reservas WHERE YEAR(fecha_solicitud) = ?',
        [year]
    );
    const numero = result[0].total + 1;
    return `RES-${year}-${numero.toString().padStart(3, '0')}`;
};

// Función helper para guardar historial de cambios
const guardarHistorialReserva = async (reservaId, datosAnteriores, tipoChangio = 'edicion', realizadoPor, observaciones = null) => {
    try {
        await db.execute(
            `INSERT INTO reservas_historial 
            (reserva_id, datos_anteriores, tipo_cambio, realizado_por, observaciones)
            VALUES (?, ?, ?, ?, ?)`,
            [reservaId, JSON.stringify(datosAnteriores), tipoChangio, realizadoPor, observaciones]
        );
        console.log(`✅ Historial guardado para reserva ${reservaId}`);
    } catch (error) {
        console.error(`⚠️ Error guardando historial: ${error.message}`);
        // No lanzar error, solo log
    }
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
                WHERE r.fecha_eliminacion IS NULL
                ORDER BY r.fecha_solicitud DESC 
                LIMIT 50`
            );

            // Obtener recursos para cada reserva
            const reservasConRecursos = await Promise.all(
                reservas.map(async (reserva) => {
                    const [recursos] = await db.execute(
                        `SELECT rr.id, rr.cantidad_solicitada, rr.observaciones,
                                r.id as recurso_id, r.nombre as nombre
                        FROM reservas_recursos rr
                        LEFT JOIN recursos r ON rr.recurso_id = r.id
                        WHERE rr.reserva_id = ?
                        ORDER BY r.nombre ASC`,
                        [reserva.id]
                    );
                    return {
                        ...reserva,
                        recursos: recursos || []
                    };
                })
            );

            res.json(reservasConRecursos);
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

        // ============================================
        // 💾 GUARDAR RECURSOS ASOCIADOS A LA RESERVA
        // ============================================
        
        // Si vienen recursos_solicitados, guardarlos en la tabla reservas_recursos
        if (req.body.recursos_solicitados && Array.isArray(req.body.recursos_solicitados)) {
            const recursosSolicitados = req.body.recursos_solicitados.filter(r => r.cantidad_solicitada > 0);
            
            for (const recurso of recursosSolicitados) {
                try {
                    await db.execute(
                        `INSERT INTO reservas_recursos 
                        (reserva_id, recurso_id, cantidad_solicitada, observaciones)
                        VALUES (?, ?, ?, ?)`,
                        [result.insertId, recurso.recurso_id, recurso.cantidad_solicitada, recurso.observaciones || null]
                    );
                    console.log(`✅ Recurso ${recurso.recurso_id} agregado a la reserva`);
                } catch (recursoError) {
                    console.error(`⚠️ Error guardando recurso ${recurso.recurso_id}:`, recursoError.message);
                }
            }
        }

        // ============================================
        // 📧 BLOQUE DE ENVÍO DE CORREOS - CREACIÓN
        // ============================================
        
        // Obtener datos completos de la reserva para enviar el correo
        const [reservasCreadas] = await db.execute(
            `SELECT r.*, 
                    e.nombre as espacio_nombre, 
                    u.nombre_completo as usuario_nombre,
                    u.email as usuario_email,
                    u.telefono as usuario_telefono
            FROM reservas r
            LEFT JOIN espacios e ON r.espacio_id = e.id
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            WHERE r.id = ?`,
            [result.insertId]
        );

        if (reservasCreadas.length > 0) {
            const reservaCreada = reservasCreadas[0];
            
            // Obtener recursos asociados a esta reserva
            const [recursos] = await db.execute(
                `SELECT rr.id, rr.cantidad_solicitada, rr.observaciones,
                        r.nombre as recurso_nombre
                FROM reservas_recursos rr
                LEFT JOIN recursos r ON rr.recurso_id = r.id
                WHERE rr.reserva_id = ?
                ORDER BY r.nombre ASC`,
                [result.insertId]
            );
            
            // Agregar recursos al objeto de la reserva
            reservaCreada.recursos = recursos || [];
            
            // 📨 CONDICIÓN: Solo enviar correo si la reserva está CONFIRMADA
            // (es decir, no requería aprobación o ya fue aprobada)
            if (reservaCreada.estado === 'confirmada') {
                // ⚙️ Construir lista de destinatarios desde .env
                let emailDestinos = [];
                
                // Agregar correos del .env (departamentos, mantenimiento, etc.)
                if (process.env.CORREOS_NOTIFICACION_RESERVA) {
                    const correosEnv = process.env.CORREOS_NOTIFICACION_RESERVA
                        .split(',')
                        .map(e => e.trim())
                        .filter(e => e.length > 0);
                    emailDestinos = [...emailDestinos, ...correosEnv];
                }
                
                // Agregar email del usuario solicitante (si está habilitado y existe)
                if (process.env.INCLUIR_EMAIL_USUARIO_EN_NOTIFICACION === 'true' && reservaCreada.usuario_email) {
                    // Evitar duplicados
                    if (!emailDestinos.includes(reservaCreada.usuario_email)) {
                        emailDestinos.push(reservaCreada.usuario_email);
                    }
                }
                
                // Enviar solo si hay destinatarios
                if (emailDestinos.length > 0) {
                    try {
                        await enviarCorreoReserva(reservaCreada, emailDestinos, 'creada');
                        console.log(`📧 Correo enviado a: ${emailDestinos.join(', ')}`);
                    } catch (emailError) {
                        console.error('⚠️ Error enviando correo:', emailError.message);
                        // No interrumpir la respuesta si falla el correo
                    }
                } else {
                    console.log('⚠️ No hay destinatarios configurados para enviar correo de reserva');
                }
            } else {
                // Si está pendiente, no se envía correo
                console.log('⏳ Reserva pendiente de aprobación - correo NO enviado');
            }
        }

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

    // Eliminar reserva (baja lógica - soft delete)
    eliminarReserva: async (req, res) => {
        try {
            const { id } = req.params;
            const usuarioId = req.user.id;
            const usuarioRole = req.user.role;

            // Verificar que la reserva existe
            const [reservas] = await db.execute(
                `SELECT * FROM reservas WHERE id = ? AND fecha_eliminacion IS NULL`,
                [id]
            );

            if (reservas.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Reserva no encontrada o ya eliminada'
                });
            }

            const reserva = reservas[0];

            // Verificar permisos: admin puede eliminar cualquier reserva, usuario solo las propias
            if (usuarioRole !== 'admin' && reserva.creador_id !== usuarioId) {
                return res.status(403).json({
                    success: false,
                    error: 'No tienes permiso para eliminar esta reserva'
                });
            }

            // Validar que la reserva es futura (no se puede eliminar reservas pasadas)
            const hoy = new Date();
            const fechaInicio = new Date(reserva.fecha_inicio);
            if (fechaInicio <= hoy) {
                return res.status(400).json({
                    success: false,
                    error: 'No se pueden eliminar reservas de fechas pasadas o de hoy'
                });
            }

            // Obtener datos anteriores para historial
            const datosAnteriores = {
                estado_anterior: reserva.estado,
                fecha_inicio: new Date(reserva.fecha_inicio).toISOString().split('T')[0],
                titulo: reserva.titulo
            };

            // Realizar soft delete - marcar con fecha_eliminacion
            await db.execute(
                `UPDATE reservas SET fecha_eliminacion = NOW() WHERE id = ?`,
                [id]
            );

            // Guardar en historial
            await guardarHistorialReserva(
                id,
                datosAnteriores,
                'eliminacion',
                usuarioId,
                'Reserva eliminada por el usuario'
            );

            res.json({
                success: true,
                mensaje: 'Reserva eliminada exitosamente'
            });

        } catch (error) {
            console.error('Error eliminando reserva:', error);
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

            // ============================================
            // 📧 BLOQUE DE ENVÍO DE CORREOS - APROBACIÓN
            // ============================================
            
            // Obtener datos completos de la reserva aprobada para enviar el correo
            const [reservasAprobadas] = await db.execute(
                `SELECT r.*, 
                        e.nombre as espacio_nombre, 
                        u.nombre_completo as usuario_nombre,
                        u.email as usuario_email,
                        u.telefono as usuario_telefono,
                        apr.nombre_completo as aprobador_nombre
                FROM reservas r
                LEFT JOIN espacios e ON r.espacio_id = e.id
                LEFT JOIN usuarios u ON r.usuario_id = u.id
                LEFT JOIN usuarios apr ON r.aprobador_id = apr.id
                WHERE r.id = ?`,
                [id]
            );

            if (reservasAprobadas.length > 0) {
                const reservaAprobada = reservasAprobadas[0];
                
                // Obtener recursos asociados a esta reserva
                const [recursos] = await db.execute(
                    `SELECT rr.id, rr.cantidad_solicitada, rr.observaciones,
                            r.nombre as recurso_nombre
                    FROM reservas_recursos rr
                    LEFT JOIN recursos r ON rr.recurso_id = r.id
                    WHERE rr.reserva_id = ?
                    ORDER BY r.nombre ASC`,
                    [id]
                );
                
                // Agregar recursos al objeto de la reserva
                reservaAprobada.recursos = recursos || [];
                
                // ⚙️ Construir lista de destinatarios desde .env
                let emailDestinos = [];
                
                // Agregar correos del .env (departamentos, mantenimiento, etc.)
                if (process.env.CORREOS_NOTIFICACION_RESERVA) {
                    const correosEnv = process.env.CORREOS_NOTIFICACION_RESERVA
                        .split(',')
                        .map(e => e.trim())
                        .filter(e => e.length > 0);
                    emailDestinos = [...emailDestinos, ...correosEnv];
                }
                
                // Agregar email del usuario solicitante (si está habilitado y existe)
                if (process.env.INCLUIR_EMAIL_USUARIO_EN_NOTIFICACION === 'true' && reservaAprobada.usuario_email) {
                    // Evitar duplicados
                    if (!emailDestinos.includes(reservaAprobada.usuario_email)) {
                        emailDestinos.push(reservaAprobada.usuario_email);
                    }
                }
                
                // Enviar solo si hay destinatarios
                if (emailDestinos.length > 0) {
                    try {
                        await enviarCorreoReserva(reservaAprobada, emailDestinos, 'aprobada');
                        console.log(`📧 Correo de aprobación enviado a: ${emailDestinos.join(', ')}`);
                    } catch (emailError) {
                        console.error('⚠️ Error enviando correo de aprobación:', emailError.message);
                        // No interrumpir la respuesta si falla el correo
                    }
                } else {
                    console.log('⚠️ No hay destinatarios configurados para enviar correo de reserva');
                }
            }

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

        // ============================================
        // 📧 BLOQUE DE ENVÍO DE CORREOS - RECHAZO
        // ============================================
        // ⚠️ DE MOMENTO DESHABILITADO - Descomentar si quieres activar
        
        // Obtener datos completos de la reserva rechazada para enviar el correo
        // const [reservasRechazadas] = await db.execute(
        //     `SELECT r.*, 
        //             e.nombre as espacio_nombre, 
        //             u.nombre_completo as usuario_nombre,
        //             u.email as usuario_email,
        //             u.telefono as usuario_telefono,
        //             apr.nombre_completo as aprobador_nombre
        //     FROM reservas r
        //     LEFT JOIN espacios e ON r.espacio_id = e.id
        //     LEFT JOIN usuarios u ON r.usuario_id = u.id
        //     LEFT JOIN usuarios apr ON r.aprobador_id = apr.id
        //     WHERE r.id = ?`,
        //     [id]
        // );

        // if (reservasRechazadas.length > 0) {
        //     const reservaRechazada = reservasRechazadas[0];
        //     
        //     try {
        //         await enviarCorreoReserva(reservaRechazada, [reservaRechazada.usuario_email], 'rechazada');
        //         console.log('📧 Correo de rechazo enviado a:', reservaRechazada.usuario_email);
        //     } catch (emailError) {
        //         console.error('⚠️ Error enviando correo de rechazo:', emailError.message);
        //     }
        // }

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
},

    // Actualizar reserva confirmada
    actualizar: async (req, res) => {
        try {
            const { id } = req.params;
            const { fecha_inicio, fecha_fin, hora_inicio, hora_fin, titulo, descripcion, 
                    motivo, cantidad_participantes, observaciones, participantes_email, 
                    notificar_participantes } = req.body;
            const usuario_id = req.user.id;

            // Verificar que la reserva existe y obtener datos
            const [reservas] = await db.execute(
                `SELECT r.*,
                        DATE_FORMAT(r.fecha_inicio, '%Y-%m-%d') as fecha_inicio_fmt,
                        DATE_FORMAT(r.fecha_fin, '%Y-%m-%d') as fecha_fin_fmt,
                        e.nombre as espacio_nombre,
                        u.nombre_completo as usuario_nombre,
                        u.email as usuario_email
                 FROM reservas r
                 LEFT JOIN espacios e ON r.espacio_id = e.id
                 LEFT JOIN usuarios u ON r.usuario_id = u.id
                 WHERE r.id = ?`,
                [id]
            );

            if (reservas.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Reserva no encontrada'
                });
            }

            const reserva = reservas[0];
            
            // Usar las fechas formateadas para evitar problemas de zona horaria
            reserva.fecha_inicio = reserva.fecha_inicio_fmt;
            reserva.fecha_fin = reserva.fecha_fin_fmt;

            // Solo el creador o admin puede editar
            if (reserva.usuario_id !== usuario_id && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'No tienes permiso para editar esta reserva'
                });
            }

            // Solo se pueden editar reservas confirmadas
            if (reserva.estado !== 'confirmada') {
                return res.status(400).json({
                    success: false,
                    error: 'Solo se pueden editar reservas confirmadas'
                });
            }

            // Validar disponibilidad (excluyendo esta reserva)
            const [conflictos] = await db.execute(
                `SELECT id FROM reservas 
                 WHERE espacio_id = ? 
                 AND estado IN ('pendiente', 'confirmada')
                 AND id != ?
                 AND (
                   (DATE(fecha_inicio) < ? OR (DATE(fecha_inicio) = ? AND TIME(hora_inicio) < ?))
                   AND
                   (DATE(fecha_fin) > ? OR (DATE(fecha_fin) = ? AND TIME(hora_fin) > ?))
                 )`,
                [
                    reserva.espacio_id,
                    id,
                    fecha_fin, fecha_fin, hora_fin,
                    fecha_inicio, fecha_inicio, hora_inicio
                ]
            );

            if (conflictos.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'El espacio no está disponible en las nuevas fechas/horarios'
                });
            }

            // ============================================
            // 📝 GUARDAR HISTORIAL ANTES DE ACTUALIZAR
            // ============================================
            // Normalizar fechas a formato YYYY-MM-DD antes de guardar historial
            const normalizarFecha = (fecha) => {
                if (!fecha) return null;
                // Si ya está en formato YYYY-MM-DD, retornar tal cual
                if (typeof fecha === 'string' && !fecha.includes('T')) {
                    return fecha;
                }
                // Si es formato ISO (2026-02-13T03:00:00.000Z), extraer solo la fecha
                if (typeof fecha === 'string' && fecha.includes('T')) {
                    return fecha.split('T')[0];
                }
                // Si es Date object
                if (fecha instanceof Date) {
                    return fecha.toISOString().split('T')[0];
                }
                return fecha;
            };

            const datosAnteriores = {
                fecha_inicio: normalizarFecha(reserva.fecha_inicio),
                hora_inicio: reserva.hora_inicio,
                fecha_fin: normalizarFecha(reserva.fecha_fin),
                hora_fin: reserva.hora_fin,
                titulo: reserva.titulo,
                descripcion: reserva.descripcion,
                cantidad_participantes: reserva.cantidad_participantes,
                motivo: reserva.motivo
            };

            await guardarHistorialReserva(
                id,
                datosAnteriores,
                'edicion',
                req.user.id,
                `Editada por ${req.user.nombre_completo || req.user.username}`
            );

            // Actualizar la reserva
            await db.execute(
                `UPDATE reservas 
                 SET fecha_inicio = ?, fecha_fin = ?, hora_inicio = ?, hora_fin = ?, 
                     titulo = ?, descripcion = ?, motivo = ?, cantidad_participantes = ?,
                     observaciones = ?, participantes_email = ?, notificar_participantes = ?
                 WHERE id = ?`,
                [fecha_inicio, fecha_fin, hora_inicio, hora_fin, titulo, descripcion, 
                 motivo, cantidad_participantes, observaciones, participantes_email, 
                 notificar_participantes, id]
            );

            // ============================================
            // 📧 ENVIAR CORREO DE EDICIÓN (asincronamente)
            // ============================================
            // Obtener recursos de la reserva
            const [recursos] = await db.execute(
                `SELECT rr.id, rr.cantidad_solicitada, rr.observaciones,
                        r.id as recurso_id, r.nombre
                FROM reservas_recursos rr
                LEFT JOIN recursos r ON rr.recurso_id = r.id
                WHERE rr.reserva_id = ?
                ORDER BY r.nombre ASC`,
                [id]
            );

            // Preparar objeto de reserva actualizada para envío de correo
            const reservaActualizada = {
                ...reserva,
                fecha_inicio,
                fecha_fin,
                hora_inicio,
                hora_fin,
                titulo,
                descripcion,
                cantidad_participantes,
                motivo,
                observaciones,
                participantes_email,
                notificar_participantes,
                recursos: recursos || []
            };

            // Construir lista de destinatarios
            let emailDestinos = [];
            
            if (process.env.CORREOS_NOTIFICACION_RESERVA) {
                const correosEnv = process.env.CORREOS_NOTIFICACION_RESERVA
                    .split(',')
                    .map(e => e.trim())
                    .filter(e => e.length > 0);
                emailDestinos = [...emailDestinos, ...correosEnv];
            }
            
            if (reservaActualizada.usuario_email && !emailDestinos.includes(reservaActualizada.usuario_email)) {
                emailDestinos.push(reservaActualizada.usuario_email);
            }

            // Enviar correo sin bloquear la respuesta
            if (emailDestinos.length > 0) {
                enviarCorreoEdicionReserva(
                    reservaActualizada,
                    datosAnteriores,
                    emailDestinos,
                    req.user.nombre_completo || req.user.username
                ).catch(err => {
                    console.error('⚠️ Error enviando correo de edición:', err.message);
                });
            }

            res.json({
                success: true,
                mensaje: 'Reserva actualizada exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando reserva:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
}
};



module.exports = reservasController;