"""Reglas de registro e inicio de sesión."""
import re
from datetime import datetime, timedelta

import pymysql

from app.repositorios import usuarios_repo
from app.servicios import seguridad
from app.servicios.errores import Conflicto, ErrorDeNegocio, NoAutenticado

DURACION_SESION = timedelta(days=7)
LONGITUD_MINIMA_CONTRASENA = 8
# Letras, números, guion y guion bajo; de 3 a 30 caracteres
PATRON_NOMBRE = re.compile(r"^[A-Za-z0-9_-]{3,30}$")


def _publico(usuario: dict) -> dict:
    """Datos del usuario que se pueden enviar al navegador (sin el hash)."""
    return {
        "id": usuario["id"],
        "nombre_usuario": usuario["nombre_usuario"],
        "id_participante": usuario["id_participante"],
    }


def _abrir_sesion(usuario: dict) -> dict:
    token = seguridad.generar_token()
    usuarios_repo.crear_sesion(seguridad.hash_token(token), usuario["id"], datetime.now() + DURACION_SESION)
    return {"token": token, "usuario": _publico(usuario)}


def registrar(nombre_usuario: str, contrasena: str) -> dict:
    """Crea el usuario y su participante, y abre sesión directamente."""
    if not PATRON_NOMBRE.match(nombre_usuario):
        raise ErrorDeNegocio("El nombre de usuario debe tener de 3 a 30 letras, números, - o _")
    if len(contrasena) < LONGITUD_MINIMA_CONTRASENA:
        raise ErrorDeNegocio(f"La contraseña debe tener al menos {LONGITUD_MINIMA_CONTRASENA} caracteres")
    # El nombre de usuario será también el nick de su participante
    if usuarios_repo.obtener_por_nombre(nombre_usuario) or usuarios_repo.nick_ocupado(nombre_usuario):
        raise Conflicto("Ese nombre ya está en uso")

    try:
        usuarios_repo.crear_con_participante(nombre_usuario, seguridad.cifrar_contrasena(contrasena))
    except pymysql.err.IntegrityError:
        # Dos registros con el mismo nombre a la vez
        raise Conflicto("Ese nombre ya está en uso")
    return _abrir_sesion(usuarios_repo.obtener_por_nombre(nombre_usuario))


def iniciar_sesion(nombre_usuario: str, contrasena: str) -> dict:
    usuario = usuarios_repo.obtener_por_nombre(nombre_usuario)
    # Mismo mensaje si no existe o si la contraseña falla: no revelamos qué usuarios existen
    if usuario is None or not seguridad.verificar_contrasena(contrasena, usuario["hash_contrasena"]):
        raise NoAutenticado("Usuario o contraseña incorrectos")
    usuarios_repo.borrar_sesiones_caducadas()
    return _abrir_sesion(usuario)


def usuario_actual(token: str | None) -> dict:
    """Usuario dueño del token, o NoAutenticado si no hay sesión válida."""
    if not token:
        raise NoAutenticado("Tienes que iniciar sesión")
    usuario = usuarios_repo.usuario_de_sesion(seguridad.hash_token(token))
    if usuario is None:
        raise NoAutenticado("La sesión no es válida o ha caducado. Vuelve a iniciar sesión")
    return _publico(usuario)


def cerrar_sesion(token: str) -> None:
    usuarios_repo.borrar_sesion(seguridad.hash_token(token))
