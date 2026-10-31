"""Acceso a las tablas tk3_duelos y tk3_duelo_resultados con SQL directo."""
import pymysql

from app.database import obtener_conexion


def obtener(id_combate: int) -> dict | None:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute("SELECT id_combate, id_cancion FROM tk3_duelos WHERE id_combate = %s", (id_combate,))
        return cursor.fetchone()


def crear(id_combate: int, id_cancion: str) -> bool:
    """Crea el duelo. Devuelve False si ya existía (dos personas lo abrieron a la vez)."""
    try:
        with obtener_conexion() as conexion, conexion.cursor() as cursor:
            cursor.execute(
                "INSERT INTO tk3_duelos (id_combate, id_cancion) VALUES (%s, %s)", (id_combate, id_cancion)
            )
        return True
    except pymysql.err.IntegrityError:
        return False


def resultados(id_combate: int) -> list[dict]:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            """
            SELECT id_participante, puntos, perfect, great, miss, combo_maximo, es_ia
            FROM tk3_duelo_resultados WHERE id_combate = %s
            """,
            (id_combate,),
        )
        return cursor.fetchall()


def guardar_resultado(id_combate: int, id_participante: int, m: dict, es_ia: bool) -> bool:
    """Guarda el resultado. Devuelve False si ese participante ya había jugado (clave doble)."""
    try:
        with obtener_conexion() as conexion, conexion.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO tk3_duelo_resultados
                    (id_combate, id_participante, puntos, perfect, great, miss, combo_maximo, es_ia)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (id_combate, id_participante, m["puntos"], m["perfect"], m["great"], m["miss"],
                 m["combo_maximo"], es_ia),
            )
        return True
    except pymysql.err.IntegrityError:
        return False


def repetir(id_combate: int, id_cancion: str) -> None:
    """Empate total: borra los dos resultados y cambia la canción, todo junto."""
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute("DELETE FROM tk3_duelo_resultados WHERE id_combate = %s", (id_combate,))
        cursor.execute("UPDATE tk3_duelos SET id_cancion = %s WHERE id_combate = %s", (id_cancion, id_combate))
