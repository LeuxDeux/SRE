const db = require('../config/database');
const registrarAuditoriaReservas = require('../utils/auditoriaReservas');

const espaciosController = {
  // Obtener todos los espacios activos
  obtenerEspacios: async (req, res) => {
    try {
      const [espacios] = await db.execute(
        `SELECT e.*,
                COALESCE(GROUP_CONCAT(ee.email), '') as emails_list
         FROM espacios e 
         LEFT JOIN espacios_emails ee ON e.id = ee.espacio_id
         WHERE e.activo = TRUE 
         GROUP BY e.id
         ORDER BY e.nombre`
      );

      // Transformar emails_list a array
      const espaciosFormateados = espacios.map(esp => ({
        ...esp,
        emails: esp.emails_list ? esp.emails_list.split(',').filter(e => e) : []
      }));

      res.json(espaciosFormateados);
    } catch (error) {
      console.error('Error obteniendo espacios:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener un espacio específico por ID
  obtenerEspacioPorId: async (req, res) => {
    try {
      const { id } = req.params;
      const [espacios] = await db.execute(
        `SELECT e.*,
                COALESCE(GROUP_CONCAT(ee.email), '') as emails_list
         FROM espacios e 
         LEFT JOIN espacios_emails ee ON e.id = ee.espacio_id
         WHERE e.id = ? AND e.activo = TRUE
         GROUP BY e.id`,
        [id]
      );
      
      if (espacios.length === 0) {
        return res.status(404).json({ error: 'Espacio no encontrado' });
      }

      const espacio = {
        ...espacios[0],
        emails: espacios[0].emails_list ? espacios[0].emails_list.split(',').filter(e => e) : []
      };
      
      res.json(espacio);
    } catch (error) {
      console.error('Error obteniendo espacio:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener recursos de un espacio específico
  obtenerRecursosDeEspacio: async (req, res) => {
    try {
      const { id } = req.params;
      const [recursos] = await db.execute(
        `SELECT r.*, er.cantidad_maxima
         FROM espacios_recursos er
         JOIN recursos r ON er.recurso_id = r.id
         WHERE er.espacio_id = ? AND er.disponible = TRUE AND r.activo = TRUE
         ORDER BY r.nombre`,
        [id]
      );
      
      res.json(recursos);
    } catch (error) {
      console.error('Error obteniendo recursos del espacio:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
  crearEspacio: async (req, res) => {
  try {
    const { 
      nombre, 
      descripcion, 
      capacidad, 
      ubicacion, 
      estado, 
      max_horas_por_reserva, 
      imagen_url,
      emails = [] 
    } = req.body;

    // Validar campos requeridos
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del espacio es requerido' });
    }

    // VALORES POR DEFECTO PARA EVITAR undefined
    const [result] = await db.execute(
      `INSERT INTO espacios (
        nombre, descripcion, capacidad, ubicacion, estado, 
        requiere_aprobacion, max_horas_por_reserva, imagen_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        descripcion || '',                    // Si no viene, string vacío
        capacidad ? parseInt(capacidad) : null, // Si no viene, null
        ubicacion || '',                      // Si no viene, string vacío
        estado || 'disponible',               // Si no viene, 'disponible'
        true,                                 // Todos los espacios requieren aprobación
        max_horas_por_reserva ? parseInt(max_horas_por_reserva) : 8, // Default 8
        imagen_url || ''                      // Si no viene, string vacío
      ]
    );

    const espacioId = result.insertId;

    // Insertar los emails (si hay)
    if (emails && Array.isArray(emails) && emails.length > 0) {
      const emailsFiltrados = emails.filter(email => email && email.trim()); // Filtrar vacíos
      if (emailsFiltrados.length > 0) {
        for (const email of emailsFiltrados) {
          try {
            await db.execute(
              `INSERT INTO espacios_emails (espacio_id, email) VALUES (?, ?)`,
              [espacioId, email.trim()]
            );
          } catch (emailError) {
            // Si el email ya existe (por UNIQUE constraint), ignore el error
            if (emailError.code !== 'ER_DUP_ENTRY') {
              throw emailError;
            }
          }
        }
      }
    }

    await registrarAuditoriaReservas({
      req,
      accion: 'crear',
      entidadTipo: 'espacio',
      entidadId: espacioId,
      secretariaId: req.user.secretaria_id || null,
      datosNuevos: {
        nombre,
        capacidad: capacidad ? parseInt(capacidad) : null,
        ubicacion: ubicacion || '',
        estado: estado || 'disponible',
        requiere_aprobacion: true,
        max_horas_por_reserva: max_horas_por_reserva ? parseInt(max_horas_por_reserva) : 8,
        cantidad_emails_configurados: Array.isArray(emails) ? emails.filter(Boolean).length : 0,
      },
    });

    res.json({
      success: true,
      espacio: {
        id: espacioId,
        nombre: nombre,
        mensaje: 'Espacio creado exitosamente'
      }
    });

  } catch (error) {
    console.error('Error creando espacio:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ya existe un espacio con ese nombre' });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
},

actualizarEspacio: async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, descripcion, capacidad, ubicacion, estado, 
      max_horas_por_reserva, imagen_url, activo, emails = [] 
    } = req.body;

    const [espaciosAnteriores] = await db.execute(
      'SELECT * FROM espacios WHERE id = ?',
      [id],
    );
    if (espaciosAnteriores.length === 0) {
      return res.status(404).json({ error: 'Espacio no encontrado' });
    }
    const espacioAnterior = espaciosAnteriores[0];

    const [result] = await db.execute(
      `UPDATE espacios 
       SET nombre = ?, descripcion = ?, capacidad = ?, ubicacion = ?, 
           estado = ?, requiere_aprobacion = ?, max_horas_por_reserva = ?, 
           imagen_url = ?, activo = ?
       WHERE id = ?`,
      [
        nombre,
        descripcion || '',
        capacidad ? parseInt(capacidad) : null,
        ubicacion || '',
        estado || 'disponible',
        true,
        max_horas_por_reserva ? parseInt(max_horas_por_reserva) : 8,
        imagen_url || '',
        activo !== false, // Default true
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Espacio no encontrado' });
    }

    // Eliminar todos los emails viejos
    await db.execute(`
      DELETE FROM espacios_emails WHERE espacio_id = ?
    `, [id]);

    // Insertar los nuevos emails (si hay)
    if (emails && Array.isArray(emails) && emails.length > 0) {
      const emailsFiltrados = emails.filter(email => email && email.trim()); // Filtrar vacíos
      if (emailsFiltrados.length > 0) {
        for (const email of emailsFiltrados) {
          try {
            await db.execute(
              `INSERT INTO espacios_emails (espacio_id, email) VALUES (?, ?)`,
              [id, email.trim()]
            );
          } catch (emailError) {
            // Si el email ya existe (por UNIQUE constraint), ignore el error
            if (emailError.code !== 'ER_DUP_ENTRY') {
              throw emailError;
            }
          }
        }
      }
    }

    await registrarAuditoriaReservas({
      req,
      accion: 'editar',
      entidadTipo: 'espacio',
      entidadId: id,
      secretariaId: req.user.secretaria_id || null,
      datosAnteriores: {
        nombre: espacioAnterior.nombre,
        capacidad: espacioAnterior.capacidad,
        ubicacion: espacioAnterior.ubicacion,
        estado: espacioAnterior.estado,
        requiere_aprobacion: espacioAnterior.requiere_aprobacion,
        max_horas_por_reserva: espacioAnterior.max_horas_por_reserva,
        activo: espacioAnterior.activo,
      },
      datosNuevos: {
        nombre,
        capacidad: capacidad ? parseInt(capacidad) : null,
        ubicacion: ubicacion || '',
        estado: estado || 'disponible',
        requiere_aprobacion: true,
        max_horas_por_reserva: max_horas_por_reserva ? parseInt(max_horas_por_reserva) : 8,
        activo: activo !== false,
        cantidad_emails_configurados: Array.isArray(emails) ? emails.filter(Boolean).length : 0,
      },
    });

    res.json({
      success: true,
      mensaje: 'Espacio actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando espacio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
},

  eliminarEspacio: async (req, res) => {
    try {
      const { id } = req.params;

      const [espacios] = await db.execute(
        'SELECT id, nombre, estado, activo FROM espacios WHERE id = ?',
        [id],
      );
      if (espacios.length === 0) {
        return res.status(404).json({ error: 'Espacio no encontrado' });
      }
      const espacio = espacios[0];

      // Verificar si el espacio tiene reservas futuras
      const [reservas] = await db.execute(
        'SELECT id FROM reservas WHERE espacio_id = ? AND fecha_inicio >= CURDATE() AND estado IN ("pendiente", "confirmada")',
        [id]
      );

      if (reservas.length > 0) {
        return res.status(400).json({
          error: 'No se puede eliminar el espacio porque tiene reservas futuras. Puede desactivarlo en lugar de eliminarlo.'
        });
      }

      const [result] = await db.execute('DELETE FROM espacios WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Espacio no encontrado' });
      }

      await registrarAuditoriaReservas({
        req,
        accion: 'eliminar',
        entidadTipo: 'espacio',
        entidadId: espacio.id,
        secretariaId: req.user.secretaria_id || null,
        datosAnteriores: espacio,
      });

      res.json({
        success: true,
        mensaje: 'Espacio eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando espacio:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = espaciosController;