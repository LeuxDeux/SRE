/**
 * Script de migración: convertir archivos legacy (archivo_adjunto) al nuevo sistema (eventos_archivos)
 * Uso: node backend/migrations/migrarArchivosLegacy.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require("../config/database");
const fs = require("fs");
const path = require("path");

const migrateArchivosLegacy = async () => {
  try {
    console.log("🔄 Iniciando migración de archivos legacy...\n");

    // 1. Obtener todos los eventos con archivo_adjunto
    const [eventosConLegacy] = await pool.query(
      "SELECT id, archivo_adjunto FROM eventos WHERE archivo_adjunto IS NOT NULL AND archivo_adjunto != ''"
    );

    console.log(`📊 Encontrados ${eventosConLegacy.length} evento(s) con archivos legacy\n`);

    let migrados = 0;
    let corrupto = 0;
    let yaMigrados = 0;

    for (const evento of eventosConLegacy) {
      const uploadsDir = path.join(__dirname, "../uploads");
      const legacyPath = path.join(uploadsDir, evento.archivo_adjunto);

      console.log(`\n📝 Evento ${evento.id}: ${evento.archivo_adjunto}`);

      // Verificar si ya existe entrada en eventos_archivos para este legacy
      const [yaExiste] = await pool.query(
        "SELECT id FROM eventos_archivos WHERE evento_id = ? AND archivo_path = ?",
        [evento.id, evento.archivo_adjunto]
      );

      if (yaExiste.length > 0) {
        console.log(`   ✅ Ya migrado anteriormente (ID: ${yaExiste[0].id})`);
        yaMigrados++;
        continue;
      }

      // Verificar que el archivo existe en el servidor
      if (!fs.existsSync(legacyPath)) {
        console.log(`   ❌ CORRUPTO - Archivo NO encontrado en: ${legacyPath}`);
        corrupto++;
        continue;
      }

      // Obtener tamaño del archivo
      const stats = fs.statSync(legacyPath);
      const tamaño = stats.size;

      // Obtener extensión
      const extension = path
        .extname(evento.archivo_adjunto)
        .substring(1)
        .toLowerCase();

      // Insertar en eventos_archivos
      await pool.query(
        `INSERT INTO eventos_archivos (evento_id, nombre_archivo, archivo_path, tamao, tipo_archivo)
         VALUES (?, ?, ?, ?, ?)`,
        [evento.id, evento.archivo_adjunto, evento.archivo_adjunto, tamaño, extension]
      );

      console.log(`   ✅ Migrado exitosamente`);
      console.log(`      - Tamaño: ${(tamaño / 1024 / 1024).toFixed(2)}MB`);
      console.log(`      - Tipo: ${extension}`);
      migrados++;
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 RESUMEN DE MIGRACIÓN:");
    console.log("=".repeat(50));
    console.log(`✅ Migrados: ${migrados}`);
    console.log(`⏭️  Ya migrados: ${yaMigrados}`);
    console.log(`❌ Corruptos/No encontrados: ${corrupto}`);
    console.log(`📊 Total: ${eventosConLegacy.length}`);
    console.log("=".repeat(50) + "\n");

    if (corrupto === 0 && migrados > 0) {
      console.log("✨ ¡Migración completada exitosamente!\n");
      console.log("Próximos pasos:");
      console.log("1. Verificar en la BD que todos los archivos estén en eventos_archivos");
      console.log("2. Opcional: ejecutar 'node backend/migrations/limpiarArchivosLegacy.js' para limpiar la columna archivo_adjunto");
    } else if (corrupto > 0) {
      console.log("⚠️  Se encontraron archivos corruptos/no disponibles.");
      console.log("   Estos no se pudieron migrar. Revisa en la BD qué eventos corresponden.");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error en migración:", error);
    process.exit(1);
  }
};

migrateArchivosLegacy();
