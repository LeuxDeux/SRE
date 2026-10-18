const express = require("express");
const router = express.Router();
const eventosController = require("../controllers/eventosController");
const auditoriaEventosController = require("../controllers/auditoriaEventosController");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/upload");
const soloGestionEventos = (req, res, next) => {
  if (!["admin", "secretaria"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "No tienes permisos para gestionar eventos",
    });
  }
  next();
};

// Rutas públicas - cualquiera puede ver eventos
router.get("/", eventosController.obtenerEventos);
router.get("/solicitudes", authMiddleware, eventosController.listarSolicitudesPendientes);
router.get("/mis-solicitudes", authMiddleware, eventosController.obtenerMisSolicitudes);
router.get("/auditoria", authMiddleware, auditoriaEventosController.obtenerAuditoriaEventos);
router.patch("/:id/aprobar", authMiddleware, eventosController.aprobarEventoPendiente);
router.patch("/:id/rechazar", authMiddleware, eventosController.rechazarEventoPendiente);
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
  soloGestionEventos,
  upload.array("archivos_adjuntos", 5),
  eventosController.actualizarEvento,
);
router.delete("/:id", authMiddleware, soloGestionEventos, eventosController.eliminarEvento);

// Nuevos endpoints para gestión de archivos
router.get("/:id/archivos", eventosController.obtenerArchivosEvento);
router.delete(
  "/:id/archivos/:archivoId",
  authMiddleware,
  soloGestionEventos,
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
  soloGestionEventos,
  eventosController.enviarPDFCorreo,
);

module.exports = router;
