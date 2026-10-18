-- =====================================================================
-- SRE — Cambios de base de datos para el VPS
-- =====================================================================
-- Ejecutar MANUALMENTE sobre la base `db_sre` del VPS (MariaDB).
-- Recomendado: probar primero en una copia / staging y hacer un backup.
--
-- Reúne TODOS los cambios que hoy existen en local y faltan en producción:
--   1) eventos: columnas de aprobación + resolución.
--   2) eventos: vínculo con la reserva de origen (reserva_id).
--   3) auditoria_modulo_reservas: tabla de auditoría del módulo de reservas.
--   4) espacios: forzar requiere_aprobacion = 1 (todos requieren aprobación).
--
-- ⚠️ Los ALTER/UPDATE NO son idempotentes: si un paso ya fue aplicado,
--    comentarlo antes de re-ejecutar (evita errores por columnas/índices
--    o constraints duplicados). El CREATE TABLE sí es idempotente.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) y 2) EVENTOS: columnas de aprobación y vínculo con reserva
-- ---------------------------------------------------------------------
ALTER TABLE eventos
  ADD COLUMN estado_aprobacion ENUM(
    'no_requerida',
    'pendiente',
    'aprobada',
    'rechazada'
  ) NOT NULL DEFAULT 'no_requerida',
  ADD COLUMN secretaria_id_responsable INT NULL,
  ADD COLUMN resuelto_por INT NULL,
  ADD COLUMN resuelto_at DATETIME NULL,
  ADD COLUMN motivo_rechazo TEXT NULL,
  ADD COLUMN reserva_id INT NULL,
  ADD INDEX idx_eventos_aprobacion_area (
    estado_aprobacion,
    secretaria_id_responsable
  ),
  ADD INDEX idx_eventos_reserva (reserva_id),
  ADD CONSTRAINT fk_eventos_resuelto_por
    FOREIGN KEY (resuelto_por) REFERENCES usuarios(id),
  ADD CONSTRAINT fk_eventos_secretaria_responsable
    FOREIGN KEY (secretaria_id_responsable) REFERENCES secretarias(id),
  ADD CONSTRAINT fk_eventos_reserva
    FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE SET NULL;


-- ---------------------------------------------------------------------
-- 3) AUDITORÍA DEL MÓDULO DE RESERVAS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria_modulo_reservas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id INT NULL,
  actor_role VARCHAR(32) NOT NULL,
  secretaria_id INT NULL,
  accion VARCHAR(80) NOT NULL,
  entidad_tipo VARCHAR(50) NOT NULL,
  entidad_id INT NULL,
  reserva_id INT NULL,
  datos_anteriores JSON NULL,
  datos_nuevos JSON NULL,
  observaciones TEXT NULL,
  fecha_accion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auditoria_fecha (fecha_accion),
  KEY idx_auditoria_area_fecha (secretaria_id, fecha_accion),
  KEY idx_auditoria_actor_fecha (actor_id, fecha_accion),
  KEY idx_auditoria_entidad (entidad_tipo, entidad_id),
  KEY idx_auditoria_reserva (reserva_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- 4) TODOS LOS ESPACIOS REQUIEREN APROBACIÓN
-- ---------------------------------------------------------------------
-- Fuerza el flag en los espacios existentes. Los nuevos ya se crean con 1.
UPDATE espacios SET requiere_aprobacion = 1;


-- ---------------------------------------------------------------------
-- 5) SECRETARÍAS QUE APRUEBAN TODO (Decanato)
-- ---------------------------------------------------------------------
ALTER TABLE secretarias
  ADD COLUMN aprueba_todo TINYINT(1) NOT NULL DEFAULT 0;

-- Decanato (id 11) puede aprobar lo de cualquier secretaría
UPDATE secretarias SET aprueba_todo = 1 WHERE id = 11;


-- ---------------------------------------------------------------------
-- 6) APROBACIÓN CRUZADA ENTRE SECRETARÍAS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS secretarias_aprobadoras (
  id INT NOT NULL AUTO_INCREMENT,
  secretaria_id INT NOT NULL,               -- quién puede aprobar
  aprueba_para_secretaria_id INT NOT NULL,  -- para qué secretaría (área responsable)
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unico_par (secretaria_id, aprueba_para_secretaria_id),
  KEY idx_sa_secretaria (secretaria_id),
  KEY idx_sa_para (aprueba_para_secretaria_id),
  CONSTRAINT fk_sa_secretaria FOREIGN KEY (secretaria_id) REFERENCES secretarias(id) ON DELETE CASCADE,
  CONSTRAINT fk_sa_para FOREIGN KEY (aprueba_para_secretaria_id) REFERENCES secretarias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cruces definidos:
--   Administrativa (1) <-> General (6)
--   Administrativa (1) y General (6) aprueban Tesorería (3) y TIC (10)
--   Extensión (4) aprueba Subsecretaría de Asuntos Estudiantiles (7)
--   Decanato (11) aprueba todo (por el flag aprueba_todo)
INSERT INTO secretarias_aprobadoras (secretaria_id, aprueba_para_secretaria_id) VALUES
  (1, 6),
  (6, 1),
  (1, 3),
  (1, 10),
  (6, 3),
  (6, 10),
  (4, 7);


-- ---------------------------------------------------------------------
-- 7) AUDITORÍA DEL MÓDULO DE EVENTOS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria_modulo_eventos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id INT NULL,
  actor_role VARCHAR(32) NOT NULL,
  secretaria_id INT NULL,
  accion VARCHAR(80) NOT NULL,
  entidad_tipo VARCHAR(50) NOT NULL,
  entidad_id INT NULL,
  evento_id INT NULL,
  reserva_id INT NULL,
  datos_anteriores JSON NULL,
  datos_nuevos JSON NULL,
  observaciones TEXT NULL,
  fecha_accion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auditoria_eventos_fecha (fecha_accion),
  KEY idx_auditoria_eventos_area_fecha (secretaria_id, fecha_accion),
  KEY idx_auditoria_eventos_actor_fecha (actor_id, fecha_accion),
  KEY idx_auditoria_eventos_entidad (entidad_tipo, entidad_id),
  KEY idx_auditoria_eventos_evento (evento_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- Notas
-- =====================================================================
-- * `espacios.secretaria_id` queda en desuso (el código ya no lo usa), pero
--   NO se elimina para evitar una migración destructiva.
-- * El código de la app no funcionará en el VPS hasta aplicar los puntos
--   1, 2 y 3. El punto 4 es de datos (no afecta la estructura).
-- * `eventos.reserva_id` con ON DELETE SET NULL: si se elimina una reserva,
--   el evento queda sin vínculo (no se borra).
