-- Base de datos completa de Entheos Wiki: borra lo que haya, crea las 32
-- tablas y carga roles, cuentas del equipo y datos iniciales.
-- ATENCION: borra el contenido de la base entheos.
-- Uso: mysql -u root -p entheos < base-de-datos/base-de-datos.sql   o   npm run bd:crear



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
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
DROP TABLE IF EXISTS `articulo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `articulo` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(220) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'URL amigable. Se genera del titulo',
  `resumen` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contenido_md` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Texto en Markdown, se convierte a HTML al mostrar',
  `estado` enum('borrador','en_revision','publicado','archivado','rechazado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'borrador',
  `categoria_id` tinyint unsigned DEFAULT NULL,
  `imagen_id` int unsigned DEFAULT NULL,
  `autor_id` int unsigned NOT NULL,
  `revisor_id` int unsigned DEFAULT NULL COMMENT 'Editor o Administrador que lo aprobo',
  `motivo_rechazo` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publicado_en` datetime DEFAULT NULL,
  `vistas` int unsigned NOT NULL DEFAULT '0',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_articulo_titulo` (`titulo`),
  UNIQUE KEY `uq_articulo_slug` (`slug`),
  KEY `fk_articulo_categoria` (`categoria_id`),
  KEY `fk_articulo_imagen` (`imagen_id`),
  KEY `fk_articulo_revisor` (`revisor_id`),
  KEY `ix_articulo_estado` (`estado`),
  KEY `ix_articulo_autor` (`autor_id`),
  FULLTEXT KEY `ftx_articulo` (`titulo`,`resumen`,`contenido_md`),
  CONSTRAINT `fk_articulo_autor` FOREIGN KEY (`autor_id`) REFERENCES `usuario` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_articulo_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categoria` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_articulo_imagen` FOREIGN KEY (`imagen_id`) REFERENCES `imagen` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_articulo_revisor` FOREIGN KEY (`revisor_id`) REFERENCES `usuario` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Articulos de la wiki, con flujo de borrador a publicado';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `articulo_etiqueta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `articulo_etiqueta` (
  `articulo_id` int unsigned NOT NULL,
  `etiqueta_id` smallint unsigned NOT NULL,
  PRIMARY KEY (`articulo_id`,`etiqueta_id`),
  KEY `ix_articulo_etiqueta_etiqueta` (`etiqueta_id`),
  CONSTRAINT `fk_articulo_etiqueta_articulo` FOREIGN KEY (`articulo_id`) REFERENCES `articulo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_articulo_etiqueta_etiqueta` FOREIGN KEY (`etiqueta_id`) REFERENCES `etiqueta` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Etiquetas asignadas a cada articulo';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `articulo_relacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `articulo_relacion` (
  `articulo_id` int unsigned NOT NULL,
  `articulo_relacionado_id` int unsigned NOT NULL,
  `tipo_relacion` enum('ve_tambien','contrasta_con','depende_de','parte_de','menciona') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 've_tambien',
  `nota` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`articulo_id`,`articulo_relacionado_id`),
  KEY `ix_articulo_relacion_relacionado` (`articulo_relacionado_id`),
  CONSTRAINT `fk_articulo_relacion_articulo` FOREIGN KEY (`articulo_id`) REFERENCES `articulo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_articulo_relacion_relacionado` FOREIGN KEY (`articulo_relacionado_id`) REFERENCES `articulo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Relaciones entre articulos (vease tambien, contraste, etc.)';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `categoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categoria` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `categoria_padre_id` tinyint unsigned DEFAULT NULL COMMENT 'Permite subcategorias anidadas',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categoria_nombre` (`nombre`),
  KEY `ix_categoria_padre` (`categoria_padre_id`),
  CONSTRAINT `fk_categoria_padre` FOREIGN KEY (`categoria_padre_id`) REFERENCES `categoria` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agrupacion de los articulos de la wiki';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `comentario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comentario` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `articulo_id` int unsigned NOT NULL,
  `usuario_id` int unsigned NOT NULL,
  `contenido` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('pendiente','aprobado','rechazado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente' COMMENT 'Se modera antes de mostrar',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_comentario_articulo` (`articulo_id`,`estado`),
  KEY `ix_comentario_usuario` (`usuario_id`),
  CONSTRAINT `fk_comentario_articulo` FOREIGN KEY (`articulo_id`) REFERENCES `articulo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_comentario_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Comentarios de los lectores, moderados por el Editor';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mensaje_comunidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mensaje_comunidad` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned NOT NULL,
  `contenido` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_mensaje_comunidad_usuario` (`usuario_id`),
  CONSTRAINT `fk_mensaje_comunidad_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mensajes del chat de la comunidad';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `continente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `continente` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_continente_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Continentes o grandes regiones del mundo';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `etiqueta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `etiqueta` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_etiqueta_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Etiquetas para clasificar articulos';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `faccion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faccion` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `fundacion` date DEFAULT NULL,
  `sede_id` int unsigned DEFAULT NULL COMMENT 'Sede en un punto de interes',
  `disuelta` tinyint(1) NOT NULL DEFAULT '0',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_faccion_nombre` (`nombre`),
  KEY `ix_faccion_sede` (`sede_id`),
  CONSTRAINT `fk_faccion_sede` FOREIGN KEY (`sede_id`) REFERENCES `punto_interes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Guerras, tratantes, ordenes, clanes y otras organizaciones';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `faccion_religion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faccion_religion` (
  `faccion_id` smallint unsigned NOT NULL,
  `religion_id` smallint unsigned NOT NULL,
  `intensidad` enum('oficial','principal','reconocida','tolerada','perseguida') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'reconocida',
  PRIMARY KEY (`faccion_id`,`religion_id`),
  KEY `fk_faccion_religion_religion` (`religion_id`),
  CONSTRAINT `fk_faccion_religion_faccion` FOREIGN KEY (`faccion_id`) REFERENCES `faccion` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_faccion_religion_religion` FOREIGN KEY (`religion_id`) REFERENCES `religion` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Relaciones m:n entre facciones y religiones';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `imagen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `imagen` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre_archivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre con el que se guardo en el servidor',
  `ruta` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ruta publica dentro de /public',
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ej: image/png',
  `tamano_bytes` int unsigned NOT NULL,
  `alt_texto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Descripcion para lectores de pantalla',
  `subido_por` int unsigned NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_imagen_usuario` (`subido_por`),
  CONSTRAINT `fk_imagen_usuario` FOREIGN KEY (`subido_por`) REFERENCES `usuario` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Imagenes subidas por los usuarios';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo_item_id` tinyint unsigned NOT NULL,
  `rareza_id` tinyint unsigned NOT NULL,
  `categoria_id` tinyint unsigned DEFAULT NULL,
  `imagen_id` int unsigned DEFAULT NULL,
  `peso` decimal(10,2) DEFAULT NULL COMMENT 'En kilogramos',
  `valor` decimal(12,2) DEFAULT NULL COMMENT 'En monedas del mundo',
  `requiere_nivel` smallint unsigned DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_item_nombre` (`nombre`),
  KEY `fk_item_categoria` (`categoria_id`),
  KEY `fk_item_imagen` (`imagen_id`),
  KEY `ix_item_tipo` (`tipo_item_id`),
  KEY `ix_item_rareza` (`rareza_id`),
  KEY `ix_item_nombre` (`nombre`),
  CONSTRAINT `fk_item_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categoria` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_item_imagen` FOREIGN KEY (`imagen_id`) REFERENCES `imagen` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_item_rareza` FOREIGN KEY (`rareza_id`) REFERENCES `rareza` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_item_tipo` FOREIGN KEY (`tipo_item_id`) REFERENCES `tipo_item` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Objetos, armas, herramientas y tesoros';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `item_recurso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_recurso` (
  `item_id` int unsigned NOT NULL,
  `recurso_id` smallint unsigned NOT NULL,
  `cantidad_requerida` decimal(10,2) NOT NULL DEFAULT '1.00',
  PRIMARY KEY (`item_id`,`recurso_id`),
  KEY `fk_item_recurso_recurso` (`recurso_id`),
  CONSTRAINT `fk_item_recurso_item` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_item_recurso_recurso` FOREIGN KEY (`recurso_id`) REFERENCES `recurso` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_item_recurso_cantidad` CHECK ((`cantidad_requerida` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Recursos necesarios para crear cada objeto';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lengua`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lengua` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `hablantes` int unsigned DEFAULT NULL COMMENT 'Estimacion; NULL si se desconoce',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lengua_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Idiomas y dialectos del mundo';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `localidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `localidad` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `fundacion` date DEFAULT NULL,
  `latitud` decimal(10,7) DEFAULT NULL COMMENT 'Entre -90 y 90',
  `longitud` decimal(10,7) DEFAULT NULL COMMENT 'Entre -180 y 180',
  `reino_estado_id` smallint unsigned DEFAULT NULL,
  `zona_geografica_id` smallint unsigned DEFAULT NULL,
  `tipo_asentamiento_id` tinyint unsigned NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_localidad_nombre` (`nombre`),
  KEY `fk_localidad_zona` (`zona_geografica_id`),
  KEY `ix_localidad_reino` (`reino_estado_id`),
  KEY `ix_localidad_tipo` (`tipo_asentamiento_id`),
  CONSTRAINT `fk_localidad_reino` FOREIGN KEY (`reino_estado_id`) REFERENCES `reino_estado` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_localidad_tipo` FOREIGN KEY (`tipo_asentamiento_id`) REFERENCES `tipo_asentamiento` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_localidad_zona` FOREIGN KEY (`zona_geografica_id`) REFERENCES `zona_geografica` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ck_localidad_lat` CHECK (((`latitud` is null) or (`latitud` between -(90) and 90))),
  CONSTRAINT `ck_localidad_lon` CHECK (((`longitud` is null) or (`longitud` between -(180) and 180)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ciudades, pueblos y asentamientos';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personaje`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personaje` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Como "Arconte de la Tercera Casa"',
  `descripcion` mediumtext COLLATE utf8mb4_unicode_ci,
  `raza_id` smallint unsigned DEFAULT NULL,
  `subraza_id` smallint unsigned DEFAULT NULL,
  `localidad_origen_id` int unsigned DEFAULT NULL,
  `genero` enum('femenino','masculino','otro','desconocido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'desconocido',
  `fecha_nacimiento` date DEFAULT NULL,
  `fecha_muerte` date DEFAULT NULL COMMENT 'NULL si sigue vivo',
  `estado_vital` enum('vivo','muerto','no_confirmado','desconocido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'desconocido',
  `ocupacion` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_personaje_nombre` (`nombre`),
  KEY `fk_personaje_subraza` (`subraza_id`),
  KEY `fk_personaje_localidad` (`localidad_origen_id`),
  KEY `ix_personaje_raza` (`raza_id`),
  KEY `ix_personaje_estado` (`estado_vital`),
  FULLTEXT KEY `ftx_personaje` (`nombre`,`titulo`,`descripcion`),
  CONSTRAINT `fk_personaje_localidad` FOREIGN KEY (`localidad_origen_id`) REFERENCES `localidad` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_personaje_raza` FOREIGN KEY (`raza_id`) REFERENCES `raza` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_personaje_subraza` FOREIGN KEY (`subraza_id`) REFERENCES `subraza` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Personajes del mundo';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personaje_faccion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personaje_faccion` (
  `personaje_id` int unsigned NOT NULL,
  `faccion_id` smallint unsigned NOT NULL,
  `rango` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Cargo dentro de la faccion',
  `es_lider` tinyint(1) NOT NULL DEFAULT '0',
  `desde` date DEFAULT NULL,
  `hasta` date DEFAULT NULL,
  PRIMARY KEY (`personaje_id`,`faccion_id`),
  KEY `ix_personaje_faccion_faccion` (`faccion_id`),
  CONSTRAINT `fk_personaje_faccion_faccion` FOREIGN KEY (`faccion_id`) REFERENCES `faccion` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_personaje_faccion_personaje` FOREIGN KEY (`personaje_id`) REFERENCES `personaje` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Afiliacion de cada personaje a una faccion';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personaje_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personaje_item` (
  `personaje_id` int unsigned NOT NULL,
  `item_id` int unsigned NOT NULL,
  `cantidad` int unsigned NOT NULL DEFAULT '1',
  `modo_adquisicion` enum('propio','encontrado','heredado','robo','regalo','desconocido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'desconocido',
  PRIMARY KEY (`personaje_id`,`item_id`),
  KEY `fk_personaje_item_item` (`item_id`),
  CONSTRAINT `fk_personaje_item_item` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_personaje_item_personaje` FOREIGN KEY (`personaje_id`) REFERENCES `personaje` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_personaje_item_cantidad` CHECK ((`cantidad` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Objetos que posee o llevo cada personaje';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `punto_interes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `punto_interes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('templo','fortaleza','mercado','academia','biblioteca','taberna','puerto','mina','monumento','criadero','otro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'otro',
  `localidad_id` int unsigned NOT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_punto_interes_nombre` (`nombre`),
  KEY `ix_punto_interes_localidad` (`localidad_id`),
  KEY `ix_punto_interes_tipo` (`tipo`),
  CONSTRAINT `fk_punto_interes_localidad` FOREIGN KEY (`localidad_id`) REFERENCES `localidad` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Edificios y lugares con significado en el mundo';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rareza`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rareza` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Orden de menor a mayor rareza',
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rareza_nombre` (`nombre`),
  UNIQUE KEY `uq_rareza_orden` (`orden`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Comun, poco comun, rara, epica, legendaria';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `raza`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `raza` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `longitud_caracteristica` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_raza_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Razas de Entheos';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `raza_localidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `raza_localidad` (
  `raza_id` smallint unsigned NOT NULL,
  `localidad_id` int unsigned NOT NULL,
  `porcentaje_poblacion` decimal(5,2) DEFAULT NULL COMMENT 'De 0 a 100. NULL si se desconoce',
  `notas` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`raza_id`,`localidad_id`),
  KEY `fk_raza_localidad_localidad` (`localidad_id`),
  CONSTRAINT `fk_raza_localidad_localidad` FOREIGN KEY (`localidad_id`) REFERENCES `localidad` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_raza_localidad_raza` FOREIGN KEY (`raza_id`) REFERENCES `raza` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_raza_localidad_porcentaje` CHECK (((`porcentaje_poblacion` is null) or (`porcentaje_poblacion` between 0 and 100)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Razas que habitan cada localidad, con su porcentaje';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `raza_religion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `raza_religion` (
  `raza_id` smallint unsigned NOT NULL,
  `religion_id` smallint unsigned NOT NULL,
  `grado` enum('mayoritaria','comun','minoritaria','perseguida') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'comun' COMMENT 'Como se relaciona la raza con la religion',
  `porcentaje_practicantes` decimal(5,2) DEFAULT NULL COMMENT 'De 0 a 100. NULL si se desconoce',
  `notas` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`raza_id`,`religion_id`),
  KEY `fk_raza_religion_religion` (`religion_id`),
  CONSTRAINT `fk_raza_religion_raza` FOREIGN KEY (`raza_id`) REFERENCES `raza` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_raza_religion_religion` FOREIGN KEY (`religion_id`) REFERENCES `religion` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_raza_religion_porcentaje` CHECK (((`porcentaje_practicantes` is null) or (`porcentaje_practicantes` between 0 and 100)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Religiones que practica cada raza, con su grado';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `recurso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recurso` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `unidad_medida` enum('kilogramo','gramo','litro','metro','unidad','libra','onza') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unidad',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_recurso_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Materias primas para fabricar o consumir objetos';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reino_estado`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reino_estado` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `fundacion` date DEFAULT NULL,
  `disuelto` tinyint(1) NOT NULL DEFAULT '0',
  `continente_id` tinyint unsigned NOT NULL,
  `capital_id` int unsigned DEFAULT NULL COMMENT 'Se agrega con ALTER TABLE mas abajo',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reino_estado_nombre` (`nombre`),
  KEY `ix_reino_estado_continente` (`continente_id`),
  KEY `ix_reino_estado_capital` (`capital_id`),
  CONSTRAINT `fk_reino_estado_capital` FOREIGN KEY (`capital_id`) REFERENCES `localidad` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_reino_estado_continente` FOREIGN KEY (`continente_id`) REFERENCES `continente` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reinos, republicas, imperios y estados politicos';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `religion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `religion` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `dogma` text COLLATE utf8mb4_unicode_ci,
  `fundacion` date DEFAULT NULL,
  `creada_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_religion_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Religiones y cultos';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rol` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Lector, Editor o Administrador',
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rol_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Los tres roles exigidos por el proyecto';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subraza`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subraza` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `raza_id` smallint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subraza_nombre` (`nombre`),
  KEY `ix_subraza_raza` (`raza_id`),
  CONSTRAINT `fk_subraza_raza` FOREIGN KEY (`raza_id`) REFERENCES `raza` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Variantes dentro de una raza';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tipo_asentamiento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipo_asentamiento` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tipo_asentamiento_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ciudad, aldea, fortaleza y otras formas de poblacion';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tipo_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipo_item` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tipo_item_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Arma, armadura, herramienta, consumible, tesoro, documento';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre_usuario` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Se muestra junto al nombre en la wiki',
  `email` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Hash bcrypt. La contrasena nunca se guarda',
  `nombre_completo` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `biografia` text COLLATE utf8mb4_unicode_ci,
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1' COMMENT '0 = dado de baja, no se borra para conservar el historial',
  `rol_id` tinyint unsigned NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuario_nombre_usuario` (`nombre_usuario`),
  UNIQUE KEY `uq_usuario_email` (`email`),
  KEY `ix_usuario_rol` (`rol_id`),
  KEY `ix_usuario_activo` (`activo`),
  CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`rol_id`) REFERENCES `rol` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cuentas de la aplicacion';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `zona_geografica`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zona_geografica` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('montana','costa','desierto','selva','bosque','pradera','isla','valle','rio','otro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'otro',
  `reino_estado_id` smallint unsigned DEFAULT NULL COMMENT 'NULL si la zona es compartida entre varios estados',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_zona_geografica_nombre` (`nombre`),
  KEY `ix_zona_geografica_reino` (`reino_estado_id`),
  KEY `ix_zona_geografica_tipo` (`tipo`),
  CONSTRAINT `fk_zona_geografica_reino` FOREIGN KEY (`reino_estado_id`) REFERENCES `reino_estado` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Montanas, desiertos, selvas y demas zonas naturales';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


SET FOREIGN_KEY_CHECKS = 0;



SET NAMES utf8mb4;

INSERT IGNORE INTO rol (nombre, descripcion) VALUES
  ('Lector', 'Puede leer los articulos publicados y dejar comentarios.'),
  ('Editor', 'Puede crear y editar articulos, y moderar los comentarios.'),
  ('Administrador', 'Puede todo lo del Editor y ademas gestiona las cuentas de los usuarios.');

INSERT IGNORE INTO usuario (nombre_usuario, email, password_hash, nombre_completo, biografia, rol_id) VALUES
  ('Kendry',  'kendry@entheos.local',
   '$2b$10$q9cYR5HSVjG1RDAiZjdrC.2827N2h1mVwMFkj2kt1R/j0FMlWFDne',
   'Kendry',  'Administrador del proyecto. Crea y edita articulos y gestiona las cuentas.',
   (SELECT id FROM rol WHERE nombre = 'Administrador')),

  ('Angel',   'angel@entheos.local',
   '$2b$10$BBrvHt37Le1HL2Y5wSmS5e.qvQRkhbbI/QfxBtUBT75JGuUCwy5xC',
   'Angel',   'Editor del proyecto. Redacta y revisa articulos, y modera comentarios.',
   (SELECT id FROM rol WHERE nombre = 'Editor')),

  ('Adriano', 'adriano@entheos.local',
   '$2b$10$Rd2JpR7lLiqyohw6qzR5NOgb8imZ23saPC.mGo/FM4XKaZkKr2SZW',
   'Adriano', 'Lector del proyecto. Consulta la wiki y deja comentarios.',
   (SELECT id FROM rol WHERE nombre = 'Lector'));

INSERT IGNORE INTO mensaje_comunidad (usuario_id, contenido, creado_en) VALUES
  ((SELECT id FROM usuario WHERE nombre_usuario = 'Kendry'),  'Bienvenidos a la comunidad de Entheos. Aqui pueden dejar sus mensajes.', NOW() - INTERVAL 5 DAY),
  ((SELECT id FROM usuario WHERE nombre_usuario = 'Angel'),   'Ya subi las notas de los Aelindar. Faltan las religiones.', NOW() - INTERVAL 4 DAY),
  ((SELECT id FROM usuario WHERE nombre_usuario = 'Adriano'), 'Me encanta como va quedando el mapa de los continentes.', NOW() - INTERVAL 3 DAY),
  ((SELECT id FROM usuario WHERE nombre_usuario = 'Kendry'),  'Recuerden que los comentarios se moderan antes de publicarse.', NOW() - INTERVAL 2 DAY),
  ((SELECT id FROM usuario WHERE nombre_usuario = 'Angel'),   'Estoy revisando la plantilla de razas y civilizaciones.', NOW() - INTERVAL 30 HOUR),
  ((SELECT id FROM usuario WHERE nombre_usuario = 'Adriano'), 'Alguien tiene ideas para la seccion de objetos?', NOW() - INTERVAL 6 HOUR);



SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

INSERT IGNORE INTO tipo_asentamiento (nombre, descripcion) VALUES
  ('Ciudad',     'Asentamiento grande, con muralla y gobierno propio.'),
  ('Pueblo',     'Asentamiento pequeno sin gobierno autonomo.'),
  ('Aldea',      'Grupo reducido de viviendas organizadas alrededor de un nucleo.'),
  ('Fortaleza',  'Puesto militar amurallado.'),
  ('Campamento', 'Asentamiento provisional de un clan errante.'),
  ('Abadia',     'Sede de una orden religiosa.'),
  ('Mina',       'Explotacion minera, con o sin poblacion permanente.'),
  ('Ruinas',     'Restos de un asentamiento abandonado.');

INSERT IGNORE INTO rareza (nombre, orden, descripcion) VALUES
  ('Comun',      1, 'Se encuentra con facilidad.'),
  ('Poco comun', 2, 'Necesita algo de busqueda.'),
  ('Rara',       3, 'Dificil de conseguir.'),
  ('Epica',      4, 'Casi unica; normalmente ligada a una faccion o a un mito.'),
  ('Legendaria', 5, 'Unica en el mundo. Es objeto de discusion.');

INSERT IGNORE INTO tipo_item (nombre, descripcion) VALUES
  ('Arma',       'Sirve para combatir: espada, arco, lanza.'),
  ('Armadura',   'Protege el cuerpo: coraza, casco, escudo.'),
  ('Herramienta','Sirve para trabajar: pico, martillo, hoz.'),
  ('Consumible', 'Se usa una vez: pocion, alimento, tinta.'),
  ('Tesoro',     'Objeto de valor, normalmente ligado a un mito.'),
  ('Documento',  'Texto: carta, registro, tratado.'),
  ('Accesorio',  'Objeto que se lleva encima sin categoria mayor.');

INSERT IGNORE INTO categoria (nombre, descripcion, categoria_padre_id) VALUES
  ('Continentes', 'Grandes masas de tierra del mundo conocido.', NULL),
  ('Personajes',  'Biografias y fichas de personajes.',          NULL),
  ('Objetos',     'Armas, herramientas y tesoros.',              NULL),
  ('Facciones',   'Organizaciones politicas y religiosas.',      NULL),
  ('Lenguas',     'Idiomas y sistemas de escritura.',            NULL);

SET @cat_objetos   := (SELECT id FROM categoria WHERE nombre = 'Objetos');

INSERT IGNORE INTO categoria (nombre, descripcion, categoria_padre_id) VALUES
  ('Localidades', 'Ciudades, pueblos y aldeas del mundo.',    NULL),
  ('Regiones',   'Zonas geograficas extensas.',            NULL),
  ('Razas',      'Grupos etnicos del mundo.',              NULL),
  ('Armas',      'Armas y equipo de combate.',             @cat_objetos);

INSERT IGNORE INTO etiqueta (nombre, descripcion) VALUES
  ('canonico',       'Confirmado por el canon de la wiki.'),
  ('leyenda',        'Relato popular sin confirmacion.'),
  ('en_desarrollo',  'Articulo todavia incompleto.');

INSERT IGNORE INTO continente (nombre, descripcion) VALUES
  ('Entheos', 'El continente conocido por los cronistas.');

INSERT IGNORE INTO articulo (titulo, slug, resumen, contenido_md, estado, categoria_id, autor_id, publicado_en)
SELECT 'Entheos',
       'entheos',
       'El continente donde se desarrolla la historia conocida.',
       '## Que es Entheos\n\nEntheos es el continente conocido por los cronistas. Su nombre aparece por primera vez en los relatos mas antiguos.\n\n### Caracteristicas\n\n- Es el unico continente documentado por completo.\n- Su geografia esta marcada por el mar del Norte y la cordillera de Arthe.\n\n> Los cronistas dicen que el continente recibe su nombre de la palabra *entheos*, que significa "lo que recuerda".',
       'publicado',
       (SELECT id FROM categoria WHERE nombre = 'Continentes'),
       (SELECT id FROM usuario WHERE nombre_usuario = 'Kendry'),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM articulo WHERE slug = 'entheos');

INSERT IGNORE INTO articulo_etiqueta (articulo_id, etiqueta_id)
SELECT a.id, e.id
  FROM articulo a
  JOIN etiqueta e ON e.nombre = 'canonico'
 WHERE a.slug = 'entheos';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'tipo_asentamiento' AS tabla, COUNT(*) AS filas FROM tipo_asentamiento
UNION ALL SELECT 'rareza', COUNT(*) FROM rareza
UNION ALL SELECT 'tipo_item', COUNT(*) FROM tipo_item
UNION ALL SELECT 'categoria', COUNT(*) FROM categoria
UNION ALL SELECT 'etiqueta', COUNT(*) FROM etiqueta
UNION ALL SELECT 'continente', COUNT(*) FROM continente
UNION ALL SELECT 'articulo', COUNT(*) FROM articulo
UNION ALL SELECT 'articulo_etiqueta', COUNT(*) FROM articulo_etiqueta;
SET FOREIGN_KEY_CHECKS = 1;

