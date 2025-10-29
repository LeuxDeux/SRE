const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categoriasController');
const authMiddleware = require('../middleware/auth');

// Rutas públicas
router.get('/', categoriasController.obtenerCategorias);

// Rutas protegidas (solo admin)
router.get('/todas', authMiddleware, categoriasController.obtenerTodasCategorias);
router.post('/', authMiddleware, categoriasController.crearCategoria);
router.put('/:id', authMiddleware, categoriasController.actualizarCategoria);
router.delete('/:id', authMiddleware, categoriasController.eliminarCategoria);

module.exports = router;