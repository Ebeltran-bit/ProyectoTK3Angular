-- =====================================================================
-- TK3 Tournament Manager · Esquema de base de datos
-- Fase 1: participantes
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
