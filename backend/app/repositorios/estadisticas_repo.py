"""Consultas para los informes de la fase 4 (victorias, derrotas y torneos ganados).

Solo lee datos que ya existen en tk3_combates y tk3_torneos: no hay tablas
nuevas. Las reglas (qué combates cuentan) están en estadisticas_servicio.py.
"""
from app.database import obtener_conexion


def combates_resueltos() -> list[dict]:
    """Todos los combates ya resueltos de todos los torneos, BYE incluidos."""
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            """
            SELECT id_participante1, id_participante2, id_ganador, es_bye
            FROM tk3_combates
            WHERE estado = %s
            """,
            ("resuelto",),
        )
        filas = cursor.fetchall()
    for fila in filas:
        fila["es_bye"] = bool(fila["es_bye"])
    return filas


def campeones() -> list[int]:
    """El campeón de cada torneo finalizado (puede repetirse si ganó varios)."""
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            "SELECT id_campeon FROM tk3_torneos WHERE estado = %s AND id_campeon IS NOT NULL",
            ("finalizado",),
        )
        return [fila["id_campeon"] for fila in cursor.fetchall()]
