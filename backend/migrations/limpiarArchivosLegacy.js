/**
 * Script de limpieza: vaciar la columna archivo_adjunto después de migrar a eventos_archivos
 * Uso: node backend/migrations/limpiarArchivosLegacy.js
 */

const pool = require("../config/database");

const limpiarArchivosLegacy = async () => {
  try {
    console.log("🧹 Limpiando archivos legacy de la BD...\n");

    // Obtener eventos con archivo_adjunto
    const [eventos] = await pool.query(
      "SELECT id, archivo_adjunto FROM eventos WHERE archivo_adjunto IS NOT NULL AND archivo_adjunto != ''"
    );

    console.log(`📊 Encontrados ${eventos.length} evento(s) con archivo_adjunto\n`);

    // Verificar que cada uno tiene equivalente en eventos_archivos
    let limpiables = 0;
    let riesgo = 0;

    for (const evento of eventos) {
      const [archivos] = await pool.query(
        "SELECT id FROM eventos_archivos WHERE evento_id = ? AND (archivo_path = ? OR nombre_archivo = ?)",
        [evento.id, evento.archivo_adjunto, evento.archivo_adjunto]
      );

      if (archivos.length > 0) {
        console.log(`✅ Evento ${evento.id}: Migrado correctamente a eventos_archivos`);
        limpiables++;
      } else {
        console.log(`⚠️  Evento ${evento.id}: NO tiene equivalente en eventos_archivos - NO LIMPIAR`);
        riesgo++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 ANÁLISIS:");
    console.log("=".repeat(50));
    console.log(`✅ Seguros de limpiar: ${limpiables}`);
    console.log(`⚠️  Riesgo de perder datos: ${riesgo}`);
    console.log("=".repeat(50) + "\n");

    if (riesgo > 0) {
      console.log("❌ NO se puede limpiar porque hay archivos legacy sin migrar.");
      console.log("   Ejecuta 'node backend/migrations/migrarArchivosLegacy.js' primero.\n");
      process.exit(1);
    }

    // Si es seguro, limpiar
    console.log("🔄 Limpiando columna archivo_adjunto...\n");
    
    await pool.query(
      "UPDATE eventos SET archivo_adjunto = NULL WHERE archivo_adjunto IS NOT NULL"
    );

    console.log("✅ Limpieza completada exitosamente!");
    console.log("   Todos los eventos ahora usan nuevos archivos en eventos_archivos.\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error en limpieza:", error);
    process.exit(1);
  }
};

limpiarArchivosLegacy();
