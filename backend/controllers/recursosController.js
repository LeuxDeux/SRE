// backend/controllers/recursosController.js
const db = require('../config/database');

const recursosController = {
  // Obtener todos los recursos activos
  obtenerRecursos: async (req, res) => {
    try {
      const [recursos] = await db.execute(
        'SELECT * FROM recursos WHERE activo = TRUE ORDER BY nombre'
      );
      res.json(recursos);
    } catch (error) {
      console.error('Error obteniendo recursos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Crear nuevo recurso
  crear: async (req, res) => {
    try {
      const { nombre, descripcion, cantidad_total } = req.body;

      // Validaciones
      if (!nombre) {
        return res.status(400).json({ error: 'El nombre del recurso es requerido' });
      }

      if (!cantidad_total || cantidad_total < 1) {
        return res.status(400).json({ error: 'La cantidad total debe ser al menos 1' });
      }

      const [result] = await db.execute(
        'INSERT INTO recursos (nombre, descripcion, cantidad_total) VALUES (?, ?, ?)',
        [nombre, descripcion || '', cantidad_total]
      );

      res.json({
        success: true,
        recurso: {
          id: result.insertId,
          nombre: nombre,
          mensaje: 'Recurso creado exitosamente'
        }
      });

    } catch (error) {
      console.error('Error creando recurso:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Ya existe un recurso con ese nombre' });
      }
      
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Actualizar recurso
  actualizar: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, descripcion, cantidad_total, activo } = req.body;

      // Validar que el recurso existe
      const [recursos] = await db.execute('SELECT id FROM recursos WHERE id = ?', [id]);
      if (recursos.length === 0) {
        return res.status(404).json({ error: 'Recurso no encontrado' });
      }

      const [result] = await db.execute(
        'UPDATE recursos SET nombre = ?, descripcion = ?, cantidad_total = ?, activo = ? WHERE id = ?',
        [nombre, descripcion || '', cantidad_total, activo !== false, id]
      );

      res.json({
        success: true,
        mensaje: 'Recurso actualizado exitosamente'
      });

    } catch (error) {
      console.error('Error actualizando recurso:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Ya existe un recurso con ese nombre' });
      }
      
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Eliminar recurso
  eliminar: async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar que el recurso existe
      const [recursos] = await db.execute('SELECT id FROM recursos WHERE id = ?', [id]);
      if (recursos.length === 0) {
        return res.status(404).json({ error: 'Recurso no encontrado' });
      }

      // Verificar si el recurso está asignado a algún espacio
      const [asignaciones] = await db.execute(
        'SELECT id FROM espacios_recursos WHERE recurso_id = ?',
        [id]
      );

      if (asignaciones.length > 0) {
        return res.status(400).json({
          error: 'No se puede eliminar el recurso porque está asignado a uno o más espacios. Primero quítelo de los espacios.'
        });
      }

      // Eliminar el recurso
      const [result] = await db.execute('DELETE FROM recursos WHERE id = ?', [id]);

      res.json({
        success: true,
        mensaje: 'Recurso eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando recurso:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = recursosController;