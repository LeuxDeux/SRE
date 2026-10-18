const db = require('../config/database');
const registrarAuditoriaReservas = require('../utils/auditoriaReservas');
const { enviarCorreoReserva, enviarCorreoEdicionReserva, enviarCorreoCancelacionReserva, enviarPDFPorCorreo } = require('../utils/emailService');
const { notificarEventoAprobado } = require('./eventosController');
const { obtenerReglasAprobacion, puedeAprobarArea } = require('../utils/aprobaciones');
const registrarAuditoriaEventos = require('../utils/auditoriaEventos');

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

const obtenerUsuarioActivo = async (usuarioId) => {
    const [usuarios] = await db.execute(
        'SELECT id, role, secretaria_id FROM usuarios WHERE id = ? AND activo = 1',
        [usuarioId]
    );
    return usuarios[0] || null;
};

const crearEventoDesdeReserva = async (reservaCreada, usuario, datosEventoExtra = {}) => {
    try {
        const nombreEvento = reservaCreada.titulo?.trim() || `Evento generado desde ${reservaCreada.numero_reserva}`;
        const descripcionEvento = reservaCreada.descripcion?.trim()
            ? `${reservaCreada.descripcion}\n\nCreado automáticamente desde la reserva ${reservaCreada.numero_reserva}`
            : `Creado automáticamente desde la reserva ${reservaCreada.numero_reserva}`;

        const secretariaValor = usuario?.secretaria || 'Secretaria Administrativa';
        const lugarEvento = reservaCreada.espacio_nombre || null;
        const observacionesBase = `Creado automáticamente desde la reserva ${reservaCreada.numero_reserva}. Motivo: ${reservaCreada.motivo || 'sin especificar'}.`;
        const observacionesEvento = [observacionesBase, datosEventoExtra.observaciones_evento].filter(Boolean).join('\n');

        const categoriaIdNumerico = datosEventoExtra.categoria_id ? Number(datosEventoExtra.categoria_id) : null;

        // Un usuario normal no publica eventos directamente: el evento nace
        // pendiente y se resuelve junto con la reserva. Admin/secretaria publican directo.
        const esUsuarioNormal = usuario?.role === 'usuario';
        const estadoAprobacion = esUsuarioNormal ? 'pendiente' : 'no_requerida';
        const secretariaResponsable = esUsuarioNormal ? (usuario?.secretaria_id ?? null) : null;

        const [result] = await db.execute(
            `INSERT INTO eventos (
                nombre, fecha_evento, fecha_fin, descripcion, categoria_id, usuario_id, secretaria,
                correo_contacto, telefono, hora_inicio, hora_fin, lugar, publico_destinatario, observaciones,
                estado_aprobacion, secretaria_id_responsable, reserva_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
            [
                nombreEvento,
                reservaCreada.fecha_inicio,
                reservaCreada.fecha_fin || reservaCreada.fecha_inicio,
                descripcionEvento,
                categoriaIdNumerico,
                reservaCreada.usuario_id,
                secretariaValor,
                datosEventoExtra.correo_contacto || null,
                datosEventoExtra.telefono || null,
                reservaCreada.hora_inicio || null,
                reservaCreada.hora_fin || null,
                lugarEvento,
                datosEventoExtra.publico_destinatario || null,
                observacionesEvento || null,
                estadoAprobacion,
                secretariaResponsable,
                reservaCreada.id
            ]
        );

        return { ok: true, eventoId: result.insertId, estadoAprobacion };
    } catch (error) {
        console.error('⚠️ Error creando evento desde reserva:', error.message);
        return { ok: false, error: error.message };
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
         AND fecha_eliminacion IS NULL
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
            const usuario = await obtenerUsuarioActivo(req.user.id);
            if (!usuario) {
                return res.status(401).json({ error: 'Usuario no válido' });
            }

            const [reservas] = await db.execute(
                `SELECT r.*, e.nombre as espacio_nombre,
                    u.secretaria_id AS secretaria_id,
                        u.nombre_completo as usuario_nombre,
                        apr.nombre_completo as aprobador_nombre
                FROM reservas r 
                JOIN espacios e ON r.espacio_id = e.id 
                JOIN usuarios u ON r.usuario_id = u.id 
                LEFT JOIN usuarios apr ON r.aprobador_id = apr.id
                WHERE r.fecha_eliminacion IS NULL
                ORDER BY r.fecha_solicitud DESC`
            );

            // Reglas de aprobación (área propia + cruces + aprueba todo)
            const reglas = await obtenerReglasAprobacion();

            // Obtener recursos para cada reserva
            const reservasConRecursos = await Promise.all(
                reservas.map(async (reserva) => {
                    const [recursos] = await db.execute(
                        `SELECT rr.id as reserva_recurso_id, 
                                rr.cantidad_solicitada, rr.observaciones,
                                r.id, r.nombre, 
                                COALESCE(er.cantidad_maxima, r.cantidad_total) as cantidad_maxima
                        FROM reservas_recursos rr
                        LEFT JOIN recursos r ON rr.recurso_id = r.id
                        LEFT JOIN espacios_recursos er ON er.espacio_id = ? AND er.recurso_id = r.id
                        WHERE rr.reserva_id = ?
                        ORDER BY r.nombre ASC`,
                        [reserva.espacio_id, reserva.id]
                    );
                    const puedeAprobar = usuario.role === 'admin'
                        || (usuario.role === 'secretaria'
                            && puedeAprobarArea(usuario.secretaria_id, reserva.secretaria_id, reglas));
                    return {
                        ...reserva,
                        recursos: recursos || [],
                        puede_aprobar: puedeAprobar ? 1 : 0
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
        const { espacio_id, fecha_inicio, hora_inicio, fecha_fin, hora_fin, titulo, descripcion, motivo, cantidad_participantes, participantes_email, observaciones, registrar_como_evento, crear_evento, categoria_id, correo_contacto, telefono, publico_destinatario, observaciones_evento } = req.body;
        const usuario_id = req.user.id;
        const usuarioActual = await obtenerUsuarioActivo(usuario_id);
        if (!usuarioActual) {
            return res.status(401).json({ success: false, error: 'Usuario no válido' });
        }
        const debeCrearEvento = Boolean(registrar_como_evento || crear_evento);

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

        // Validar disponibilidad - Considerando FECHAS y HORAS
        const [conflictos] = await db.execute(
            `SELECT id FROM reservas 
             WHERE espacio_id = ? 
             AND estado IN ('pendiente', 'confirmada')
             AND fecha_eliminacion IS NULL
             AND (
                (DATE(fecha_inicio) < ? OR (DATE(fecha_inicio) = ? AND TIME(hora_inicio) < ?))
                AND
                (DATE(fecha_fin) > ? OR (DATE(fecha_fin) = ? AND TIME(hora_fin) > ?))
             )`,
            [espacio_id, fecha_fin, fecha_fin, hora_fin, fecha_inicio, fecha_inicio, hora_inicio]
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
        const esAprobador = ['admin', 'secretaria'].includes(usuarioActual.role);
        const estado = esAprobador || !espacio.requiere_aprobacion ? 'confirmada' : 'pendiente';

        // Validar antelación de categoría si se va a crear evento
        if (debeCrearEvento && categoria_id) {
            const [categorias] = await db.execute(
                'SELECT id, nombre, dias_antelacion FROM categorias WHERE id = ? AND activa = TRUE',
                [categoria_id]
            );

            if (categorias.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'La categoría seleccionada no existe o no está activa.'
                });
            }

            const categoria = categorias[0];
            const fechaInicio = new Date(fecha_inicio);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const diasNecesarios = Math.max(0, categoria.dias_antelacion - 1);
            const fechaMinima = new Date(hoy);
            fechaMinima.setDate(hoy.getDate() + diasNecesarios);

            if (fechaInicio < fechaMinima) {
                return res.status(400).json({
                    success: false,
                    error: `La categoría ${categoria.nombre} requiere al menos ${categoria.dias_antelacion} días de antelación. Fecha mínima permitida: ${fechaMinima.toISOString().split('T')[0]}`
                });
            }
        }

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
        await registrarAuditoriaReservas({
            req,
            accion: estado === 'confirmada' && esAprobador ? 'auto_confirmacion_creacion' : 'crear',
            entidadTipo: 'reserva',
            entidadId: result.insertId,
            reservaId: result.insertId,
            secretariaId: usuarioActual.secretaria_id,
            datosNuevos: {
                numero_reserva,
                estado,
                espacio_id,
                fecha_inicio,
                hora_inicio,
                fecha_fin,
                hora_fin,
                titulo,
                motivo: motivo_final,
                cantidad_participantes: cantidad_final,
                recursos_solicitados: (req.body.recursos_solicitados || []).map((recurso) => ({
                    recurso_id: recurso.recurso_id,
                    cantidad_solicitada: recurso.cantidad_solicitada,
                })),
                registrar_como_evento: debeCrearEvento,
            },
        });

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
        // � OBTENER DATOS COMPLETOS DE LA RESERVA
        // ============================================
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

        let eventoCreado = false;
        let eventoId = null;
        let eventoError = null;
        let eventoPendiente = false;

        if (reservasCreadas.length > 0) {
            const reservaCreada = reservasCreadas[0];

            if (debeCrearEvento) {
                const eventoResult = await crearEventoDesdeReserva(reservaCreada, req.user, {
                    categoria_id,
                    correo_contacto,
                    telefono,
                    publico_destinatario,
                    observaciones_evento
                });
                if (eventoResult.ok) {
                    eventoCreado = true;
                    eventoId = eventoResult.eventoId;
                    eventoPendiente = eventoResult.estadoAprobacion === 'pendiente';

                    // Enviar correo del evento solo si quedó publicado.
                    // Si nace pendiente, el correo se envía al aprobar la reserva.
                    if (!eventoPendiente) try {
                        const [eventoParaEmail] = await db.execute(
                            `
                            SELECT e.*, c.nombre as categoria_nombre, c.color as categoria_color,
                                   GROUP_CONCAT(ce.email) as categoria_emails,
                                   u.nombre_completo as usuario_nombre
                            FROM eventos e
                            LEFT JOIN categorias c ON e.categoria_id = c.id
                            LEFT JOIN categorias_emails ce ON c.id = ce.categoria_id
                            LEFT JOIN usuarios u ON e.usuario_id = u.id
                            WHERE e.id = ?
                            GROUP BY e.id
                        `,
                            [eventoId]
                        );

                        if (eventoParaEmail.length > 0) {
                            const evento = eventoParaEmail[0];
                            const correoSecretaria = process.env.CORREO_SECRETARIA_PRINCIPAL;
                            const correoAdicional = process.env.CORREO_ADICIONAL?.trim();

                            const correosDestino = [];
                            if (correoSecretaria) correosDestino.push(correoSecretaria);
                            if (correoAdicional && correoAdicional !== correoSecretaria) {
                                correosDestino.push(correoAdicional);
                            }

                            if (evento.categoria_emails) {
                                const emailsCategoria = evento.categoria_emails
                                    .split(',')
                                    .map(e => e.trim())
                                    .filter(e => e && !correosDestino.includes(e));
                                correosDestino.push(...emailsCategoria);
                            }

                            if (correosDestino.length > 0) {
                                const [archivosEvento] = await db.execute(
                                    `SELECT nombre_archivo, archivo_path FROM eventos_archivos WHERE evento_id = ? ORDER BY fecha_carga ASC`,
                                    [eventoId]
                                );
                                await enviarPDFPorCorreo(evento, correosDestino, 'creado', archivosEvento);
                                console.log(`✅ Email de evento creado enviado a: ${correosDestino.join(', ')}`);
                            } else {
                                console.log('⚠️ No hay correos configurados para enviar notificación de evento');
                            }
                        }
                    } catch (emailError) {
                        console.error('⚠️ Error enviando correo automático de evento:', emailError.message);
                    }
                } else {
                    eventoError = eventoResult.error;
                    console.warn('⚠️ No se pudo crear el evento desde la reserva:', eventoError);
                }
            }
            
            // Obtener recursos asociados a esta reserva
            const [recursos] = await db.execute(
                `SELECT rr.id as reserva_recurso_id, rr.cantidad_solicitada, rr.observaciones,
                        r.id, r.nombre, 
                        COALESCE(er.cantidad_maxima, r.cantidad_total) as cantidad_maxima
                FROM reservas_recursos rr
                LEFT JOIN recursos r ON rr.recurso_id = r.id
                LEFT JOIN espacios_recursos er ON er.espacio_id = ? AND er.recurso_id = r.id
                WHERE rr.reserva_id = ?
                ORDER BY r.nombre ASC`,
                [reservaCreada.espacio_id, result.insertId]
            );
            
            // Agregar recursos al objeto de la reserva
            reservaCreada.recursos = recursos || [];
            
            // 📨 CONDICIÓN: Solo enviar correo si la reserva está CONFIRMADA
            // (es decir, no requería aprobación o ya fue aprobada)
            if (reservaCreada.estado === 'confirmada') {
                // ⚙️ Construir lista de destinatarios desde .env y espacios
                let emailDestinos = [];
                
                // Agregar correos del .env (departamentos, mantenimiento, etc.)
                if (process.env.CORREOS_NOTIFICACION_RESERVA) {
                    const correosEnv = process.env.CORREOS_NOTIFICACION_RESERVA
                        .split(',')
                        .map(e => e.trim())
                        .filter(e => e.length > 0);
                    emailDestinos = [...emailDestinos, ...correosEnv];
                }

                // Agregar emails del espacio
                try {
                    const [emailsEspacio] = await db.execute(
                        `SELECT email FROM espacios_emails WHERE espacio_id = ?`,
                        [reservaCreada.espacio_id]
                    );
                    
                    if (emailsEspacio && emailsEspacio.length > 0) {
                        const correosEspacio = emailsEspacio
                            .map(e => e.email.trim())
                            .filter(e => e.length > 0);
                        emailDestinos = [...emailDestinos, ...correosEspacio];
                    }
                } catch (emailEspacioError) {
                    console.warn('⚠️ Error obteniendo emails del espacio:', emailEspacioError.message);
                }
                
                // Agregar email del usuario solicitante (si está habilitado y existe)
                if (process.env.INCLUIR_EMAIL_USUARIO_EN_NOTIFICACION === 'true' && reservaCreada.usuario_email) {
                    // Evitar duplicados
                    if (!emailDestinos.includes(reservaCreada.usuario_email)) {
                        emailDestinos.push(reservaCreada.usuario_email);
                    }
                }

                // Eliminar duplicados
                emailDestinos = [...new Set(emailDestinos)];
                
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

        const mensajeReserva = debeCrearEvento
            ? (eventoCreado
                ? (eventoPendiente
                    ? 'Reserva creada (pendiente de aprobación). El evento asociado se publicará al aprobar la reserva'
                    : 'Reserva creada exitosamente y registrada como evento a comunicar')
                : 'Reserva creada exitosamente, pero no se pudo registrar como evento a comunicar')
            : `Reserva creada exitosamente${espacio.requiere_aprobacion ? ' (pendiente de aprobación)' : ' (confirmada automáticamente)'}`;

        res.status(201).json({
            success: true,
            message: mensajeReserva,
            reserva: {
                id: result.insertId,
                numero_reserva,
                estado,
                evento_creado: eventoCreado,
                evento_id: eventoId,
                evento_pendiente: eventoPendiente,
                evento_error: eventoError
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
                `SELECT r.*, e.nombre as espacio_nombre, u.secretaria_id AS secretaria_id_responsable,
                        u.nombre_completo as usuario_nombre, u.email as usuario_email
                FROM reservas r
                JOIN espacios e ON r.espacio_id = e.id
                JOIN usuarios u ON r.usuario_id = u.id
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
            await registrarAuditoriaReservas({
                req,
                accion: 'cancelar',
                entidadTipo: 'reserva',
                entidadId: reserva.id,
                reservaId: reserva.id,
                secretariaId: reserva.secretaria_id_responsable,
                datosAnteriores: { estado: reserva.estado },
                datosNuevos: { estado: 'cancelada' },
            });

            // ============================================
            // 📧 ENVIAR CORREO DE CANCELACIÓN
            // ============================================
            try {
                let emailDestinos = [];

                // Agregar email del usuario solicitante
                if (reserva.usuario_email) {
                    emailDestinos.push(reserva.usuario_email);
                }

                // Agregar emails de participantes (si los hay)
                if (reserva.participantes_email) {
                    const participantes = reserva.participantes_email
                        .split(',')
                        .map(e => e.trim())
                        .filter(e => e.length > 0);
                    emailDestinos = [...emailDestinos, ...participantes];
                }

                // Agregar emails del espacio
                try {
                    const [emailsEspacio] = await db.execute(
                        `SELECT email FROM espacios_emails WHERE espacio_id = ?`,
                        [reserva.espacio_id]
                    );
                    
                    if (emailsEspacio && emailsEspacio.length > 0) {
                        const correosEspacio = emailsEspacio
                            .map(e => e.email.trim())
                            .filter(e => e.length > 0);
                        emailDestinos = [...emailDestinos, ...correosEspacio];
                    }
                } catch (emailEspacioError) {
                    console.warn('⚠️ Error obteniendo emails del espacio:', emailEspacioError.message);
                }

                // Agregar emails del .env (departamentos, administración)
                if (process.env.CORREOS_NOTIFICACION_RESERVA) {
                    const correosEnv = process.env.CORREOS_NOTIFICACION_RESERVA
                        .split(',')
                        .map(e => e.trim())
                        .filter(e => e.length > 0);
                    emailDestinos = [...emailDestinos, ...correosEnv];
                }

                // Eliminar duplicados
                emailDestinos = [...new Set(emailDestinos)];

                // Enviar solo si hay destinatarios
                if (emailDestinos.length > 0) {
                    await enviarCorreoCancelacionReserva(reserva, emailDestinos);
                    console.log(`📧 Correo de cancelación enviado a: ${emailDestinos.join(', ')}`);
                }
            } catch (emailError) {
                console.error('⚠️ Error enviando correo de cancelación:', emailError.message);
                // No interrumpir la respuesta si falla el correo
            }

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
                `SELECT r.*, u.secretaria_id AS secretaria_id_responsable
                 FROM reservas r
                 JOIN usuarios u ON u.id = r.usuario_id
                 WHERE r.id = ? AND r.fecha_eliminacion IS NULL`,
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
            await registrarAuditoriaReservas({
                req,
                accion: 'eliminar_logico',
                entidadTipo: 'reserva',
                entidadId: reserva.id,
                reservaId: reserva.id,
                secretariaId: reserva.secretaria_id_responsable,
                datosAnteriores,
                datosNuevos: { fecha_eliminacion: true },
            });

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
            const usuario = await obtenerUsuarioActivo(req.user.id);
            if (!usuario) {
                return res.status(401).json({ success: false, error: 'Usuario no válido' });
            }
            if (!['admin', 'secretaria'].includes(usuario.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'No tienes permisos para aprobar reservas'
                });
            }
            if (usuario.role === 'secretaria' && !usuario.secretaria_id) {
                return res.status(403).json({ success: false, error: 'Tu usuario no tiene una secretaría asignada' });
            }

            // Verificar que la reserva existe y está pendiente
            const [reservas] = await db.execute(
                `SELECT r.*,
                    solicitante.secretaria_id AS secretaria_id_responsable
                 FROM reservas r
                 JOIN usuarios solicitante ON solicitante.id = r.usuario_id
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

            if (usuario.role === 'secretaria') {
                const reglas = await obtenerReglasAprobacion();
                if (!puedeAprobarArea(usuario.secretaria_id, reserva.secretaria_id_responsable, reglas)) {
                    return res.status(403).json({ success: false, error: 'La reserva pertenece a un área que no podés aprobar' });
                }
            }

            if (reserva.estado !== 'pendiente') {
                return res.status(400).json({
                    success: false,
                    error: 'Solo se pueden aprobar reservas pendientes'
                });
            }

            const hoyAprob = new Date();
            hoyAprob.setHours(0, 0, 0, 0);
            if (new Date(reserva.fecha_fin || reserva.fecha_inicio) < hoyAprob) {
                return res.status(400).json({
                    success: false,
                    error: 'La reserva está vencida y ya no puede aprobarse'
                });
            }

            // Aprobar la reserva
            await db.execute(
                `UPDATE reservas SET estado = 'confirmada', aprobador_id = ?, fecha_aprobacion = NOW() WHERE id = ?`,
                [usuario.id, id]
            );
            await guardarHistorialReserva(
                id,
                { estado: reserva.estado, aprobador_id: reserva.aprobador_id },
                'aprobacion',
                usuario.id,
                'Reserva aprobada'
            );
            await registrarAuditoriaReservas({
                req,
                accion: 'aprobar',
                entidadTipo: 'reserva',
                entidadId: reserva.id,
                reservaId: reserva.id,
                secretariaId: reserva.secretaria_id_responsable,
                datosAnteriores: { estado: reserva.estado, aprobador_id: reserva.aprobador_id },
                datosNuevos: { estado: 'confirmada', aprobador_id: usuario.id, fecha_aprobacion: new Date().toISOString() },
            });

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
                    `SELECT rr.id as reserva_recurso_id, rr.cantidad_solicitada, rr.observaciones,
                            r.id, r.nombre, 
                            COALESCE(er.cantidad_maxima, r.cantidad_total) as cantidad_maxima
                    FROM reservas_recursos rr
                    LEFT JOIN recursos r ON rr.recurso_id = r.id
                    LEFT JOIN espacios_recursos er ON er.espacio_id = ? AND er.recurso_id = r.id
                    WHERE rr.reserva_id = ?
                    ORDER BY r.nombre ASC`,
                    [reserva.espacio_id, id]
                );
                
                // Agregar recursos al objeto de la reserva
                reservaAprobada.recursos = recursos || [];
                
                // ⚙️ Construir lista de destinatarios desde .env y espacios
                let emailDestinos = [];
                
                // Agregar correos del .env (departamentos, mantenimiento, etc.)
                if (process.env.CORREOS_NOTIFICACION_RESERVA) {
                    const correosEnv = process.env.CORREOS_NOTIFICACION_RESERVA
                        .split(',')
                        .map(e => e.trim())
                        .filter(e => e.length > 0);
                    emailDestinos = [...emailDestinos, ...correosEnv];
                }

                // Agregar emails del espacio
                try {
                    const [emailsEspacio] = await db.execute(
                        `SELECT email FROM espacios_emails WHERE espacio_id = ?`,
                        [reservaAprobada.espacio_id]
                    );
                    
                    if (emailsEspacio && emailsEspacio.length > 0) {
                        const correosEspacio = emailsEspacio
                            .map(e => e.email.trim())
                            .filter(e => e.length > 0);
                        emailDestinos = [...emailDestinos, ...correosEspacio];
                    }
                } catch (emailEspacioError) {
                    console.warn('⚠️ Error obteniendo emails del espacio:', emailEspacioError.message);
                }
                
                // Agregar email del usuario solicitante (si está habilitado y existe)
                if (process.env.INCLUIR_EMAIL_USUARIO_EN_NOTIFICACION === 'true' && reservaAprobada.usuario_email) {
                    // Evitar duplicados
                    if (!emailDestinos.includes(reservaAprobada.usuario_email)) {
                        emailDestinos.push(reservaAprobada.usuario_email);
                    }
                }

                // Eliminar duplicados
                emailDestinos = [...new Set(emailDestinos)];
                
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

            // Aprobar el evento vinculado (si la reserva se registró como evento).
            // La reserva es la fuente de verdad: al confirmarla se publica el evento.
            try {
                const [eventosVinculados] = await db.execute(
                    `SELECT id FROM eventos WHERE reserva_id = ? AND estado_aprobacion = 'pendiente'`,
                    [id]
                );
                if (eventosVinculados.length > 0) {
                    const eventoVinculadoId = eventosVinculados[0].id;
                    await db.execute(
                        `UPDATE eventos
                         SET estado_aprobacion = 'aprobada', resuelto_por = ?, resuelto_at = CURRENT_TIMESTAMP, motivo_rechazo = NULL
                         WHERE id = ? AND estado_aprobacion = 'pendiente'`,
                        [usuario.id, eventoVinculadoId]
                    );
                    await db.execute(
                        `INSERT INTO historial_eventos (evento_id, usuario_id, accion, cambios, valores_viejos, valores_nuevos)
                         VALUES (?, ?, 'actualizado', ?, ?, ?)`,
                        [
                            eventoVinculadoId,
                            usuario.id,
                            JSON.stringify(['Evento aprobado automáticamente al aprobar la reserva']),
                            JSON.stringify({ estado_aprobacion: 'pendiente' }),
                            JSON.stringify({ estado_aprobacion: 'aprobada' }),
                        ]
                    );
                    await notificarEventoAprobado(eventoVinculadoId);
                    await registrarAuditoriaEventos({
                        req,
                        accion: 'aprobar',
                        entidadTipo: 'evento',
                        entidadId: eventoVinculadoId,
                        eventoId: eventoVinculadoId,
                        reservaId: Number(id),
                        datosAnteriores: { estado_aprobacion: 'pendiente' },
                        datosNuevos: { estado_aprobacion: 'aprobada' },
                    });
                }
            } catch (eventoError) {
                console.error('⚠️ Error aprobando evento vinculado a la reserva:', eventoError.message);
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
        const usuario = await obtenerUsuarioActivo(req.user.id);
        if (!usuario) {
            return res.status(401).json({ success: false, error: 'Usuario no válido' });
        }

        // Obtener detalles de la reserva con JOINs
        const [reservas] = await db.execute(
        `SELECT r.*, 
                e.nombre as espacio_nombre, 
                e.capacidad,
                e.ubicacion,
                e.estado as espacio_estado,
                e.requiere_aprobacion as espacio_requiere_aprobacion,
                u.secretaria_id as secretaria_id_responsable,
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
        const usuario = await obtenerUsuarioActivo(req.user.id);
        if (!usuario) {
            return res.status(401).json({ success: false, error: 'Usuario no válido' });
        }
        if (!['admin', 'secretaria'].includes(usuario.role)) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para rechazar reservas'
            });
        }
        if (usuario.role === 'secretaria' && !usuario.secretaria_id) {
            return res.status(403).json({ success: false, error: 'Tu usuario no tiene una secretaría asignada' });
        }

        // Verificar que la reserva existe y está pendiente
        const [reservas] = await db.execute(
                `SELECT r.*,
                    solicitante.secretaria_id AS secretaria_id_responsable
             FROM reservas r
                 JOIN usuarios solicitante ON solicitante.id = r.usuario_id
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

        if (usuario.role === 'secretaria') {
            const reglas = await obtenerReglasAprobacion();
            if (!puedeAprobarArea(usuario.secretaria_id, reserva.secretaria_id_responsable, reglas)) {
                return res.status(403).json({ success: false, error: 'La reserva pertenece a un área que no podés aprobar' });
            }
        }

        if (reserva.estado !== 'pendiente') {
            return res.status(400).json({
                success: false,
                error: 'Solo se pueden rechazar reservas pendientes'
            });
        }

        const hoyRech = new Date();
        hoyRech.setHours(0, 0, 0, 0);
        if (new Date(reserva.fecha_fin || reserva.fecha_inicio) < hoyRech) {
            return res.status(400).json({
                success: false,
                error: 'La reserva está vencida y ya no puede rechazarse'
            });
        }

        // Rechazar la reserva
        await db.execute(
            `UPDATE reservas SET estado = 'rechazada', aprobador_id = ? WHERE id = ?`,
            [usuario.id, id]
        );
        await guardarHistorialReserva(
            id,
            { estado: reserva.estado, aprobador_id: reserva.aprobador_id },
            'rechazo',
            usuario.id,
            'Reserva rechazada'
        );
        await registrarAuditoriaReservas({
            req,
            accion: 'rechazar',
            entidadTipo: 'reserva',
            entidadId: reserva.id,
            reservaId: reserva.id,
            secretariaId: reserva.secretaria_id_responsable,
            datosAnteriores: { estado: reserva.estado, aprobador_id: reserva.aprobador_id },
            datosNuevos: { estado: 'rechazada', aprobador_id: usuario.id },
        });

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

        // Rechazar el evento vinculado (si existe y está pendiente).
        try {
            const [eventosVinculados] = await db.execute(
                `SELECT id FROM eventos WHERE reserva_id = ? AND estado_aprobacion = 'pendiente'`,
                [id]
            );
            if (eventosVinculados.length > 0) {
                const eventoVinculadoId = eventosVinculados[0].id;
                await db.execute(
                    `UPDATE eventos
                     SET estado_aprobacion = 'rechazada', resuelto_por = ?, resuelto_at = CURRENT_TIMESTAMP, motivo_rechazo = ?
                     WHERE id = ? AND estado_aprobacion = 'pendiente'`,
                    [usuario.id, 'Reserva rechazada', eventoVinculadoId]
                );
                await db.execute(
                    `INSERT INTO historial_eventos (evento_id, usuario_id, accion, cambios, valores_viejos, valores_nuevos)
                     VALUES (?, ?, 'actualizado', ?, ?, ?)`,
                    [
                        eventoVinculadoId,
                        usuario.id,
                        JSON.stringify(['Evento rechazado automáticamente al rechazar la reserva']),
                        JSON.stringify({ estado_aprobacion: 'pendiente' }),
                        JSON.stringify({ estado_aprobacion: 'rechazada', motivo_rechazo: 'Reserva rechazada' }),
                    ]
                );
                await registrarAuditoriaEventos({
                    req,
                    accion: 'rechazar',
                    entidadTipo: 'evento',
                    entidadId: eventoVinculadoId,
                    eventoId: eventoVinculadoId,
                    reservaId: Number(id),
                    datosAnteriores: { estado_aprobacion: 'pendiente' },
                    datosNuevos: { estado_aprobacion: 'rechazada', motivo_rechazo: 'Reserva rechazada' },
                });
            }
        } catch (eventoError) {
            console.error('⚠️ Error rechazando evento vinculado a la reserva:', eventoError.message);
        }

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
                    notificar_participantes, recursos_solicitados } = req.body;
            const usuario_id = req.user.id;

            // Verificar que la reserva existe y obtener datos
            const [reservas] = await db.execute(
                `SELECT r.*,
                        DATE_FORMAT(r.fecha_inicio, '%Y-%m-%d') as fecha_inicio_fmt,
                        DATE_FORMAT(r.fecha_fin, '%Y-%m-%d') as fecha_fin_fmt,
                        e.nombre as espacio_nombre,
                        u.secretaria_id as secretaria_id_responsable,
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

            // Solo se pueden editar reservas confirmadas o pendientes
            if (reserva.estado !== 'confirmada' && reserva.estado !== 'pendiente') {
                return res.status(400).json({
                    success: false,
                    error: 'Solo se pueden editar reservas confirmadas o pendientes'
                });
            }

            // Validar disponibilidad (excluyendo esta reserva)
            const [conflictos] = await db.execute(
                `SELECT id FROM reservas 
                 WHERE espacio_id = ? 
                 AND estado IN ('pendiente', 'confirmada')
                 AND id != ?
                 AND fecha_eliminacion IS NULL
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

            let recursosAuditadosAntes = [];
            let recursosAuditadosDespues = [];
            if (Array.isArray(recursos_solicitados)) {
                const [recursosAnteriores] = await db.execute(
                    `SELECT rr.recurso_id, r.nombre AS recurso_nombre,
                        rr.cantidad_solicitada
                     FROM reservas_recursos rr
                     JOIN recursos r ON r.id = rr.recurso_id
                     WHERE rr.reserva_id = ?
                     ORDER BY r.nombre`,
                    [id],
                );
                recursosAuditadosAntes = recursosAnteriores;

                const recursosConCantidad = recursos_solicitados.filter(
                    (recurso) => recurso.recurso_id && Number(recurso.cantidad_solicitada) > 0,
                );
                const idsRecursos = [...new Set(recursosConCantidad.map((recurso) => Number(recurso.recurso_id)))];
                if (idsRecursos.length > 0) {
                    const placeholders = idsRecursos.map(() => '?').join(',');
                    const [nombresRecursos] = await db.execute(
                        `SELECT id, nombre FROM recursos WHERE id IN (${placeholders})`,
                        idsRecursos,
                    );
                    const nombresPorId = new Map(nombresRecursos.map((recurso) => [Number(recurso.id), recurso.nombre]));
                    recursosAuditadosDespues = recursosConCantidad.map((recurso) => ({
                        recurso_id: Number(recurso.recurso_id),
                        recurso_nombre: nombresPorId.get(Number(recurso.recurso_id)) || `Recurso ${recurso.recurso_id}`,
                        cantidad_solicitada: Number(recurso.cantidad_solicitada),
                    }));
                }
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
            if (Array.isArray(recursos_solicitados)) {
                datosAnteriores.recursos_solicitados = recursosAuditadosAntes;
            }

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
            // � ACTUALIZAR RECURSOS DE LA RESERVA
            // ============================================
            if (recursos_solicitados && Array.isArray(recursos_solicitados)) {
                let conn;
                try {
                    conn = await db.getConnection();
                    await conn.beginTransaction();

                    // Eliminar recursos anteriores
                    await conn.execute(
                        'DELETE FROM reservas_recursos WHERE reserva_id = ?',
                        [id]
                    );

                    // Insertar nuevos recursos
                    for (const recurso of recursos_solicitados) {
                        if (recurso.recurso_id && recurso.cantidad_solicitada) {
                            await conn.execute(
                                `INSERT INTO reservas_recursos (reserva_id, recurso_id, cantidad_solicitada, observaciones)
                                 VALUES (?, ?, ?, ?)`,
                                [id, recurso.recurso_id, recurso.cantidad_solicitada, recurso.observaciones || null]
                            );
                        }
                    }

                    await conn.commit();
                    console.log(`Recursos actualizados para reserva ${id}`);
                } catch (recursoError) {
                    if (conn) {
                        try {
                            await conn.rollback();
                            console.log(`Transacción revertida por error en recursos`);
                        } catch (rollbackErr) {
                            console.error('Error en rollback:', rollbackErr.message);
                        }
                    }
                    console.error('Error actualizando recursos:', recursoError.message);
                    // No bloquear la actualización de la reserva si hay error con recursos
                } finally {
                    if (conn) {
                        conn.release();
                    }
                }
            }

            if (Array.isArray(recursos_solicitados)) {
                const [recursosPersistidos] = await db.execute(
                    `SELECT rr.recurso_id, r.nombre AS recurso_nombre, rr.cantidad_solicitada
                     FROM reservas_recursos rr
                     JOIN recursos r ON r.id = rr.recurso_id
                     WHERE rr.reserva_id = ?
                     ORDER BY r.nombre`,
                    [id],
                );
                recursosAuditadosDespues = recursosPersistidos;
            }

            await registrarAuditoriaReservas({
                req,
                accion: 'editar',
                entidadTipo: 'reserva',
                entidadId: reserva.id,
                reservaId: reserva.id,
                secretariaId: reserva.secretaria_id_responsable,
                datosAnteriores,
                datosNuevos: {
                    fecha_inicio: normalizarFecha(fecha_inicio),
                    hora_inicio,
                    fecha_fin: normalizarFecha(fecha_fin),
                    hora_fin,
                    titulo,
                    descripcion,
                    motivo,
                    cantidad_participantes,
                    notificar_participantes: Boolean(notificar_participantes),
                    recursos_solicitados: Array.isArray(recursos_solicitados)
                        ? recursosAuditadosDespues
                        : undefined,
                },
            });

            // ============================================
            // �📧 ENVIAR CORREO DE EDICIÓN (asincronamente)
            // ============================================
            // Obtener recursos de la reserva
            const [recursos] = await db.execute(
                `SELECT rr.id as reserva_recurso_id, rr.cantidad_solicitada, rr.observaciones,
                        r.id, r.nombre, 
                        COALESCE(er.cantidad_maxima, r.cantidad_total) as cantidad_maxima
                FROM reservas_recursos rr
                LEFT JOIN recursos r ON rr.recurso_id = r.id
                LEFT JOIN espacios_recursos er ON er.espacio_id = ? AND er.recurso_id = r.id
                WHERE rr.reserva_id = ?
                ORDER BY r.nombre ASC`,
                [reserva.espacio_id, id]
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

            // Agregar emails del espacio
            try {
                const [emailsEspacio] = await db.execute(
                    `SELECT email FROM espacios_emails WHERE espacio_id = ?`,
                    [reserva.espacio_id]
                );
                
                if (emailsEspacio && emailsEspacio.length > 0) {
                    const correosEspacio = emailsEspacio
                        .map(e => e.email.trim())
                        .filter(e => e.length > 0);
                    emailDestinos = [...emailDestinos, ...correosEspacio];
                }
            } catch (emailEspacioError) {
                console.warn('⚠️ Error obteniendo emails del espacio:', emailEspacioError.message);
            }
            
            if (reservaActualizada.usuario_email && !emailDestinos.includes(reservaActualizada.usuario_email)) {
                emailDestinos.push(reservaActualizada.usuario_email);
            }

            // Eliminar duplicados
            emailDestinos = [...new Set(emailDestinos)];

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