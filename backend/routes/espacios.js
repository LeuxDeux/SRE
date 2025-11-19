const express = require('express');
const router = express.Router();
const espaciosController = require('../controllers/espaciosController');
const authMiddleware = require('../middleware/auth');

// Rutas públicas (sin auth)
router.get('/', espaciosController.obtenerEspacios);
router.get('/:id', espaciosController.obtenerEspacioPorId);
router.get('/:id/recursos', espaciosController.obtenerRecursosDeEspacio);

// Rutas protegidas (solo admin) - después
// router.post('/', authMiddleware, espaciosController.crearEspacio);
// router.put('/:id', authMiddleware, espaciosController.actualizarEspacio);

module.exports = router;