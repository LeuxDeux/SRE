-- Crear tabla espacios_emails para almacenar múltiples correos por espacio
-- Similar a categorias_emails pero para espacios

CREATE TABLE IF NOT EXISTS `espacios_emails` (
  `id` int NOT NULL AUTO_INCREMENT,
  `espacio_id` int NOT NULL,
  `email` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `espacio_id` (`espacio_id`),
  UNIQUE KEY `espacio_email_unique` (`espacio_id`, `email`),
  CONSTRAINT `espacios_emails_ibfk_1` FOREIGN KEY (`espacio_id`) REFERENCES `espacios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
