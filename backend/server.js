const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());

// Servir archivos estáticos desde la carpeta uploads
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
app.use("/api/auth", require("./routes/auth"));
// Rutas de eventos
app.use("/api/eventos", require("./routes/eventos"));

app.use("/api/categorias", require("./routes/categorias"));

app.use("/api/users", require("./routes/users"));

app.use("/api/secretarias", require("./routes/secretarias"));

// Rutas espacios
app.use("/api/espacios", require("./routes/espacios"));
app.use("/api/recursos", require("./routes/recursos"));
app.use("/api/reservas", require("./routes/reservas"));
app.use("/api/espacios-recursos", require("./routes/espaciosRecursos"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Manejador de errores de Multer
const multer = require("multer");

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error("❌ Error de Multer:", error.code, error.message);

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "El archivo excede el tamaño máximo de 50MB",
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        error: "El número máximo de archivos es 5",
      });
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        error: "Tipo de archivo no permitido",
      });
    }

    return res.status(400).json({
      success: false,
      error: `Error de archivo: ${error.message}`,
    });
  }

  next(error);
});

// Manejo de errores de archivos rechazados por el filtro
app.use((error, req, res, next) => {
  if (error && error.message && error.message.includes("no permitido")) {
    console.error("❌ Tipo de archivo rechazado:", error.message);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  next(error);
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Manejo de errores general
app.use((error, req, res, next) => {
  console.error("Error no manejado:", error);
  res.status(500).json({ error: "Error interno del servidor" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});

module.exports = { app, server };
