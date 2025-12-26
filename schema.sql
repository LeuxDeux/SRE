-- ========================================
-- SRE DATABASE SCHEMA
-- Sistema de Reserva de Espacios y Registro de Eventos
-- UTN - Facultad Regional Resistencia
-- ========================================
-- This file contains the complete database structure
-- without any data. Safe to use in production.
-- ========================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table: usuarios
-- Users of the system with roles and authentication
--
DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `nombre_completo` varchar(200) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `role` enum('secretaria','admin','usuario') DEFAULT 'secretaria',
  `secretaria_id` int DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `fecha_ultimo_login` timestamp NULL DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_usuario_secretaria` (`secretaria_id`),
  CONSTRAINT `fk_usuario_secretaria` FOREIGN KEY (`secretaria_id`) REFERENCES `secretarias` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table: secretarias
-- University secretariats/departments
--
DROP TABLE IF EXISTS `secretarias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `secretarias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `activa` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table: categorias
-- Event categories with priorities and notification settings
--
DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `color` varchar(7) DEFAULT '#3498db',
  `activa` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `prioridad` enum('alta','media','baja') DEFAULT 'media',
  `dias_antelacion` int DEFAULT '15',
  `email_contacto` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table: eventos
-- University events to be communicated
--
DROP TABLE IF EXISTS `eventos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `fecha_evento` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `descripcion` text,
  `archivo_adjunto` varchar(500) DEFAULT NULL,
  `categoria_id` int DEFAULT NULL,
  `usuario_id` int NOT NULL,
  `secretaria` varchar(100) NOT NULL,
  `fecha_carga` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ultima_modificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `correo_contacto` varchar(255) DEFAULT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  `lugar` varchar(255) DEFAULT NULL,
  `publico_destinatario` varchar(100) DEFAULT NULL,
  `links` text,
  `observaciones` text,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `idx_fecha_evento` (`fecha_evento`),
  KEY `categoria_id` (`categoria_id`),
  CONSTRAINT `eventos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `eventos_ibfk_2` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table: historial_eventos
-- Event change history and audit trail
--
DROP TABLE IF EXISTS `historial_eventos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_eventos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evento_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `accion` enum('creado','actualizado','eliminado') DEFAULT NULL,
  `cambios` json DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `valores_viejos` json DEFAULT NULL,
  `valores_nuevos` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `idx_evento_id` (`evento_id`),
  KEY `idx_fecha` (`fecha`),
  CONSTRAINT `historial_eventos_ibfk_1` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `historial_eventos_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table: espacios
-- Spaces/rooms available for reservation
--
DROP TABLE IF EXISTS `espacios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `espacios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text,
  `capacidad` int DEFAULT NULL,
  `ubicacion` varchar(255) DEFAULT NULL,
  `estado` enum('disponible','en_mantenimiento','clausurado') DEFAULT 'disponible',
  `secretaria_id` int DEFAULT NULL,
  `requiere_aprobacion` tinyint(1) DEFAULT '1',
  `max_horas_por_reserva` int DEFAULT '8',
  `imagen_url` varchar(500) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`),
  KEY `secretaria_id` (`secretaria_id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `espacios_ibfk_1` FOREIGN KEY (`secretaria_id`) REFERENCES `secretarias` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table: recursos
-- Resources that can be requested for reservations
--
DROP TABLE IF EXISTS `recursos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recursos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text,
  `cantidad_total` int NOT NULL DEFAULT '1',
  `activo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table: espacios_recursos
-- Junction table: which resources are available in each space
--
DROP TABLE IF EXISTS `espacios_recursos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `espacios_recursos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `espacio_id` int NOT NULL,
  `recurso_id` int NOT NULL,
  `cantidad_maxima` int NOT NULL DEFAULT '1',
  `disponible` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_espacio_recurso` (`espacio_id`,`recurso_id`),
  KEY `recurso_id` (`recurso_id`),
  CONSTRAINT `espacios_recursos_ibfk_1` FOREIGN KEY (`espacio_id`) REFERENCES `espacios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `espacios_recursos_ibfk_2` FOREIGN KEY (`recurso_id`) REFERENCES `recursos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table: reservas
-- Space reservations by users
--
DROP TABLE IF EXISTS `reservas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero_reserva` varchar(20) NOT NULL,
  `usuario_id` int NOT NULL,
  `espacio_id` int NOT NULL,
  `fecha_inicio` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `fecha_fin` date NOT NULL,
  `hora_fin` time NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `descripcion` text,
  `motivo` enum('clase','reunion','evento','examen','capacitacion','otro') DEFAULT 'reunion',
  `cantidad_participantes` int DEFAULT '1',
  `estado` enum('pendiente','confirmada','rechazada','cancelada','completada') DEFAULT 'pendiente',
  `requiere_aprobacion` tinyint(1) DEFAULT '1',
  `creador_id` int NOT NULL,
  `aprobador_id` int DEFAULT NULL,
  `fecha_solicitud` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_aprobacion` timestamp NULL DEFAULT NULL,
  `notificar_participantes` tinyint(1) DEFAULT '0',
  `participantes_email` text,
  `observaciones` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_reserva` (`numero_reserva`),
  KEY `aprobador_id` (`aprobador_id`),
  KEY `idx_espacio_fechas` (`espacio_id`,`fecha_inicio`,`fecha_fin`),
  KEY `idx_estado` (`estado`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_creador` (`creador_id`),
  KEY `idx_fecha_solicitud` (`fecha_solicitud`),
  CONSTRAINT `reservas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `reservas_ibfk_2` FOREIGN KEY (`espacio_id`) REFERENCES `espacios` (`id`),
  CONSTRAINT `reservas_ibfk_3` FOREIGN KEY (`creador_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `reservas_ibfk_4` FOREIGN KEY (`aprobador_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table: reservas_recursos
-- Junction table: which resources are requested in each reservation
--
DROP TABLE IF EXISTS `reservas_recursos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservas_recursos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reserva_id` int NOT NULL,
  `recurso_id` int NOT NULL,
  `cantidad_solicitada` int NOT NULL DEFAULT '1',
  `cantidad_confirmada` int DEFAULT NULL,
  `observaciones` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_reserva_recurso` (`reserva_id`,`recurso_id`),
  KEY `recurso_id` (`recurso_id`),
  CONSTRAINT `reservas_recursos_ibfk_1` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reservas_recursos_ibfk_2` FOREIGN KEY (`recurso_id`) REFERENCES `recursos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET @OLD_SQL_NOTES=@OLD_SQL_NOTES */;

-- ========================================
-- INSTRUCTIONS FOR VPS DEPLOYMENT
-- ========================================
-- 
-- 1. Create the database:
--    mysql -u root -p -e "CREATE DATABASE db_sre CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
--
-- 2. Load the schema:
--    mysql -u root -p db_sre < schema.sql
--
-- 3. After loading, create an initial admin user in the application
--    or insert directly via SQL if needed.
--
-- ========================================
