"""Dependencias de FastAPI compartidas por varios routers."""
from fastapi import Request

from app.servicios import auth_servicio


def token_de_peticion(request: Request) -> str | None:
    """Lee el token de la cabecera 'Authorization: Bearer <token>'."""
    cabecera = request.headers.get("Authorization", "")
    tipo, _, token = cabecera.partition(" ")
    return token if tipo.lower() == "bearer" and token else None


def usuario_actual(request: Request) -> dict:
    """Exige una sesión válida. Se añade a los routers que necesitan usuario."""
    return auth_servicio.usuario_actual(token_de_peticion(request))
