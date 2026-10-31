-- =====================================================================
-- TK3 Tournament Manager · Esquema de base de datos
-- Fase 1: participantes
-- Fase 2: torneos, inscripciones y combates
--
-- Todas las tablas viven en la base de datos `2DAM_alumno03` y llevan el
-- prefijo tk3_. El nombre de la base de datos empieza por un número, así
-- que siempre hay que escribirlo entre comillas invertidas: `2DAM_alumno03`.
--
-- Se puede ejecutar varias veces: solo crea lo que no existe.
-- =====================================================================

-- Descomenta la siguiente línea solo si la base de datos todavía no existe.
-- CREATE DATABASE IF NOT EXISTS `2DAM_alumno03` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `2DAM_alumno03`;

-- ---------------------------------------------------------------------
-- Participantes
-- Desactivar NO es borrar: un participante inactivo conserva su historial.
-- Por eso no hay borrado; solo se cambia el campo `activo`.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tk3_participantes (
    id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    nick        VARCHAR(30)   NOT NULL,
    logo        VARCHAR(500)  NULL COMMENT 'URL de una imagen',
    activo      BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_tk3_participantes_nick UNIQUE (nick)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Torneos
-- Estados:
--   preparacion      se pueden cambiar nombre y participantes
--   cuadro_generado  el sorteo está hecho; se juegan los combates
--   finalizado       hay campeón y no se admiten más cambios (fase 3)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tk3_torneos (
    id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(60)   NOT NULL,
    estado      ENUM('preparacion', 'cuadro_generado', 'finalizado') NOT NULL DEFAULT 'preparacion',
    id_campeon  INT UNSIGNED  NULL,
    creado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_tk3_torneos_campeon FOREIGN KEY (id_campeon) REFERENCES tk3_participantes (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Inscripciones: qué participantes juegan cada torneo (relación N a M).
-- La clave primaria doble impide inscribir dos veces al mismo participante.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tk3_inscripciones (
    id_torneo        INT UNSIGNED NOT NULL,
    id_participante  INT UNSIGNED NOT NULL,
    PRIMARY KEY (id_torneo, id_participante),
    CONSTRAINT fk_tk3_inscripciones_torneo FOREIGN KEY (id_torneo) REFERENCES tk3_torneos (id),
    CONSTRAINT fk_tk3_inscripciones_participante FOREIGN KEY (id_participante) REFERENCES tk3_participantes (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Combates del cuadro.
-- Cada combate tiene una ronda (1, 2, 3...) y una posición dentro de la ronda
-- (0, 1, 2...). El ganador de la posición i pasa a la posición i DIV 2 de la
-- ronda siguiente.
-- Un BYE es un combate con un solo participante (id_participante2 = NULL),
-- marcado con es_bye y ya resuelto: ese participante pasa directo.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tk3_combates (
    id                INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    id_torneo         INT UNSIGNED     NOT NULL,
    ronda             TINYINT UNSIGNED NOT NULL,
    posicion          SMALLINT UNSIGNED NOT NULL,
    id_participante1  INT UNSIGNED     NOT NULL,
    id_participante2  INT UNSIGNED     NULL,
    id_ganador        INT UNSIGNED     NULL,
    es_bye            BOOLEAN          NOT NULL DEFAULT FALSE,
    estado            ENUM('pendiente', 'resuelto') NOT NULL DEFAULT 'pendiente',
    PRIMARY KEY (id),
    CONSTRAINT uq_tk3_combates_hueco UNIQUE (id_torneo, ronda, posicion),
    CONSTRAINT fk_tk3_combates_torneo FOREIGN KEY (id_torneo) REFERENCES tk3_torneos (id),
    CONSTRAINT fk_tk3_combates_p1 FOREIGN KEY (id_participante1) REFERENCES tk3_participantes (id),
    CONSTRAINT fk_tk3_combates_p2 FOREIGN KEY (id_participante2) REFERENCES tk3_participantes (id),
    CONSTRAINT fk_tk3_combates_ganador FOREIGN KEY (id_ganador) REFERENCES tk3_participantes (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- =====================================================================
-- Duelo de ritmo (ampliación) · Etapa 1: usuarios y sesiones
-- =====================================================================

-- ---------------------------------------------------------------------
-- Usuarios. Cada usuario tiene un participante vinculado: su personaje
-- es ese participante y puede jugar torneos.
-- La contraseña NUNCA se guarda: solo su hash scrypt con una sal propia,
-- en el formato  scrypt$n$r$p$sal_hex$hash_hex
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tk3_usuarios (
    id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    nombre_usuario   VARCHAR(30)   NOT NULL,
    hash_contrasena  VARCHAR(255)  NOT NULL,
    id_participante  INT UNSIGNED  NOT NULL,
    creado_en        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_tk3_usuarios_nombre UNIQUE (nombre_usuario),
    CONSTRAINT uq_tk3_usuarios_participante UNIQUE (id_participante),
    CONSTRAINT fk_tk3_usuarios_participante FOREIGN KEY (id_participante) REFERENCES tk3_participantes (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Sesiones abiertas. Se guarda el hash SHA-256 del token, no el token:
-- si alguien leyera la tabla, no podría usar esos valores para entrar.
-- Cerrar sesión borra la fila.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tk3_sesiones (
    hash_token  CHAR(64)      NOT NULL,
    id_usuario  INT UNSIGNED  NOT NULL,
    creada_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    caduca_en   DATETIME      NOT NULL,
    PRIMARY KEY (hash_token),
    CONSTRAINT fk_tk3_sesiones_usuario FOREIGN KEY (id_usuario) REFERENCES tk3_usuarios (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
