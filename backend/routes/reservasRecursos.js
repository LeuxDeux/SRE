// backend/routes/reservasRecursos.js
const express = require('express');
const router = express.Router();
const reservasRecursosController = require('../controllers/reservasRecursosController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener recursos de una reserva
router.get('/:reservaId/recursos', reservasRecursosController.obtenerRecursosDeReserva);

// Agregar recurso(s) a una reserva
router.post('/:reservaId/recursos', reservasRecursosController.agregarRecursoAReserva);

// Confirmar cantidad de un recurso
router.put('/:reservaId/recursos/:recursoId/confirmar', reservasRecursosController.confirmarRecurso);

// Quitar recurso de una reserva
router.delete('/:reservaId/recursos/:recursoId', reservasRecursosController.quitarRecursoDeReserva);

module.exports = router;
