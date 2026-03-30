const pool = require('../config/database');

const publicosDestinatariosController = {
  // Obtener todos los públicos activos (acceso público)
  obtenerPublicos: async (req, res) => {
    try {
      const [publicos] = await pool.query(
        'SELECT id, nombre FROM publicos_destinatarios WHERE activo = TRUE ORDER BY nombre'
      );

      res.json({
        success: true,
        publicos
      });

    } catch (error) {
      console.error('Error obteniendo públicos destinatarios:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Crear nuevo público destinatario (solo admin)
  crearPublico: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para crear públicos destinatarios'
        });
      }

      const { nombre } = req.body;

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({
          success: false,
          error: 'El nombre es requerido'
        });
      }

      const nombreLimpio = nombre.trim();

      // Verificar que no exista ya
      const [existente] = await pool.query(
        'SELECT id FROM publicos_destinatarios WHERE LOWER(nombre) = LOWER(?)',
        [nombreLimpio]
      );

      if (existente.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe un público destinatario con ese nombre'
        });
      }

      const [result] = await pool.query(
        'INSERT INTO publicos_destinatarios (nombre) VALUES (?)',
        [nombreLimpio]
      );

      res.status(201).json({
        success: true,
        publico: {
          id: result.insertId,
          nombre: nombreLimpio
        }
      });

    } catch (error) {
      console.error('Error creando público destinatario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
};

module.exports = publicosDestinatariosController;
