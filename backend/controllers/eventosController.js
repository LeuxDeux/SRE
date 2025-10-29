const pool = require('../config/database');

/**
 * FUNCIÓN AUXILIAR: detectarCambios
 * Compara un evento antiguo con uno nuevo y detecta qué campos han cambiado
 * @param {Object} eventoViejo - El evento antes de los cambios
 * @param {Object} eventoNuevo - El evento con los nuevos valores
 * @returns {Array} Lista de strings describiendo los cambios detectados
 */
const detectarCambios = async (eventoViejo, eventoNuevo) => {
  const cambios = [];

  // Comparar nombre
  if (eventoNuevo.nombre !== eventoViejo.nombre) {
    cambios.push(`Nombre: "${eventoViejo.nombre}" → "${eventoNuevo.nombre}"`);
  }

  // Comparar fechas
  const crearFechaLocal = (fechaInput) => {
    if (!fechaInput) return null;
    if (fechaInput instanceof Date) return fechaInput;
    
    if (typeof fechaInput === 'string') {
      if (fechaInput.includes('T') || fechaInput.includes('Z')) {
        return new Date(fechaInput);
      } else {
        const [año, mes, dia] = fechaInput.split('-').map(Number);
        return new Date(año, mes - 1, dia);
      }
    }
    
    return new Date(fechaInput);
  };

  const fechaVieja = crearFechaLocal(eventoViejo.fecha_evento);
  const fechaNueva = crearFechaLocal(eventoNuevo.fecha_evento);
  
  if (fechaVieja && fechaNueva && 
      fechaVieja.toLocaleDateString('es-ES') !== fechaNueva.toLocaleDateString('es-ES')) {
    cambios.push(`Fecha del evento: ${fechaVieja.toLocaleDateString('es-ES')} → ${fechaNueva.toLocaleDateString('es-ES')}`);
  }

  // Comparar categoría (NUEVO - usando IDs)
  if (eventoNuevo.categoria_id !== eventoViejo.categoria_id) {
    // Obtener nombres de categorías
    const [catVieja] = eventoViejo.categoria_id ? 
      await pool.query('SELECT nombre FROM categorias WHERE id = ?', [eventoViejo.categoria_id]) : 
      [{ nombre: 'Sin categoría' }];
    
    const [catNueva] = eventoNuevo.categoria_id ? 
      await pool.query('SELECT nombre FROM categorias WHERE id = ?', [eventoNuevo.categoria_id]) : 
      [{ nombre: 'Sin categoría' }];
    
    cambios.push(`Categoría: ${catVieja[0].nombre} → ${catNueva[0].nombre}`);
  }

  // Comparar descripción
  const descVieja = eventoViejo.descripcion || '';
  const descNueva = eventoNuevo.descripcion || '';
  
  if (descNueva !== descVieja) {
    if (!descVieja && descNueva) {
      cambios.push('Descripción: Se agregó una descripción');
    } else if (descVieja && !descNueva) {
      cambios.push('Descripción: Se eliminó la descripción');
    } else {
      cambios.push('Descripción: Se modificó la descripción');
    }
  }

  return cambios;
};

/**
 * FUNCIÓN AUXILIAR: registrarEnHistorial
 * Guarda un registro en la tabla de historial_eventos para auditoría
 * @param {Number} evento_id - ID del evento modificado
 * @param {Number} usuario_id - ID del usuario que realizó la acción
 * @param {String} accion - Tipo de acción ('creado', 'actualizado', 'eliminado')
 * @param {Array} cambios - Lista de cambios realizados
 */
const registrarEnHistorial = async (evento_id, usuario_id, accion, cambios) => {
  // Solo registrar si hay cambios reales o es una acción especial (crear/eliminar)
  if (cambios.length > 0 || accion === 'creado' || accion === 'eliminado') {
    await pool.query(
      'INSERT INTO historial_eventos (evento_id, usuario_id, accion, cambios) VALUES (?, ?, ?, ?)',
      [evento_id, usuario_id, accion, JSON.stringify(cambios)]
    );
  }
};

const eventosController = {
  /**
   * CONTROLADOR: obtenerEventos
   * Obtiene todos los eventos de la base de datos con información del usuario creador
   * Ruta: GET /api/eventos
   */
  obtenerEventos: async (req, res) => {
    try {
      // Consulta que une la tabla eventos con usuarios para obtener el nombre del creador
      const [eventos] = await pool.query(`
  SELECT e.*, u.nombre_completo as usuario_nombre, 
         c.nombre as categoria_nombre, c.color as categoria_color
  FROM eventos e 
  LEFT JOIN usuarios u ON e.usuario_id = u.id 
  LEFT JOIN categorias c ON e.categoria_id = c.id
  ORDER BY e.fecha_evento DESC
`);

      res.json({
        success: true,
        eventos
      });

    } catch (error) {
      console.error('Error obteniendo eventos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
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

      const [eventos] = await pool.query(`
  SELECT e.*, u.nombre_completo as usuario_nombre,
         c.nombre as categoria_nombre, c.color as categoria_color
  FROM eventos e 
  LEFT JOIN usuarios u ON e.usuario_id = u.id 
  LEFT JOIN categorias c ON e.categoria_id = c.id
  WHERE e.id = ?
`, [id]);

      // Verificar si el evento existe
      if (eventos.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }

      res.json({
        success: true,
        evento: eventos[0]
      });

    } catch (error) {
      console.error('Error obteniendo evento:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  /**
   * CONTROLADOR: crearEvento
   * Crea un nuevo evento en la base de datos
   * Ruta: POST /api/eventos (protegida con authMiddleware)
   */
  crearEvento: async (req, res) => {
    try {
      console.log('📥 Body recibido:', req.body);
      console.log('📁 Archivo recibido:', req.file);
      
      // Extraer datos del body y del usuario autenticado
      const { nombre, fecha_evento, descripcion, categoria_id } = req.body;
      const usuario_id = req.user.id; // Del middleware de autenticación
      const secretaria = req.user.secretaria; // Del middleware de autenticación

      // Validaciones básicas de campos requeridos
      if (!nombre || !fecha_evento) {
        return res.status(400).json({
          success: false,
          error: 'Nombre y fecha del evento son requeridos'
        });
      }

      let archivo_adjunto = null;
      const cambiosIniciales = ['Evento creado inicialmente'];

      // Manejar archivo adjunto si se subió uno
      if (req.file) {
        archivo_adjunto = req.file.filename;
        cambiosIniciales.push('Con archivo adjunto');
      }

      // Registrar si tiene descripción
      if (descripcion) {
        cambiosIniciales.push('Con descripción');
      }

      // Insertar el nuevo evento en la base de datos
      const [result] = await pool.query(`
      INSERT INTO eventos (nombre, fecha_evento, descripcion, categoria_id, usuario_id, secretaria, archivo_adjunto)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [nombre, fecha_evento, descripcion, categoria_id, usuario_id, secretaria, archivo_adjunto]);

      // Registrar la creación en el historial
      await registrarEnHistorial(
        result.insertId, // ID del evento recién creado
        usuario_id,
        'creado',
        cambiosIniciales
      );

      // Obtener el evento recién creado con información completa
      const [eventos] = await pool.query(`
  SELECT e.*, u.nombre_completo as usuario_nombre,
         c.nombre as categoria_nombre, c.color as categoria_color
  FROM eventos e 
  LEFT JOIN usuarios u ON e.usuario_id = u.id 
  LEFT JOIN categorias c ON e.categoria_id = c.id
  WHERE e.id = ?
`, [result.insertId]);

      res.status(201).json({
        success: true,
        evento: eventos[0],
        message: 'Evento creado exitosamente'
      });

    } catch (error) {
      console.error('Error creando evento:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  /**
   * CONTROLADOR: actualizarEvento
   * Actualiza un evento existente y registra los cambios en el historial
   * Ruta: PUT /api/eventos/:id (protegida con authMiddleware)
   */
  actualizarEvento: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, fecha_evento, descripcion, categoria_id } = req.body;

      // Verificar que el evento existe antes de actualizar
      const [eventos] = await pool.query('SELECT * FROM eventos WHERE id = ?', [id]);
      if (eventos.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }

      const eventoViejo = eventos[0];
      
      // DEBUG: Mostrar las fechas para ver qué está pasando
      console.log('🔍 DEBUG Fechas DETALLADO:');
      console.log('Fecha vieja desde BD (raw):', eventoViejo.fecha_evento);
      console.log('Tipo fecha vieja:', typeof eventoViejo.fecha_evento);
      console.log('Fecha nueva del form (raw):', fecha_evento);
      console.log('Tipo fecha nueva:', typeof fecha_evento);

      // Usar la nueva función para crear fechas (la misma que en detectarCambios)
      const crearFechaLocal = (fechaInput) => {
        if (!fechaInput) return null;
        
        // Si ya es un objeto Date, devolverlo directamente
        if (fechaInput instanceof Date) {
          return fechaInput;
        }
        
        // Si es un string
        if (typeof fechaInput === 'string') {
          // Si la fecha viene de MySQL (con T o Z)
          if (fechaInput.includes('T') || fechaInput.includes('Z')) {
            return new Date(fechaInput);
          } 
          // Si la fecha viene del formulario (YYYY-MM-DD), tratarla como fecha local
          else {
            // Dividir la fecha y crear en timezone local
            const [año, mes, dia] = fechaInput.split('-').map(Number);
            return new Date(año, mes - 1, dia); // mes - 1 porque JavaScript usa 0-11
          }
        }
        
        // Si es otro tipo, intentar crear Date
        return new Date(fechaInput);
      };

      const fechaVieja = crearFechaLocal(eventoViejo.fecha_evento);
      const fechaNueva = crearFechaLocal(fecha_evento);

      console.log('Fecha vieja (procesada):', fechaVieja ? fechaVieja.toString() : 'null');
      console.log('Fecha nueva (procesada):', fechaNueva ? fechaNueva.toString() : 'null');
      console.log('Fecha vieja (local):', fechaVieja ? fechaVieja.toLocaleDateString('es-ES') : 'null');
      console.log('Fecha nueva (local):', fechaNueva ? fechaNueva.toLocaleDateString('es-ES') : 'null');
      console.log('¿Son diferentes en local?', fechaVieja && fechaNueva ? 
        fechaVieja.toLocaleDateString('es-ES') !== fechaNueva.toLocaleDateString('es-ES') : 'false');
      
      // Detectar qué campos han cambiado
      const cambios = await detectarCambios(eventoViejo, { 
  nombre, 
  fecha_evento, 
  descripcion, 
  categoria_id  // Cambiar categoria por categoria_id
});

      // DEBUG: Mostrar los cambios detectados
      console.log('🔍 Cambios detectados:', cambios);

      // Manejar archivo adjunto
      let archivo_adjunto = eventoViejo.archivo_adjunto;
      if (req.file) {
        // Determinar el tipo de cambio en el archivo
        if (archivo_adjunto) {
          cambios.push('Archivo adjunto: Se reemplazó el archivo anterior');
        } else {
          cambios.push('Archivo adjunto: Se agregó un archivo');
        }
        archivo_adjunto = req.file.filename;
      }

      // Solo proceder si hay cambios reales
      if (cambios.length > 0) {
        // Registrar los cambios en el historial
        await registrarEnHistorial(
          id,
          req.user.id,
          'actualizado',
          cambios
        );

        // Actualizar el evento en la base de datos
        await pool.query(`
      UPDATE eventos
      SET nombre = ?, fecha_evento = ?, descripcion = ?, categoria_id = ?, archivo_adjunto = ?, ultima_modificacion = CURRENT_TIMESTAMP
      WHERE id = ?`, [nombre, fecha_evento, descripcion, categoria_id, archivo_adjunto, id]);
      }

      // Obtener el evento actualizado con información completa
      const [eventosActualizados] = await pool.query(`
  SELECT e.*, u.nombre_completo as usuario_nombre,
         c.nombre as categoria_nombre, c.color as categoria_color
  FROM eventos e 
  LEFT JOIN usuarios u ON e.usuario_id = u.id 
  LEFT JOIN categorias c ON e.categoria_id = c.id
  WHERE e.id = ?
`, [id]);

      res.json({
        success: true,
        evento: eventosActualizados[0],
        message: cambios.length > 0 ? 'Evento actualizado exitosamente' : 'No se realizaron cambios'
      });

    } catch (error) {
      console.error('Error actualizando evento:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
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
      const [eventos] = await pool.query('SELECT * FROM eventos WHERE id = ?', [id]);
      if (eventos.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }

      // Registrar la eliminación en el historial ANTES de eliminar el evento
      await registrarEnHistorial(
        id,
        req.user.id,
        'eliminado',
        ['Evento eliminado del sistema']
      );

      // Eliminar el evento de la base de datos
      await pool.query('DELETE FROM eventos WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Evento eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando evento:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  /**
   * CONTROLADOR: obtenerHistorialEvento
   * Obtiene el historial completo de cambios de un evento específico
   * Ruta: GET /api/eventos/:id/historial
   */
  obtenerHistorialEvento: async (req, res) => {
    try {
      const { id } = req.params;

      // Consulta que une historial_eventos con usuarios para obtener información de quién realizó cada acción
      const [historial] = await pool.query(`
        SELECT he.*, u.username, u.role, u.secretaria
        FROM historial_eventos he 
        LEFT JOIN usuarios u ON he.usuario_id = u.id 
        WHERE he.evento_id = ? 
        ORDER BY he.fecha DESC
      `, [id]);

      res.json({
        success: true,
        historial
      });

    } catch (error) {
      console.error('Error obteniendo historial:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  /**
   * CONTROLADOR: descargarArchivo
   * Permite descargar archivos adjuntos de eventos
   * Ruta: GET /api/eventos/archivo/:filename
   */
  descargarArchivo: async (req, res) => {
    try {
      const { filename } = req.params;
      const path = require('path');
      const fs = require('fs');

      // Construir la ruta completa del archivo
      const filePath = path.join(__dirname, '../uploads', filename);

      // Verificar que el archivo existe físicamente en el servidor
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: 'Archivo no encontrado'
        });
      }

      // Enviar el archivo para descarga
      res.download(filePath);

    } catch (error) {
      console.error('Error descargando archivo:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

};

module.exports = eventosController;