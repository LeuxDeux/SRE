const express = require('express');
const router = express.Router();
const eventosController = require('../controllers/eventosController');
const authMiddleware = require('../middleware/auth'); 
const upload = require('../middleware/upload');

// Rutas públicas - cualquiera puede ver eventos
router.get('/', eventosController.obtenerEventos);
router.get('/:id', eventosController.obtenerEvento);
router.get('/:id/historial', eventosController.obtenerHistorialEvento);

// Rutas protegidas - solo usuarios autenticados pueden modificar
router.post('/', authMiddleware, upload.single('archivo_adjunto'), eventosController.crearEvento);
router.put('/:id', authMiddleware, upload.single('archivo_adjunto'), eventosController.actualizarEvento);
router.delete('/:id', authMiddleware, eventosController.eliminarEvento);
router.get('/archivo/:filename', eventosController.descargarArchivo);

module.exports = router;