-- =====================================================================
-- TK3 Tournament Manager · Retirar el editor de personajes
--
-- Solo hace falta si tu base de datos tiene la tabla tk3_personajes, que
-- creaba una versión anterior de 01_esquema.sql. Borra el aspecto
-- guardado de los personajes; participantes, torneos, usuarios y datos
-- de prueba no se tocan. Ninguna otra tabla depende de ella.
-- =====================================================================

DROP TABLE IF EXISTS `2DAM_alumno03`.`tk3_personajes`;
