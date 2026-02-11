const express = require("express");
const router = express.Router();
const eventosController = require("../controllers/eventosController");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/upload");

// Rutas públicas - cualquiera puede ver eventos
router.get("/", eventosController.obtenerEventos);
router.get("/:id", eventosController.obtenerEvento);
router.get("/:id/historial", eventosController.obtenerHistorial);

// Rutas protegidas para gestionar eventos
// Cambio: upload.array para múltiples archivos en lugar de upload.single
router.post(
  "/",
  authMiddleware,
  upload.array("archivos_adjuntos", 5),
  eventosController.crearEvento,
);
router.put(
  "/:id",
  authMiddleware,
  upload.array("archivos_adjuntos", 5),
  eventosController.actualizarEvento,
);
router.delete("/:id", authMiddleware, eventosController.eliminarEvento);

// Nuevos endpoints para gestión de archivos
router.get("/:id/archivos", eventosController.obtenerArchivosEvento);
router.delete(
  "/:id/archivos/:archivoId",
  authMiddleware,
  eventosController.eliminarArchivoEvento,
);
router.get(
  "/:eventoId/archivos/:archivoId/download",
  eventosController.descargarArchivo,
);

// Endpoint para descargar todos los archivos (nuevos + legacy) como ZIP
router.get(
  "/:id/descargar-todos",
  eventosController.descargarMultiplesArchivos,
);

// Enviar PDF por correo
router.post(
  "/:id/enviar-pdf",
  authMiddleware,
  eventosController.enviarPDFCorreo,
);

module.exports = router;
