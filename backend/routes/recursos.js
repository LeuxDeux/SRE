const express = require('express');
const router = express.Router();
const recursosController = require('../controllers/recursosController');
const authMiddleware = require('../middleware/auth');

// Ruta pública (sin auth)
router.get('/', recursosController.obtenerRecursos);

// Rutas protegidas (solo admin) - después
// router.post('/', authMiddleware, recursosController.crearRecurso);
// router.put('/:id', authMiddleware, recursosController.actualizarRecurso);

module.exports = router;