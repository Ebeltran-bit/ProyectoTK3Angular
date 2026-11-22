"""Conexión a MariaDB.

Cada consulta pide una conexión, la usa y la devuelve. Las conexiones que
quedan libres se guardan en una lista para la siguiente consulta en vez de
cerrarse: con la base de datos del instituto, abrir una conexión nueva cuesta
unos 600 ms (medido el 22/11/2026), y guardar un ganador hace unas diez
consultas. Reutilizarlas lo deja en una fracción de ese tiempo.
"""
import threading
import time
from contextlib import contextmanager

import pymysql
from pymysql.cursors import DictCursor

from app import config

# Conexiones libres, cada una con el momento en que se devolvió. FastAPI atiende
# varias peticiones a la vez en hilos distintos, de ahí el candado.
_libres: list[tuple[pymysql.connections.Connection, float]] = []
_candado = threading.Lock()
# No se guardan más de estas: sobran para una sola persona usando la aplicación.
MAX_LIBRES = 5
# Una conexión que lleva tanto tiempo sin usarse se comprueba antes (el servidor
# cierra las que pasan mucho rato quietas).
SEGUNDOS_SIN_COMPROBAR = 60


def _nueva() -> pymysql.connections.Connection:
    return pymysql.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        database=config.DB_NAME,
        charset="utf8mb4",
        cursorclass=DictCursor,
    )


def _tomar() -> pymysql.connections.Connection:
    """Una conexión libre si hay alguna; si no, una nueva."""
    with _candado:
        libre = _libres.pop() if _libres else None
    if libre is None:
        return _nueva()
    conexion, devuelta = libre
    if time.monotonic() - devuelta > SEGUNDOS_SIN_COMPROBAR:
        try:
            conexion.ping(reconnect=True)
        except pymysql.err.Error:
            conexion.close()
            return _nueva()
    return conexion


def _devolver(conexion: pymysql.connections.Connection) -> None:
    with _candado:
        if len(_libres) < MAX_LIBRES:
            _libres.append((conexion, time.monotonic()))
            return
    conexion.close()


@contextmanager
def obtener_conexion():
    """Da una conexión y la devuelve al terminar.

    Si todo va bien hace commit; si salta una excepción, hace rollback. Así la
    conexión vuelve siempre limpia, sin nada a medias.
    Los cursores devuelven diccionarios: {"id": 1, "nick": "Jin", ...}.
    """
    conexion = _tomar()
    try:
        yield conexion
        conexion.commit()
    except BaseException:
        try:
            conexion.rollback()
            _devolver(conexion)
        except pymysql.err.Error:
            # Si ni el rollback funciona, la conexión está rota: no se guarda (y se
            # avisa del error original, no del rollback)
            conexion.close()
        raise
    else:
        _devolver(conexion)
