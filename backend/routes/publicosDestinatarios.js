const express = require('express');
const router = express.Router();
const publicosDestinatariosController = require('../controllers/publicosDestinatariosController');
const authMiddleware = require('../middleware/auth');

// Ruta pública - cualquier usuario puede ver los públicos destinatarios
router.get('/', publicosDestinatariosController.obtenerPublicos);

// Ruta protegida - solo admin puede crear
router.post('/', authMiddleware, publicosDestinatariosController.crearPublico);

module.exports = router;
