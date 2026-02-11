/**
 * Script de auditoría: verificar integridad de todos los archivos
 * Uso: node backend/migrations/auditoriaArchivos.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require("../config/database");
const fs = require("fs");
const path = require("path");

const auditoriaArchivos = async () => {
  try {
    console.log("🔍 Ejecutando auditoría de integridad de archivos...\n");

    const uploadsDir = path.join(__dirname, "../uploads");

    // 1. Obtener todos los archivos de eventos_archivos
    const [archivosEnBD] = await pool.query(
      "SELECT id, evento_id, nombre_archivo, archivo_path FROM eventos_archivos ORDER BY evento_id"
    );

    console.log(`📊 Total de archivos en BD: ${archivosEnBD.length}\n`);

    let archivosBien = 0;
    let archivosNoEncontrados = [];
    let archivosDuplicados = {};
    let archivosHuerfanos = [];

    // 2. Verificar que existan en el servidor
    console.log("Verificando archivos en el servidor...\n");

    for (const archivo of archivosEnBD) {
      const filePath = path.join(uploadsDir, archivo.archivo_path);

      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ ${archivo.evento_id}/${archivo.id}: ${archivo.nombre_archivo} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
        archivosBien++;

        // Contar duplicados
        if (!archivosDuplicados[archivo.archivo_path]) {
          archivosDuplicados[archivo.archivo_path] = [];
        }
        archivosDuplicados[archivo.archivo_path].push({
          id: archivo.id,
          evento_id: archivo.evento_id
        });
      } else {
        console.log(`❌ ${archivo.evento_id}/${archivo.id}: NO ENCONTRADO - ${archivo.archivo_path}`);
        archivosNoEncontrados.push({
          id: archivo.id,
          evento_id: archivo.evento_id,
          archivo_path: archivo.archivo_path
        });
      }
    }

    // 3. Buscar archivos en el servidor que no estén en BD
    console.log("\nBuscando archivos huérfanos en el servidor...\n");

    const archivosEnServidor = fs.readdirSync(uploadsDir);
    for (const nombreArchivo of archivosEnServidor) {
      const existe = archivosEnBD.some(a => 
        a.archivo_path === nombreArchivo || a.nombre_archivo === nombreArchivo
      );

      if (!existe && nombreArchivo !== '.gitkeep') {
        console.log(`🪦 HUÉRFANO: ${nombreArchivo}`);
        archivosHuerfanos.push(nombreArchivo);
      }
    }

    // 4. Reporte
    console.log("\n" + "=".repeat(60));
    console.log("📊 REPORTE DE AUDITORÍA:");
    console.log("=".repeat(60));
    console.log(`✅ Archivos intactos: ${archivosBien}`);
    console.log(`❌ Archivos NO encontrados: ${archivosNoEncontrados.length}`);
    console.log(`🪦 Archivos huérfanos: ${archivosHuerfanos.length}`);

    // Mostrar duplicados
    const duplicados = Object.values(archivosDuplicados).filter(arr => arr.length > 1);
    if (duplicados.length > 0) {
      console.log(`⚠️  Posibles duplicados: ${duplicados.length}`);
    }

    console.log("=".repeat(60) + "\n");

    if (archivosNoEncontrados.length > 0) {
      console.log("❌ ARCHIVOS FALTANTES (no están en el servidor):");
      archivosNoEncontrados.forEach(a => {
        console.log(`   - Evento ${a.evento_id}, Archivo ID ${a.id}: ${a.archivo_path}`);
      });
      console.log();
    }

    if (archivosHuerfanos.length > 0) {
      console.log("🪦 ARCHIVOS HUÉRFANOS (están en servidor pero no en BD):");
      archivosHuerfanos.forEach(a => {
        console.log(`   - ${a}`);
      });
      console.log();
    }

    if (archivosNoEncontrados.length === 0 && archivosHuerfanos.length === 0) {
      console.log("✨ ¡Todos los archivos están intactos y correctamente referenciados!\n");
    } else {
      console.log("⚠️  Se encontraron problemas. Revisa arriba para detalles.\n");
    }

    if (archivosHuerfanos.length > 0) {
      console.log("💡 Sugerencia: ejecutar 'node backend/migrations/limpiarHuerfanos.js' para remover archivos huérfanos\n");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error en auditoría:", error);
    process.exit(1);
  }
};

auditoriaArchivos();
