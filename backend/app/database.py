"""Conexión a MariaDB.

Cada petición abre una conexión, la usa y la cierra. Es lo más sencillo de
entender y suficiente para este proyecto.
"""
from contextlib import contextmanager

import pymysql
from pymysql.cursors import DictCursor

from app import config


@contextmanager
def obtener_conexion():
    """Abre una conexión y la cierra al terminar.

    Si todo va bien hace commit; si salta una excepción, hace rollback.
    Los cursores devuelven diccionarios: {"id": 1, "nick": "Jin", ...}.
    """
    conexion = pymysql.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        database=config.DB_NAME,
        charset="utf8mb4",
        cursorclass=DictCursor,
    )
    try:
        yield conexion
        conexion.commit()
    except Exception:
        conexion.rollback()
        raise
    finally:
        conexion.close()
