const pool = require('../config/database');

const categoriasController = {
  // Obtener todas las categorías activas con sus emails
  obtenerCategorias: async (req, res) => {
    try {
      const [categorias] = await pool.query(`
        SELECT 
          c.id,
          c.nombre,
          c.color,
          c.activa,
          c.created_at,
          c.updated_at,
          c.prioridad,
          c.dias_antelacion,
          c.email_contacto,
          c.descripcion,
          COALESCE(GROUP_CONCAT(ce.email), '') as emails_list
        FROM categorias c
        LEFT JOIN categorias_emails ce ON c.id = ce.categoria_id
        WHERE c.activa = TRUE
        GROUP BY c.id
        ORDER BY c.nombre
      `);

      // Transformar emails_list a array
      const categoriasFormateadas = categorias.map(cat => ({
        ...cat,
        emails: cat.emails_list ? cat.emails_list.split(',').filter(e => e) : []
      }));

      res.json({
        success: true,
        categorias: categoriasFormateadas
      });

    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Obtener todas las categorías (incluyendo inactivas - solo admin) con sus emails
  obtenerTodasCategorias: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para ver todas las categorías'
        });
      }

      const [categorias] = await pool.query(`
        SELECT 
          c.id,
          c.nombre,
          c.color,
          c.activa,
          c.created_at,
          c.updated_at,
          c.prioridad,
          c.dias_antelacion,
          c.email_contacto,
          c.descripcion,
          COALESCE(GROUP_CONCAT(ce.email), '') as emails_list
        FROM categorias c
        LEFT JOIN categorias_emails ce ON c.id = ce.categoria_id
        GROUP BY c.id
        ORDER BY c.activa DESC, c.nombre
      `);

      // Transformar emails_list a array
      const categoriasFormateadas = categorias.map(cat => ({
        ...cat,
        emails: cat.emails_list ? cat.emails_list.split(',').filter(e => e) : []
      }));

      res.json({
        success: true,
        categorias: categoriasFormateadas
      });

    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Crear nueva categoría con múltiples emails
  crearCategoria: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden crear categorías'
        });
      }

      const { nombre, color, prioridad, dias_antelacion, emails = [], descripcion } = req.body;

      if (!nombre) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de la categoría es requerido'
        });
      }

      // Crear la categoría
      const [result] = await pool.query(`
        INSERT INTO categorias (nombre, color, prioridad, dias_antelacion, descripcion) 
        VALUES (?, ?, ?, ?, ?)
      `, [nombre, color || '#3498db', prioridad || 'media', dias_antelacion || 15, descripcion || null]);

      const categoriaId = result.insertId;

      // Insertar los emails (si hay)
      if (emails && Array.isArray(emails) && emails.length > 0) {
        const emailsFiltrados = emails.filter(email => email && email.trim()); // Filtrar vacíos
        if (emailsFiltrados.length > 0) {
          const valoresEmails = emailsFiltrados.map(email => [categoriaId, email.trim()]);
          await pool.query(`
            INSERT INTO categorias_emails (categoria_id, email) 
            VALUES ?
          `, [valoresEmails]);
        }
      }

      // Obtener la categoría con sus emails
      const [categorias] = await pool.query(`
        SELECT 
          c.id,
          c.nombre,
          c.color,
          c.activa,
          c.created_at,
          c.updated_at,
          c.prioridad,
          c.dias_antelacion,
          c.email_contacto,
          c.descripcion,
          COALESCE(GROUP_CONCAT(ce.email), '') as emails_list
        FROM categorias c
        LEFT JOIN categorias_emails ce ON c.id = ce.categoria_id
        WHERE c.id = ?
        GROUP BY c.id
      `, [categoriaId]);

      const categoria = {
        ...categorias[0],
        emails: categorias[0].emails_list ? categorias[0].emails_list.split(',').filter(e => e) : []
      };

      res.status(201).json({
        success: true,
        categoria,
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

  // Actualizar categoría con múltiples emails
  actualizarCategoria: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden actualizar categorías'
        });
      }

      const { id } = req.params;
      const { nombre, color, prioridad, dias_antelacion, activa, emails = [], descripcion } = req.body;

      // Actualizar los datos de la categoría
      const [result] = await pool.query(`
        UPDATE categorias 
        SET nombre = ?, color = ?, prioridad = ?, dias_antelacion = ?, activa = ?, descripcion = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [nombre, color, prioridad, dias_antelacion, activa, descripcion, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Categoría no encontrada'
        });
      }

      // Eliminar todos los emails viejos
      await pool.query(`
        DELETE FROM categorias_emails WHERE categoria_id = ?
      `, [id]);

      // Insertar los nuevos emails (si hay)
      if (emails && Array.isArray(emails) && emails.length > 0) {
        const emailsFiltrados = emails.filter(email => email && email.trim()); // Filtrar vacíos
        if (emailsFiltrados.length > 0) {
          const valoresEmails = emailsFiltrados.map(email => [id, email.trim()]);
          await pool.query(`
            INSERT INTO categorias_emails (categoria_id, email) 
            VALUES ?
          `, [valoresEmails]);
        }
      }

      // Obtener la categoría actualizada con sus emails
      const [categorias] = await pool.query(`
        SELECT 
          c.id,
          c.nombre,
          c.color,
          c.activa,
          c.created_at,
          c.updated_at,
          c.prioridad,
          c.dias_antelacion,
          c.email_contacto,
          c.descripcion,
          COALESCE(GROUP_CONCAT(ce.email), '') as emails_list
        FROM categorias c
        LEFT JOIN categorias_emails ce ON c.id = ce.categoria_id
        WHERE c.id = ?
        GROUP BY c.id
      `, [id]);

      const categoria = {
        ...categorias[0],
        emails: categorias[0].emails_list ? categorias[0].emails_list.split(',').filter(e => e) : []
      };

      res.json({
        success: true,
        categoria,
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