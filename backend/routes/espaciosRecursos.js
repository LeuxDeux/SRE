// backend/routes/espaciosRecursos.js
const express = require('express');
const router = express.Router();
const espaciosRecursosController = require('../controllers/espaciosRecursosController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Asignar recursos a un espacio
router.post('/:espacioId/recursos', espaciosRecursosController.asignar);

// Quitar recurso de un espacio
router.delete('/:espacioId/recursos/:recursoId', espaciosRecursosController.quitar);

// Obtener recursos de un espacio
router.get('/:espacioId/recursos', espaciosRecursosController.obtenerRecursosDeEspacio);

// Obtener todas las asignaciones (admin)
router.get('/asignaciones', espaciosRecursosController.obtenerTodasLasAsignaciones);

module.exports = router;