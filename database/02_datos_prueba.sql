-- =====================================================================
-- TK3 Tournament Manager · Datos de prueba
-- Opcional. Crea 8 participantes (uno inactivo) para no tener que
-- rellenar el formulario cada vez. INSERT IGNORE evita errores si ya existen.
-- =====================================================================

USE `2DAM_alumno03`;

INSERT IGNORE INTO tk3_participantes (nick, logo, activo) VALUES
    ('Kazuya',  'https://api.dicebear.com/9.x/shapes/svg?seed=Kazuya',  TRUE),
    ('Jin',     'https://api.dicebear.com/9.x/shapes/svg?seed=Jin',     TRUE),
    ('Nina',    'https://api.dicebear.com/9.x/shapes/svg?seed=Nina',    TRUE),
    ('Paul',    'https://api.dicebear.com/9.x/shapes/svg?seed=Paul',    TRUE),
    ('Law',     'https://api.dicebear.com/9.x/shapes/svg?seed=Law',     TRUE),
    ('Xiaoyu',  'https://api.dicebear.com/9.x/shapes/svg?seed=Xiaoyu',  TRUE),
    ('King',    'https://api.dicebear.com/9.x/shapes/svg?seed=King',    TRUE),
    ('Yoshi',   NULL,                                                   FALSE);
