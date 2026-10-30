"""Acceso a las tablas tk3_usuarios y tk3_sesiones con SQL directo."""
from datetime import datetime

from app.database import obtener_conexion

COLUMNAS = "u.id, u.nombre_usuario, u.hash_contrasena, u.id_participante, u.creado_en"


def obtener_por_nombre(nombre_usuario: str) -> dict | None:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            f"SELECT {COLUMNAS} FROM tk3_usuarios u WHERE u.nombre_usuario = %s",
            (nombre_usuario,),
        )
        return cursor.fetchone()


def nick_ocupado(nick: str) -> bool:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute("SELECT 1 FROM tk3_participantes WHERE nick = %s", (nick,))
        return cursor.fetchone() is not None


def crear_con_participante(nombre_usuario: str, hash_contrasena: str) -> int:
    """Crea el participante del usuario y el usuario, en una sola transacción."""
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute("INSERT INTO tk3_participantes (nick) VALUES (%s)", (nombre_usuario,))
        id_participante = cursor.lastrowid
        cursor.execute(
            """
            INSERT INTO tk3_usuarios (nombre_usuario, hash_contrasena, id_participante)
            VALUES (%s, %s, %s)
            """,
            (nombre_usuario, hash_contrasena, id_participante),
        )
        return cursor.lastrowid


def crear_sesion(hash_token: str, id_usuario: int, caduca_en: datetime) -> None:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            "INSERT INTO tk3_sesiones (hash_token, id_usuario, caduca_en) VALUES (%s, %s, %s)",
            (hash_token, id_usuario, caduca_en),
        )


def usuario_de_sesion(hash_token: str) -> dict | None:
    """Usuario de una sesión que todavía no ha caducado."""
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {COLUMNAS}
            FROM tk3_sesiones s
            JOIN tk3_usuarios u ON u.id = s.id_usuario
            WHERE s.hash_token = %s AND s.caduca_en > NOW()
            """,
            (hash_token,),
        )
        return cursor.fetchone()


def borrar_sesion(hash_token: str) -> None:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute("DELETE FROM tk3_sesiones WHERE hash_token = %s", (hash_token,))


def borrar_sesiones_caducadas() -> None:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute("DELETE FROM tk3_sesiones WHERE caduca_en <= NOW()")
