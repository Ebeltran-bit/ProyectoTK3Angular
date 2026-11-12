-- =====================================================================
-- TK3 Tournament Manager · Datos de prueba
-- Opcional. Crea 8 participantes (uno inactivo) para no tener que
-- rellenar el formulario cada vez. INSERT IGNORE evita errores si ya existen.
-- =====================================================================

USE `2DAM_alumno03`;

INSERT IGNORE INTO tk3_participantes (nick, logo, activo) VALUES
    ('Kazuya',  NULL, TRUE),
    ('Jin',     NULL, TRUE),
    ('Nina',    NULL, TRUE),
    ('Paul',    NULL, TRUE),
    ('Law',     NULL, TRUE),
    ('Xiaoyu',  NULL, TRUE),
    ('King',    NULL, TRUE),
    ('Yoshi',   NULL, FALSE);

-- 12/11/2026 (Eva): los logos de figuras geométricas no gustan. Sin logo, cada
-- participante sale con un animal (ver iconoDe en el frontend). Esto los quita
-- también de las bases de datos donde ya se cargaron; se puede ejecutar varias veces.
-- Se filtra por nick (UNIQUE, así lo admite el modo seguro de Workbench) y solo si
-- todavía tienen el logo de figuras, para no pisar uno que se haya puesto después.
UPDATE tk3_participantes
SET logo = NULL
WHERE nick IN ('Kazuya', 'Jin', 'Nina', 'Paul', 'Law', 'Xiaoyu', 'King')
  AND logo LIKE 'https://api.dicebear.com/9.x/shapes/%';
