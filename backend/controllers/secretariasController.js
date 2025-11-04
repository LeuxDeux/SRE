// backend/controllers/secretariasController.js
const pool = require('../config/database');

const secretariasController = {
  obtenerSecretarias: async (req, res) => {
    try {
      // CON BASE DE DATOS REAL
      const [secretarias] = await pool.query(`
        SELECT id, nombre, descripcion 
        FROM secretarias 
        WHERE activa = TRUE 
        ORDER BY nombre
      `);

      res.json({
        success: true,
        secretarias
      });

    } catch (error) {
      console.error('Error obteniendo secretarias:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // OPCIONAL: Crear nueva secretaría (solo admin)
  crearSecretaria: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden crear secretarías'
        });
      }

      const { nombre, descripcion } = req.body;

      if (!nombre) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de la secretaría es requerido'
        });
      }

      const [result] = await pool.query(`
        INSERT INTO secretarias (nombre, descripcion) 
        VALUES (?, ?)
      `, [nombre, descripcion]);

      const [secretarias] = await pool.query(`
        SELECT * FROM secretarias WHERE id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        secretaria: secretarias[0],
        message: 'Secretaría creada exitosamente'
      });

    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          error: 'Ya existe una secretaría con ese nombre'
        });
      }

      console.error('Error creando secretaría:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // OPCIONAL: Actualizar secretaría (solo admin)
  actualizarSecretaria: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden actualizar secretarías'
        });
      }

      const { id } = req.params;
      const { nombre, descripcion, activa } = req.body;

      const [result] = await pool.query(`
        UPDATE secretarias 
        SET nombre = ?, descripcion = ?, activa = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [nombre, descripcion, activa, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Secretaría no encontrada'
        });
      }

      const [secretarias] = await pool.query(`
        SELECT * FROM secretarias WHERE id = ?
      `, [id]);

      res.json({
        success: true,
        secretaria: secretarias[0],
        message: 'Secretaría actualizada exitosamente'
      });

    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          error: 'Ya existe una secretaría con ese nombre'
        });
      }

      console.error('Error actualizando secretaría:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
};

module.exports = secretariasController;