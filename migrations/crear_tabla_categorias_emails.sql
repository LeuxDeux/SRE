-- Crear tabla categorias_emails para almacenar múltiples correos por categoría
-- Fecha: 2026-02-23

CREATE TABLE IF NOT EXISTS `categorias_emails` (
  `id` int NOT NULL AUTO_INCREMENT,
  `categoria_id` int NOT NULL,
  `email` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_categoria_email` (`categoria_id`, `email`),
  KEY `idx_categoria_id` (`categoria_id`),
  CONSTRAINT `categorias_emails_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Migrar datos existentes desde email_contacto (si existen)
-- Descomentar y ejecutar después de crear la tabla si necesitas
/*
INSERT INTO categorias_emails (categoria_id, email)
SELECT id, email_contacto
FROM categorias
WHERE email_contacto IS NOT NULL AND email_contacto != '';
*/
