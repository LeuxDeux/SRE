-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: db-sre
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categorias`
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
  `descripcion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES (1,'Académico','#3498db',1,'2025-10-27 18:41:08','2026-01-28 21:49:33','media',15,NULL,'Hola'),(2,'Cultural','#9b59b6',1,'2025-10-27 18:41:08','2025-10-27 18:41:08','media',15,NULL,NULL),(3,'Administrativo','#e74c3c',1,'2025-10-27 18:41:08','2025-10-27 18:41:08','media',15,NULL,NULL),(5,'Congreso','#004875',1,'2025-10-27 18:51:59','2025-10-27 18:51:59','media',15,NULL,NULL),(6,'Categoria Prueba','#94d237',NULL,'2025-10-27 20:12:04','2026-02-09 20:55:35','media',15,'','aaa'),(8,'URGENTE','#e74c3c',1,'2025-10-30 20:09:34','2025-10-30 20:09:34','alta',1,NULL,NULL),(9,'Categoria con Email','#2c3e50',1,'2025-12-17 22:07:01','2025-12-17 22:07:01','alta',1,'pclzbackup@gmail.com',NULL),(10,'Buenos Días','#00fbff',1,'2026-01-28 21:58:55','2026-01-28 21:58:55','alta',1,'brunozeballos@gmail.com',NULL),(11,'Categoría de Prueba con Tooltip','#3498db',1,'2026-01-28 22:01:49','2026-01-28 22:01:49','media',15,'prueba@prueba','Categoría de Prueba con Tooltip');
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `espacios`
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `espacios`
--

LOCK TABLES `espacios` WRITE;
/*!40000 ALTER TABLE `espacios` DISABLE KEYS */;
INSERT INTO `espacios` VALUES (1,'Auditorio','Descripción...',100,'Edificio Central','disponible',NULL,1,4,'',1,'2025-11-27 22:40:40','2025-12-04 22:12:56'),(2,'Patio','Descripción...',500,'Centro','disponible',NULL,0,24,'',1,'2025-12-04 21:56:20','2025-12-04 22:13:02');
/*!40000 ALTER TABLE `espacios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `espacios_recursos`
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `espacios_recursos`
--

LOCK TABLES `espacios_recursos` WRITE;
/*!40000 ALTER TABLE `espacios_recursos` DISABLE KEYS */;
INSERT INTO `espacios_recursos` VALUES (1,1,1,10,1,'2026-02-11 22:28:35'),(2,2,5,1,1,'2026-02-11 22:28:43'),(3,1,2,5,1,'2026-02-11 22:36:28'),(4,1,8,5,1,'2026-02-12 19:35:14'),(5,1,7,1,1,'2026-02-12 19:35:55');
/*!40000 ALTER TABLE `espacios_recursos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eventos`
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eventos`
--

LOCK TABLES `eventos` WRITE;
/*!40000 ALTER TABLE `eventos` DISABLE KEYS */;
INSERT INTO `eventos` VALUES (1,'Evento de Prueba','2026-11-27',NULL,'Evento de Prueba','evento-1764282622058-763294228.pdf',8,1,'Secretaria Administrativa','2025-11-27 22:30:22','2026-02-11 21:31:11','ejemplo@ejemplo.com','+5412345678','16:00:00','17:00:00','Laboratorio 1','Público General','google.com','Se necesitarán microfonos...'),(2,'Evento hacia 2 correos','2025-12-01',NULL,'Descripción de prueba',NULL,8,1,'Secretaria Administrativa','2025-12-01 17:16:07','2025-12-01 17:16:07','ejemplo@ejemplo.com','','16:00:00','17:00:00','Laboratorio 3','Público General','',''),(3,'Evento Prueba Nuevo Mail','2025-12-17','2025-12-17','Descripción Breve',NULL,9,1,'Secretaria Administrativa','2025-12-17 22:07:42','2025-12-17 22:07:42','ejemplo@ejemplo.com','','16:00:00','17:00:00','Laboratorio 3','Docentes','',''),(4,'asdasdasd','2026-02-21','2026-02-21','asdasdasdasd',NULL,8,1,'Secretaria Administrativa','2025-12-21 03:25:09','2025-12-21 03:25:09','ejemplo@ejemplo','','16:00:00','17:00:00','Salón de Actos','Estudiantes','',''),(5,'Ejemplo','2026-03-17',NULL,'Ejemplo',NULL,1,1,'Secretaria Administrativa','2026-02-10 01:05:47','2026-02-10 01:05:47','','','16:00:00','00:00:00','Bar','Egresados','',''),(6,'a','2026-02-12','2026-02-12','asdasdasdasd',NULL,10,1,'Secretaria Administrativa','2026-02-11 20:07:30','2026-02-11 20:07:30','','','16:00:00','17:00:00','Salón de Extensión 2','Estudiantes','','');
/*!40000 ALTER TABLE `eventos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eventos_archivos`
--

DROP TABLE IF EXISTS `eventos_archivos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos_archivos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evento_id` int NOT NULL,
  `nombre_archivo` varchar(255) DEFAULT NULL,
  `archivo_path` varchar(500) DEFAULT NULL,
  `tamao` int DEFAULT NULL,
  `tipo_archivo` varchar(255) DEFAULT NULL,
  `fecha_carga` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `evento_id` (`evento_id`),
  CONSTRAINT `eventos_archivos_ibfk_1` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eventos_archivos`
--

LOCK TABLES `eventos_archivos` WRITE;
/*!40000 ALTER TABLE `eventos_archivos` DISABLE KEYS */;
INSERT INTO `eventos_archivos` VALUES (7,6,'LAUTARO _TUP2024 (6) (FinalS).pdf','evento-1770840450897-859825009.pdf',1878137,'pdf','2026-02-11 20:07:30'),(8,6,'Soto Walter-0073.pdf','evento-1770840450906-263326906.pdf',86263,'pdf','2026-02-11 20:07:30'),(9,1,'LAUTARO _TUP2024 (6) (FinalS) (1).pdf','evento-1770845471650-618934328.pdf',1878137,'pdf','2026-02-11 21:31:11');
/*!40000 ALTER TABLE `eventos_archivos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `historial_eventos`
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_eventos`
--

LOCK TABLES `historial_eventos` WRITE;
/*!40000 ALTER TABLE `historial_eventos` DISABLE KEYS */;
INSERT INTO `historial_eventos` VALUES (1,1,1,'creado','[\"Evento creado inicialmente\", \"Con archivo adjunto\", \"Con descripción\", \"Con correo de contacto\", \"Con teléfono\", \"Con hora de inicio\", \"Con hora de finalización\", \"Con lugar especificado\", \"Con público destinatario\", \"Con links relevantes\", \"Con observaciones adicionales\"]','2025-11-27 22:30:22',NULL,'{\"links\": \"google.com\", \"lugar\": \"Laboratorio 1\", \"nombre\": \"Evento de Prueba\", \"hora_fin\": \"17:00\", \"telefono\": \"+5412345678\", \"descripcion\": \"Evento de Prueba\", \"hora_inicio\": \"16:00\", \"categoria_id\": \"8\", \"fecha_evento\": \"2025-11-27\", \"fechaFinValue\": null, \"observaciones\": \"Se necesitarán microfonos...\", \"correo_contacto\": \"ejemplo@ejemplo.com\", \"publico_destinatario\": \"Público General\"}'),(2,2,1,'creado','[\"Evento creado inicialmente\", \"Con descripción\", \"Con correo de contacto\", \"Con hora de inicio\", \"Con hora de finalización\", \"Con lugar especificado\", \"Con público destinatario\"]','2025-12-01 17:16:07',NULL,'{\"links\": \"\", \"lugar\": \"Laboratorio 3\", \"nombre\": \"Evento hacia 2 correos\", \"hora_fin\": \"17:00\", \"telefono\": \"\", \"descripcion\": \"Descripción de prueba\", \"hora_inicio\": \"16:00\", \"categoria_id\": \"8\", \"fecha_evento\": \"2025-12-01\", \"fechaFinValue\": null, \"observaciones\": \"\", \"correo_contacto\": \"ejemplo@ejemplo.com\", \"publico_destinatario\": \"Público General\"}'),(3,3,1,'creado','[\"Evento creado inicialmente\", \"Con descripción\", \"Con correo de contacto\", \"Con hora de inicio\", \"Con hora de finalización\", \"Con lugar especificado\", \"Con público destinatario\"]','2025-12-17 22:07:42',NULL,'{\"links\": \"\", \"lugar\": \"Laboratorio 3\", \"nombre\": \"Evento Prueba Nuevo Mail\", \"hora_fin\": \"17:00\", \"telefono\": \"\", \"descripcion\": \"Descripción Breve\", \"hora_inicio\": \"16:00\", \"categoria_id\": \"9\", \"fecha_evento\": \"2025-12-17\", \"fechaFinValue\": \"2025-12-17\", \"observaciones\": \"\", \"correo_contacto\": \"ejemplo@ejemplo.com\", \"publico_destinatario\": \"Docentes\"}'),(4,4,1,'creado','[\"Evento creado inicialmente\", \"Con descripción\", \"Con correo de contacto\", \"Con hora de inicio\", \"Con hora de finalización\", \"Con lugar especificado\", \"Con público destinatario\"]','2025-12-21 03:25:09',NULL,'{\"links\": \"\", \"lugar\": \"Salón de Actos\", \"nombre\": \"asdasdasd\", \"hora_fin\": \"17:00\", \"telefono\": \"\", \"descripcion\": \"asdasdasdasd\", \"hora_inicio\": \"16:00\", \"categoria_id\": \"8\", \"fecha_evento\": \"2026-02-21\", \"fechaFinValue\": \"2026-02-21\", \"observaciones\": \"\", \"correo_contacto\": \"ejemplo@ejemplo\", \"publico_destinatario\": \"Estudiantes\"}'),(5,5,1,'creado','[\"Evento creado inicialmente\", \"Con descripción\", \"Con hora de inicio\", \"Con lugar especificado\", \"Con público destinatario\"]','2026-02-10 01:05:47',NULL,'{\"links\": \"\", \"lugar\": \"Bar\", \"nombre\": \"Ejemplo\", \"hora_fin\": \"\", \"telefono\": \"\", \"descripcion\": \"Ejemplo\", \"hora_inicio\": \"16:00\", \"categoria_id\": \"1\", \"fecha_evento\": \"2026-03-17\", \"fechaFinValue\": null, \"observaciones\": \"\", \"correo_contacto\": \"\", \"publico_destinatario\": \"Egresados\"}'),(6,6,1,'creado','[\"Evento creado inicialmente\", \"Con 2 archivo(s) adjunto(s)\", \"Con descripción\", \"Con hora de inicio\", \"Con hora de finalización\", \"Con lugar especificado\", \"Con público destinatario\"]','2026-02-11 20:07:30',NULL,'{\"links\": \"\", \"lugar\": \"Salón de Extensión 2\", \"nombre\": \"a\", \"hora_fin\": \"17:00\", \"telefono\": \"\", \"descripcion\": \"asdasdasdasd\", \"hora_inicio\": \"16:00\", \"categoria_id\": \"10\", \"fecha_evento\": \"2026-02-12\", \"fechaFinValue\": \"2026-02-12\", \"observaciones\": \"\", \"correo_contacto\": \"\", \"publico_destinatario\": \"Estudiantes\"}'),(7,1,1,'actualizado','[\"Fecha del evento: 27/11/2025 → 27/11/2026\", \"Archivos: Se agregaron 1 nuevo(s) archivo(s)\"]','2026-02-11 21:31:11','{\"categoria_id\": 8, \"fecha_evento\": \"2025-11-27T03:00:00.000Z\"}','{\"categoria_id\": \"8\", \"fecha_evento\": \"2026-11-27\"}');
/*!40000 ALTER TABLE `historial_eventos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recursos`
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recursos`
--

LOCK TABLES `recursos` WRITE;
/*!40000 ALTER TABLE `recursos` DISABLE KEYS */;
INSERT INTO `recursos` VALUES (1,'Microfono Inalambrico','Microfonos Inalambricos para conferencias',10,1,'2025-11-27 22:41:08','2026-02-11 21:51:46'),(2,'Notebook','',5,1,'2025-11-27 22:41:20','2026-02-11 21:51:46'),(3,'a','a',1,1,'2026-02-11 21:44:06','2026-02-11 21:51:01'),(5,'aaa','aaa',1,1,'2026-02-11 21:45:43','2026-02-11 21:49:34'),(6,'b','b',1,1,'2026-02-11 21:50:58','2026-02-11 21:51:46'),(7,'Recurso de Prueba 1','Recurso de Prueba 1',5,1,'2026-02-12 19:31:42','2026-02-12 19:31:59'),(8,'Recurso de Prueba 2','Recurso de Prueba 2',5,1,'2026-02-12 19:31:51','2026-02-12 19:31:51');
/*!40000 ALTER TABLE `recursos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservas`
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
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_reserva` (`numero_reserva`),
  KEY `aprobador_id` (`aprobador_id`),
  KEY `idx_espacio_fechas` (`espacio_id`,`fecha_inicio`,`fecha_fin`),
  KEY `idx_estado` (`estado`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_creador` (`creador_id`),
  KEY `idx_fecha_solicitud` (`fecha_solicitud`),
  KEY `idx_fecha_eliminacion` (`fecha_eliminacion`),
  CONSTRAINT `reservas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `reservas_ibfk_2` FOREIGN KEY (`espacio_id`) REFERENCES `espacios` (`id`),
  CONSTRAINT `reservas_ibfk_3` FOREIGN KEY (`creador_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `reservas_ibfk_4` FOREIGN KEY (`aprobador_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservas`
--

LOCK TABLES `reservas` WRITE;
/*!40000 ALTER TABLE `reservas` DISABLE KEYS */;
INSERT INTO `reservas` VALUES (8,'RES-2025-001',1,1,'2025-12-05','16:00:00','2025-12-05','17:00:00','Prueba','Prueba','reunion',1,'confirmada',1,1,1,'2025-12-05 19:29:48','2025-12-05 19:32:10',0,NULL,NULL,NULL),(9,'RES-2025-002',1,2,'2025-12-05','16:00:00','2025-12-05','17:00:00','Patio','Patio','reunion',1,'confirmada',0,1,NULL,'2025-12-05 21:54:40',NULL,0,NULL,NULL,NULL),(10,'RES-2025-003',1,1,'2025-12-06','17:00:00','2025-12-06','18:00:00','Prueba 2','','reunion',1,'rechazada',1,1,1,'2025-12-05 22:17:21',NULL,0,NULL,NULL,NULL),(11,'RES-2025-004',1,1,'2025-12-09','16:00:00','2025-12-09','17:00:00','Prueba 9/12','','reunion',1,'rechazada',1,1,1,'2025-12-09 20:51:51',NULL,0,NULL,NULL,NULL),(12,'RES-2025-005',1,2,'2025-12-22','16:00:00','2025-12-22','17:00:00','Reserva de Prueba','Esta es una reserva de Prueba','reunion',5,'confirmada',0,1,NULL,'2025-12-21 03:23:09',NULL,0,NULL,NULL,NULL),(13,'RES-2025-006',1,2,'2025-12-23','16:00:00','2025-12-23','17:00:00','Reserva Prueba 2','Esta es unad escripción','reunion',5,'confirmada',0,1,NULL,'2025-12-21 19:05:05',NULL,0,NULL,NULL,NULL),(14,'RES-2025-007',1,2,'2025-12-28','16:00:00','2025-12-28','17:00:00','Otro ejemplo','Otra descripcion','reunion',1,'confirmada',0,1,NULL,'2025-12-21 19:19:00',NULL,0,NULL,NULL,NULL),(15,'RES-2025-008',1,1,'2025-12-30','16:00:00','2025-12-30','17:00:00','Otro ejemplo 2','Otro ejemplo 2','reunion',1,'confirmada',1,1,1,'2025-12-21 19:23:18','2025-12-21 19:23:25',0,NULL,NULL,NULL),(16,'RES-2025-009',1,2,'2025-12-31','16:00:00','2025-12-31','17:00:00','Otro ejemplo...','Otro ejemplo...','reunion',1,'confirmada',0,1,NULL,'2025-12-22 12:07:03',NULL,0,NULL,NULL,NULL),(17,'RES-2026-001',1,1,'2026-01-29','02:00:00','2026-01-29','02:30:00','Reserva Ejemplo','Ejemplo','reunion',100,'confirmada',1,1,1,'2026-01-29 20:15:22','2026-01-29 20:19:03',0,NULL,NULL,NULL),(18,'RES-2026-002',1,2,'2026-01-29','16:00:00','2026-01-29','17:00:00','Otra reserva de prueba','','reunion',1,'confirmada',0,1,NULL,'2026-01-29 22:51:56',NULL,0,NULL,NULL,NULL),(19,'RES-2026-003',1,1,'2025-02-24','14:00:00','2025-02-24','18:00:00','Ejemplo','','reunion',1,'confirmada',1,1,1,'2026-01-29 22:53:17','2026-02-10 02:15:04',0,'','',NULL),(20,'RES-2026-004',1,1,'2026-03-24','17:02:00','2026-03-24','18:02:00','Ejemplo234','Descripción23','otro',7,'confirmada',1,1,1,'2026-02-10 01:10:14','2026-02-10 01:10:39',0,'','a2','2026-02-10 20:16:27'),(21,'RES-2026-005',1,1,'2026-02-11','16:00:00','2026-02-11','17:00:00','Ejemplo','Ejemplo','clase',5,'cancelada',1,1,NULL,'2026-02-11 22:23:19',NULL,0,NULL,NULL,NULL),(22,'RES-2026-006',1,1,'2026-02-12','13:00:00','2026-02-12','14:00:00','bbb','bbbb','reunion',1,'pendiente',1,1,NULL,'2026-02-11 22:37:22',NULL,0,NULL,NULL,NULL);
/*!40000 ALTER TABLE `reservas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservas_historial`
--

DROP TABLE IF EXISTS `reservas_historial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservas_historial` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reserva_id` int NOT NULL,
  `datos_anteriores` json NOT NULL,
  `tipo_cambio` enum('creacion','edicion','aprobacion','rechazo','cancelacion','eliminacion') COLLATE utf8mb4_unicode_ci DEFAULT 'edicion',
  `realizado_por` int NOT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `fecha_cambio` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `reserva_id` (`reserva_id`),
  KEY `realizado_por` (`realizado_por`),
  CONSTRAINT `reservas_historial_ibfk_1` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reservas_historial_ibfk_2` FOREIGN KEY (`realizado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservas_historial`
--

LOCK TABLES `reservas_historial` WRITE;
/*!40000 ALTER TABLE `reservas_historial` DISABLE KEYS */;
INSERT INTO `reservas_historial` VALUES (7,19,'{\"motivo\": \"reunion\", \"titulo\": \"Ejemplo\", \"hora_fin\": \"18:00:00\", \"fecha_fin\": \"2025-02-20\", \"descripcion\": \"\", \"hora_inicio\": \"14:00:00\", \"fecha_inicio\": \"2025-02-20\", \"cantidad_participantes\": 1}','edicion',1,'Editada por admin','2026-02-10 02:22:19'),(8,19,'{\"motivo\": \"reunion\", \"titulo\": \"Ejemplo\", \"hora_fin\": \"18:00:00\", \"fecha_fin\": \"2025-02-22\", \"descripcion\": \"\", \"hora_inicio\": \"14:00:00\", \"fecha_inicio\": \"2025-02-22\", \"cantidad_participantes\": 1}','edicion',1,'Editada por admin','2026-02-10 02:23:34'),(9,20,'{\"motivo\": \"otro\", \"titulo\": \"Ejemplo23\", \"hora_fin\": \"17:02:00\", \"fecha_fin\": \"2026-03-18\", \"descripcion\": \"Descripción23\", \"hora_inicio\": \"16:02:00\", \"fecha_inicio\": \"2026-03-18\", \"cantidad_participantes\": 7}','edicion',1,'Editada por admin','2026-02-10 02:24:20'),(10,20,'{\"motivo\": \"otro\", \"titulo\": \"Ejemplo23\", \"hora_fin\": \"17:02:00\", \"fecha_fin\": \"2026-03-20\", \"descripcion\": \"Descripción23\", \"hora_inicio\": \"16:02:00\", \"fecha_inicio\": \"2026-03-20\", \"cantidad_participantes\": 7}','edicion',1,'Editada por admin','2026-02-10 20:55:46'),(11,20,'{\"motivo\": \"otro\", \"titulo\": \"Ejemplo23\", \"hora_fin\": \"18:02:00\", \"fecha_fin\": \"2026-03-24\", \"descripcion\": \"Descripción23\", \"hora_inicio\": \"17:02:00\", \"fecha_inicio\": \"2026-03-24\", \"cantidad_participantes\": 7}','edicion',1,'Editada por admin','2026-02-10 20:57:29');
/*!40000 ALTER TABLE `reservas_historial` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservas_recursos`
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
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservas_recursos`
--

LOCK TABLES `reservas_recursos` WRITE;
/*!40000 ALTER TABLE `reservas_recursos` DISABLE KEYS */;
INSERT INTO `reservas_recursos` VALUES (5,15,1,3,NULL,NULL,'2025-12-21 19:23:18'),(6,15,2,1,NULL,NULL,'2025-12-21 19:23:18'),(7,16,1,1,NULL,NULL,'2025-12-22 12:07:03'),(8,17,1,5,NULL,NULL,'2026-01-29 20:15:22'),(9,20,1,3,NULL,NULL,'2026-02-10 01:10:14'),(10,20,2,1,NULL,NULL,'2026-02-10 01:10:14'),(11,21,1,5,NULL,NULL,'2026-02-11 22:23:19'),(12,21,6,1,NULL,NULL,'2026-02-11 22:23:19'),(13,22,2,5,NULL,NULL,'2026-02-11 22:37:22'),(14,22,1,5,NULL,NULL,'2026-02-11 22:37:22');
/*!40000 ALTER TABLE `reservas_recursos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `secretarias`
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
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `secretarias`
--

LOCK TABLES `secretarias` WRITE;
/*!40000 ALTER TABLE `secretarias` DISABLE KEYS */;
INSERT INTO `secretarias` VALUES (1,'Secretaria Administrativa',NULL,1,'2025-11-04 02:52:09','2025-11-04 03:24:43'),(2,'Secretaría Académica',NULL,1,'2025-11-04 02:52:09','2025-11-04 02:52:09'),(3,'Tesoreria',NULL,1,'2025-11-04 02:52:09','2025-11-04 02:52:09'),(4,'Secretaría de Extensión Universitaria',NULL,1,'2025-11-04 02:52:09','2025-11-04 02:52:09'),(5,'Secretaría de Ciencia y Tecnologia',NULL,1,'2025-11-04 02:52:09','2025-11-04 02:52:09'),(6,'Secretaria General',NULL,1,'2025-11-04 02:52:09','2025-11-04 02:52:09'),(7,'Subsecretaria de Asuntos Estudiantiles',NULL,1,'2025-11-04 02:52:09','2025-11-04 02:52:09'),(8,'Secretaria de Carreras Cortas',NULL,1,'2025-11-04 02:52:09','2025-11-04 02:52:09'),(9,'Mesa de Entrada',NULL,1,'2025-11-04 02:52:09','2025-11-04 02:52:09'),(10,'TIC',NULL,1,'2025-11-04 02:52:09','2025-11-04 02:52:09'),(11,'Decanato',NULL,1,'2025-11-04 02:52:09','2025-11-04 02:52:09');
/*!40000 ALTER TABLE `secretarias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'admin','Administrador Principal','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin@universidad.edu.ar','','admin',1,1,'2025-10-22 18:26:19','2025-11-04 03:34:26',NULL,NULL),(2,'maria.garcia','María García','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','maria@universidad.edu.ar','','secretaria',2,1,'2025-10-22 18:26:19','2025-11-04 03:35:28',NULL,NULL),(3,'test.user','Usuario Test','$2b$10$8fuKHIq7t6wD63nNrNGhMuQUkliE4ePuXkMc.k/oZgvnjXd6blItS','test@universidad.edu.ar','','secretaria',3,1,'2025-11-03 17:43:55','2025-11-04 03:34:26',NULL,NULL),(4,'usuario','Usuario Normal','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','usuario@universidad.edu.ar',NULL,'usuario',4,1,'2025-11-03 17:43:55','2025-11-04 03:34:26',NULL,NULL),(5,'Ejemplo','ejemplo','$2b$10$Bd9VViFM7s6./Htn228WQe970HxcBU6.cjkijQx8Ly/9k9.Fjn5/C','','','secretaria',3,1,'2025-12-18 14:30:29','2025-12-18 14:30:29',NULL,NULL);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'db-sre'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-23 18:01:38
