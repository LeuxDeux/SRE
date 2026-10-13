const express = require('express');
const router = express.Router();
const reservasController = require('../controllers/reservasController');
const auditoriaReservasController = require('../controllers/auditoriaReservasController');
const authMiddleware = require('../middleware/auth');

// Ruta pública para validar disponibilidad
router.post('/validar-disponibilidad', reservasController.validarDisponibilidad);

// Rutas protegidas
router.get('/', authMiddleware, reservasController.obtenerReservas);
router.get('/auditoria', authMiddleware, auditoriaReservasController.obtenerAuditoriaReservas);
router.get('/:id', authMiddleware, reservasController.obtenerReservaPorId);
router.post('/', authMiddleware, reservasController.crearReserva);
router.put('/:id', authMiddleware, reservasController.actualizar);
router.put('/:id/cancelar', authMiddleware, reservasController.cancelarReserva);
router.delete('/:id', authMiddleware, reservasController.eliminarReserva);
router.put('/:id/aprobar', authMiddleware, reservasController.aprobarReserva);
router.put('/:id/rechazar', authMiddleware, reservasController.rechazarReserva);

module.exports = router;