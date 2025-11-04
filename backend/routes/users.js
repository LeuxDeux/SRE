const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas de usuarios
router.get('/', usersController.obtenerUsuarios);
router.post('/', usersController.crearUsuario);
router.put('/:id', usersController.actualizarUsuario);
router.put('/:id/reset-password', usersController.resetearPassword);

module.exports = router;