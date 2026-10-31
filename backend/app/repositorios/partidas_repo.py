"""Acceso a la tabla tk3_partidas (partidas de práctica) con SQL directo."""
from app.database import obtener_conexion


def guardar(id_usuario: int, id_cancion: str, m: dict) -> int:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO tk3_partidas
                (id_usuario, id_cancion, puntos, perfect, great, miss, combo_maximo)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (id_usuario, id_cancion, m["puntos"], m["perfect"], m["great"], m["miss"], m["combo_maximo"]),
        )
        return cursor.lastrowid


def mejor_de_cada_usuario() -> list[dict]:
    """La mejor partida de cada usuario en cada canción.

    ROW_NUMBER numera las partidas de cada usuario en cada canción de mejor a
    peor; nos quedamos con la número 1. El orden es el de los empates:
    más puntos, más PERFECT, menos MISS y, si todo es igual, la más antigua.
    """
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            """
            SELECT id_cancion, nombre_usuario, puntos, perfect, great, miss, combo_maximo, jugada_en
            FROM (
                SELECT p.id_cancion, u.nombre_usuario, p.puntos, p.perfect, p.great, p.miss,
                       p.combo_maximo, p.jugada_en,
                       ROW_NUMBER() OVER (
                           PARTITION BY p.id_cancion, p.id_usuario
                           ORDER BY p.puntos DESC, p.perfect DESC, p.miss ASC, p.jugada_en ASC, p.id ASC
                       ) AS orden
                FROM tk3_partidas p
                JOIN tk3_usuarios u ON u.id = p.id_usuario
            ) AS mejores
            WHERE orden = 1
            """
        )
        return cursor.fetchall()
