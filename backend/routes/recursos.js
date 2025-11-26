const express = require('express');
const router = express.Router();
const recursosController = require('../controllers/recursosController');
const authMiddleware = require('../middleware/auth');

// Ruta pública (sin auth)
router.get('/', recursosController.obtenerRecursos);

// Rutas protegidas (solo admin) 
router.post('/', authMiddleware, recursosController.crear);
router.put('/:id', authMiddleware, recursosController.actualizar);
router.delete('/:id', authMiddleware, recursosController.eliminar);

module.exports = router;