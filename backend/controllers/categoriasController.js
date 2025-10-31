const pool = require('../config/database');

const categoriasController = {
  // Obtener todas las categorías activas
  obtenerCategorias: async (req, res) => {
    try {
      const [categorias] = await pool.query(`
        SELECT * FROM categorias 
        WHERE activa = TRUE 
        ORDER BY nombre
      `);

      res.json({
        success: true,
        categorias
      });

    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Obtener todas las categorías (incluyendo inactivas - solo admin)
  obtenerTodasCategorias: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para ver todas las categorías'
        });
      }

      const [categorias] = await pool.query(`
        SELECT * FROM categorias 
        ORDER BY activa DESC, nombre
      `);

      res.json({
        success: true,
        categorias
      });

    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Crear nueva categoría
  crearCategoria: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden crear categorías'
        });
      }

      const { nombre, color, prioridad, dias_antelacion } = req.body;

      if (!nombre) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de la categoría es requerido'
        });
      }

      const [result] = await pool.query(`
        INSERT INTO categorias (nombre, color, prioridad, dias_antelacion) 
        VALUES (?, ?, ?, ?)
      `, [nombre, color || '#3498db', prioridad || 'media', dias_antelacion || 15]);

      const [categorias] = await pool.query(`
        SELECT * FROM categorias WHERE id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        categoria: categorias[0],
        message: 'Categoría creada exitosamente'
      });

    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          error: 'Ya existe una categoría con ese nombre'
        });
      }

      console.error('Error creando categoría:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Actualizar categoría
  actualizarCategoria: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden actualizar categorías'
        });
      }

      const { id } = req.params;
      const { nombre, color, prioridad, dias_antelacion, activa } = req.body;

      const [result] = await pool.query(`
        UPDATE categorias 
        SET nombre = ?, color = ?, prioridad = ?, dias_antelacion = ?, activa = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [nombre, color, prioridad, dias_antelacion, activa, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Categoría no encontrada'
        });
      }

      const [categorias] = await pool.query(`
        SELECT * FROM categorias WHERE id = ?
      `, [id]);

      res.json({
        success: true,
        categoria: categorias[0],
        message: 'Categoría actualizada exitosamente'
      });

    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          error: 'Ya existe una categoría con ese nombre'
        });
      }

      console.error('Error actualizando categoría:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Eliminar categoría (soft delete)
  eliminarCategoria: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden eliminar categorías'
        });
      }

      const { id } = req.params;

      // Verificar si hay eventos usando esta categoría
      const [eventos] = await pool.query(`
        SELECT COUNT(*) as count FROM eventos WHERE categoria_id = ?
      `, [id]);

      if (eventos[0].count > 0) {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar la categoría porque hay eventos asociados'
        });
      }

      const [result] = await pool.query(`
        DELETE FROM categorias WHERE id = ?
      `, [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Categoría no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Categoría eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando categoría:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
};

module.exports = categoriasController;