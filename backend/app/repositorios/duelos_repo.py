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


def pendientes_de(id_participante: int) -> list[dict]:
    """Combates sin decidir de torneos en juego en los que el participante todavía no ha tocado.

    Trae también el nombre del torneo, cuántos inscritos tiene (para saber la ronda) y el rival.
    """
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            """
            SELECT cb.id AS id_combate, cb.ronda, t.id AS id_torneo, t.nombre AS nombre_torneo,
                   (SELECT COUNT(*) FROM tk3_inscripciones i WHERE i.id_torneo = t.id) AS num_participantes,
                   rp.id AS rival_id, rp.nick AS rival_nick, rp.logo AS rival_logo,
                   COALESCE(ru.icono, rp.icono) AS rival_icono
            FROM tk3_combates cb
            JOIN tk3_torneos t ON t.id = cb.id_torneo
            JOIN tk3_participantes rp
              ON rp.id = IF(cb.id_participante1 = %s, cb.id_participante2, cb.id_participante1)
            LEFT JOIN tk3_usuarios ru ON ru.id_participante = rp.id
            LEFT JOIN tk3_duelo_resultados r
              ON r.id_combate = cb.id AND r.id_participante = %s
            WHERE t.estado = 'cuadro_generado'
              AND cb.estado = 'pendiente'
              AND cb.es_bye = FALSE
              AND %s IN (cb.id_participante1, cb.id_participante2)
              AND r.id_combate IS NULL
            ORDER BY t.creado_en, cb.ronda, cb.posicion
            """,
            (id_participante, id_participante, id_participante),
        )
        return cursor.fetchall()
