/**
 * Script de limpieza: remover archivos huérfanos del servidor
 * Uso: node backend/migrations/limpiarHuerfanos.js
 */

const fs = require("fs");
const path = require("path");
const pool = require("../config/database");

const limpiarHuerfanos = async () => {
  try {
    console.log("🧹 Buscando archivos huérfanos...\n");

    const uploadsDir = path.join(__dirname, "../uploads");

    // Obtener todos los archivos referenciados en BD
    const [archivosEnBD] = await pool.query(
      "SELECT DISTINCT archivo_path FROM eventos_archivos UNION SELECT DISTINCT archivo_adjunto FROM eventos WHERE archivo_adjunto IS NOT NULL"
    );

    const archivosReferenciados = new Set(
      archivosEnBD.map(a => a.archivo_path || a.archivo_adjunto).filter(Boolean)
    );

    // Buscar archivos en el servidor
    const archivosEnServidor = fs.readdirSync(uploadsDir);

    let huerfanos = [];
    for (const nombreArchivo of archivosEnServidor) {
      if (nombreArchivo !== '.gitkeep' && !archivosReferenciados.has(nombreArchivo)) {
        huerfanos.push(nombreArchivo);
      }
    }

    if (huerfanos.length === 0) {
      console.log("✅ No hay archivos huérfanos.\n");
      process.exit(0);
    }

    console.log(`🪦 Encontrados ${huerfanos.length} archivo(s) huérfano(s):\n`);
    huerfanos.forEach((archivo, idx) => {
      const filePath = path.join(uploadsDir, archivo);
      const stats = fs.statSync(filePath);
      console.log(`   ${idx + 1}. ${archivo} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
    });

    console.log("\n⚠️  ¿Deseas eliminar estos archivos huérfanos?");
    console.log("   (Si ejecutas este script sin confirmación manual, NO se eliminarán)");
    console.log("   (Para eliminarlos, edita este script y reemplaza 'CONFIRMACION = false' con 'CONFIRMACION = true')\n");

    // Variable de confirmación (cambiar a true para ejecutar eliminación)
    const CONFIRMACION = false;

    if (!CONFIRMACION) {
      console.log("❌ Eliminación cancelada. Script configurado en modo seguro.\n");
      process.exit(0);
    }

    // Eliminar archivos
    console.log("🔄 Eliminando archivos huérfanos...\n");
    for (const archivo of huerfanos) {
      const filePath = path.join(uploadsDir, archivo);
      fs.unlinkSync(filePath);
      console.log(`✅ Eliminado: ${archivo}`);
    }

    console.log(`\n✨ Se eliminaron ${huerfanos.length} archivo(s) huérfano(s) correctamente.\n`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error limpiando huérfanos:", error);
    process.exit(1);
  }
};

limpiarHuerfanos();
