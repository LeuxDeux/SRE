const express = require('express');
const router = express.Router();
const eventosController = require('../controllers/eventosController');
const authMiddleware = require('../middleware/auth'); 

// Rutas públicas - cualquiera puede ver eventos
router.get('/', eventosController.obtenerEventos);
router.get('/:id', eventosController.obtenerEvento);

// Rutas protegidas - solo usuarios autenticados pueden modificar
router.post('/', authMiddleware, eventosController.crearEvento);
router.put('/:id', authMiddleware, eventosController.actualizarEvento);
router.delete('/:id', authMiddleware, eventosController.eliminarEvento);

module.exports = router;