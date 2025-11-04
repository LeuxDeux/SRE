const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const usersController = {
  // Obtener todos los usuarios (solo admin)
  obtenerUsuarios: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para ver usuarios'
        });
      }

      const [usuarios] = await pool.query(`
      SELECT 
        u.id, 
        u.username, 
        u.nombre_completo, 
        u.email, 
        u.telefono, 
        u.role, 
        u.secretaria_id,
        s.nombre as secretaria_nombre,  -- Obtener el nombre de la secretaría
        u.activo, 
        u.created_at, 
        u.updated_at,
        u.fecha_ultimo_login
      FROM usuarios u
      LEFT JOIN secretarias s ON u.secretaria_id = s.id
      ORDER BY u.created_at DESC
    `);

      res.json({
        success: true,
        usuarios
      });

    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Crear nuevo usuario (solo admin)
  crearUsuario: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden crear usuarios'
        });
      }

      const { username, password, nombre_completo, email, telefono, role, secretaria_id } = req.body;

      // ... validaciones ...

      // Insertar con secretaria_id
      const [result] = await pool.query(`
      INSERT INTO usuarios (username, password_hash, nombre_completo, email, telefono, role, secretaria_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [username, password_hash, nombre_completo, email, telefono, role, secretaria_id]);

      // Obtener usuario creado con JOIN
      const [usuarios] = await pool.query(`
      SELECT 
        u.id, u.username, u.nombre_completo, u.email, u.telefono, u.role, 
        u.secretaria_id, s.nombre as secretaria_nombre, u.activo, u.created_at
      FROM usuarios u
      LEFT JOIN secretarias s ON u.secretaria_id = s.id
      WHERE u.id = ?
    `, [result.insertId]);

      res.status(201).json({
        success: true,
        usuario: usuarios[0],
        message: 'Usuario creado exitosamente'
      });

    } catch (error) {
      console.error('Error creando usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Actualizar usuario
  actualizarUsuario: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden actualizar usuarios'
        });
      }

      const { id } = req.params;
      const { username, nombre_completo, email, telefono, role, secretaria_id, activo } = req.body;

      // ... verificaciones ...

      // Actualizar con secretaria_id
      await pool.query(`
      UPDATE usuarios 
      SET username = ?, nombre_completo = ?, email = ?, telefono = ?, role = ?, 
          secretaria_id = ?, activo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [username, nombre_completo, email, telefono, role, secretaria_id, activo, id]);

      // Obtener usuario actualizado con JOIN
      const [usuariosActualizados] = await pool.query(`
      SELECT 
        u.id, u.username, u.nombre_completo, u.email, u.telefono, u.role,
        u.secretaria_id, s.nombre as secretaria_nombre, u.activo, u.created_at, u.updated_at
      FROM usuarios u
      LEFT JOIN secretarias s ON u.secretaria_id = s.id
      WHERE u.id = ?
    `, [id]);

      res.json({
        success: true,
        usuario: usuariosActualizados[0],
        message: 'Usuario actualizado exitosamente'
      });

    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Resetear password (solo admin)
  resetearPassword: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden resetear contraseñas'
        });
      }

      const { id } = req.params;
      const { nueva_password } = req.body;

      if (!nueva_password || nueva_password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'La nueva contraseña debe tener al menos 6 caracteres'
        });
      }

      // Hash nueva password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(nueva_password, saltRounds);

      await pool.query(`
        UPDATE usuarios 
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [password_hash, id]);

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      console.error('Error reseteando password:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

};

module.exports = usersController;