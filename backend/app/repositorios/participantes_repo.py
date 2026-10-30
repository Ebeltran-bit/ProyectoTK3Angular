"""Acceso a la tabla tk3_participantes con SQL directo.

Aquí solo hay consultas: nada de HTTP ni de reglas del torneo.
Los valores siempre van como parámetros (%s) para evitar inyección SQL.
"""
from app.database import obtener_conexion

COLUMNAS = "id, nick, logo, activo, creado_en"


def _a_participante(fila: dict | None) -> dict | None:
    # MariaDB guarda BOOLEAN como 0/1; lo convertimos a True/False
    if fila is not None:
        fila["activo"] = bool(fila["activo"])
    return fila


def listar(activo: bool | None = None) -> list[dict]:
    sql = f"SELECT {COLUMNAS} FROM tk3_participantes"
    parametros: tuple = ()
    if activo is not None:
        sql += " WHERE activo = %s"
        parametros = (activo,)
    sql += " ORDER BY nick"
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(sql, parametros)
        return [_a_participante(fila) for fila in cursor.fetchall()]


def obtener(id_participante: int) -> dict | None:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            f"SELECT {COLUMNAS} FROM tk3_participantes WHERE id = %s",
            (id_participante,),
        )
        return _a_participante(cursor.fetchone())


def crear(nick: str, logo: str | None) -> int:
    """Inserta un participante activo y devuelve su id."""
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            "INSERT INTO tk3_participantes (nick, logo) VALUES (%s, %s)",
            (nick, logo),
        )
        return cursor.lastrowid


def editar(id_participante: int, nick: str, logo: str | None) -> None:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            "UPDATE tk3_participantes SET nick = %s, logo = %s WHERE id = %s",
            (nick, logo, id_participante),
        )


def cambiar_estado(id_participante: int, activo: bool) -> None:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            "UPDATE tk3_participantes SET activo = %s WHERE id = %s",
            (activo, id_participante),
        )


def listar_por_ids(ids: list[int]) -> list[dict]:
    """Devuelve los participantes cuyos ids están en la lista (los que existan)."""
    if not ids:
        return []
    marcadores = ", ".join(["%s"] * len(ids))
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            f"SELECT {COLUMNAS} FROM tk3_participantes WHERE id IN ({marcadores})",
            tuple(ids),
        )
        return [_a_participante(fila) for fila in cursor.fetchall()]
