const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authController = {
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      // Validar que vengan los campos
      if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
      }

      console.log(`🔐 Intento de login para usuario: ${username}`);

      // 1. Buscar usuario en la base de datos
      const [users] = await pool.query(
        'SELECT * FROM usuarios WHERE username = ? AND activo = 1', 
        [username]
      );

      if (users.length === 0) {
        console.log('❌ Usuario no encontrado:', username);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const user = users[0];
      console.log('✅ Usuario encontrado:', user.username);

      // 2. Verificar contraseña con bcrypt
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        console.log('❌ Contraseña incorrecta para:', username);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      console.log('✅ Contraseña válida para:', username);

      // 3. Generar JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          secretaria: user.secretaria 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      console.log('✅ JWT generado para:', username);

      // 4. Responder con token y datos del usuario (sin password)
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          secretaria: user.secretaria
        }
      });

    } catch (error) {
      console.error('❌ Error en login:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor' 
      });
    }
  },

  verifyToken: async (req, res) => {
    try {
      // 1. Obtener token del header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false,
          error: 'Token no proporcionado' 
        });
      }

      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          success: false,
          error: 'Token no proporcionado' 
        });
      }

      console.log('🔍 Verificando token...');

      // 2. Verificar y decodificar token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 3. Verificar que el usuario aún existe en la BD y está activo
      const [users] = await pool.query(
        'SELECT id, username, email, role, secretaria FROM usuarios WHERE id = ? AND activo = 1', 
        [decoded.id]
      );

      if (users.length === 0) {
        console.log('❌ Usuario no encontrado en BD para token válido');
        return res.status(401).json({ 
          success: false,
          error: 'Usuario no encontrado' 
        });
      }

      const user = users[0];
      console.log('✅ Token válido para:', user.username);

      // 4. Devolver datos del usuario
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          secretaria: user.secretaria
        }
      });

    } catch (error) {
      console.error('❌ Error verificando token:', error.message);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false,
          error: 'Token inválido' 
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          error: 'Token expirado' 
        });
      }

      res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor' 
      });
    }
  }
};

module.exports = authController;