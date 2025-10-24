const pool = require('../config/database');

const eventosController = {
  // Obtener todos los eventos
  obtenerEventos: async (req, res) => {
    try {
      const [eventos] = await pool.query(`
        SELECT e.*, u.username as usuario_nombre 
        FROM eventos e 
        LEFT JOIN usuarios u ON e.usuario_id = u.id 
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

  // Obtener un evento por ID
  obtenerEvento: async (req, res) => {
    try {
      const { id } = req.params;
      
      const [eventos] = await pool.query(`
        SELECT e.*, u.username as usuario_nombre 
        FROM eventos e 
        LEFT JOIN usuarios u ON e.usuario_id = u.id 
        WHERE e.id = ?
      `, [id]);
      
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

  // Crear nuevo evento
  crearEvento: async (req, res) => {
    try {
      const { nombre, fecha_evento, descripcion, categoria } = req.body;
      const usuario_id = req.user.id; // Del middleware de auth (cuando lo implementemos)
      const secretaria = req.user.secretaria;
      
      // Validaciones básicas
      if (!nombre || !fecha_evento) {
        return res.status(400).json({ 
          success: false,
          error: 'Nombre y fecha del evento son requeridos' 
        });
      }
      
      const [result] = await pool.query(`
        INSERT INTO eventos (nombre, fecha_evento, descripcion, categoria, usuario_id, secretaria)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [nombre, fecha_evento, descripcion, categoria, usuario_id, secretaria]);
      
      // Obtener el evento recién creado
      const [eventos] = await pool.query(`
        SELECT e.*, u.username as usuario_nombre 
        FROM eventos e 
        LEFT JOIN usuarios u ON e.usuario_id = u.id 
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

  // Actualizar evento
  actualizarEvento: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, fecha_evento, descripcion, categoria } = req.body;
      
      // Verificar que el evento existe
      const [eventos] = await pool.query('SELECT * FROM eventos WHERE id = ?', [id]);
      if (eventos.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Evento no encontrado' 
        });
      }
      
      await pool.query(`
        UPDATE eventos 
        SET nombre = ?, fecha_evento = ?, descripcion = ?, categoria = ?, ultima_modificacion = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [nombre, fecha_evento, descripcion, categoria, id]);
      
      // Obtener el evento actualizado
      const [eventosActualizados] = await pool.query(`
        SELECT e.*, u.username as usuario_nombre 
        FROM eventos e 
        LEFT JOIN usuarios u ON e.usuario_id = u.id 
        WHERE e.id = ?
      `, [id]);
      
      res.json({
        success: true,
        evento: eventosActualizados[0],
        message: 'Evento actualizado exitosamente'
      });
      
    } catch (error) {
      console.error('Error actualizando evento:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor' 
      });
    }
  },

  // Eliminar evento
  eliminarEvento: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar que el evento existe
      const [eventos] = await pool.query('SELECT * FROM eventos WHERE id = ?', [id]);
      if (eventos.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Evento no encontrado' 
        });
      }
      
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
  }
};

module.exports = eventosController;