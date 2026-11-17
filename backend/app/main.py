"""Punto de entrada de la API de TK3.

Arranque (desde la carpeta backend):  uvicorn app.main:app --reload
Documentación interactiva:            http://localhost:8000/docs
"""
import logging

import pymysql
from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import config
from app.dependencias import usuario_actual
from app.routers import auth, canciones, estadisticas, participantes, torneos
from app.servicios.errores import ErrorDeNegocio

app = FastAPI(title="TK3 Tournament Manager API")

# Permite que el frontend Angular (otro puerto) llame a la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro y login son públicos; el resto de la API exige sesión
app.include_router(auth.router)
app.include_router(participantes.router, dependencies=[Depends(usuario_actual)])
app.include_router(torneos.router, dependencies=[Depends(usuario_actual)])
app.include_router(estadisticas.router, dependencies=[Depends(usuario_actual)])
app.include_router(canciones.router, dependencies=[Depends(usuario_actual)])


@app.exception_handler(ErrorDeNegocio)
def error_de_negocio(request: Request, error: ErrorDeNegocio):
    """Una regla del torneo no se cumple: respondemos con su código y su mensaje."""
    return JSONResponse(status_code=error.codigo_http, content={"detail": error.mensaje})


# Códigos de MariaDB que de verdad significan «no hay conexión»: servidor apagado,
# inalcanzable o apagándose (2002, 2003, 1053), conexión perdida (2006, 2013), acceso
# denegado o equipo no autorizado (1045, 1129, 1130, 1698, 2059), base de datos inexistente
# o sin permiso (1044, 1049) y demasiadas conexiones (1040, 1203, 1226).
SIN_CONEXION = {1040, 1044, 1045, 1049, 1053, 1129, 1130, 1203, 1226, 1698, 2002, 2003, 2006, 2013, 2059}

# Los errores de la base de datos se escriben en la terminal de uvicorn
registro = logging.getLogger("uvicorn.error")


def _sin_conexion(error: pymysql.err.Error, codigo: int | None) -> bool:
    if codigo in SIN_CONEXION:
        return True
    # La conexión rota a mitad de una petición (InterfaceError) y los fallos del saludo
    # inicial, que PyMySQL lanza como OperationalError sin código, también son «sin conexión»
    return isinstance(error, pymysql.err.InterfaceError) or (
        codigo is None and isinstance(error, pymysql.err.OperationalError)
    )


@app.exception_handler(pymysql.err.Error)
def error_de_base_de_datos(request: Request, error: pymysql.err.Error):
    """Traduce los errores de MariaDB que nadie ha atrapado a una respuesta clara.

    PyMySQL usa OperationalError para muchas cosas, no solo para la conexión: también para
    una columna que no existe (1054) o una espera de bloqueo demasiado larga (1205). Por eso
    se mira el código: así el mensaje no engaña y en la terminal queda el error real.
    El mensaje de MariaDB nunca lleva la contraseña, así que se puede escribir tal cual.
    """
    codigo = error.args[0] if error.args and isinstance(error.args[0], int) else None
    if _sin_conexion(error, codigo):
        registro.error("Sin conexión con la base de datos en %s %s: %s", request.method, request.url.path, error)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "No se puede conectar con la base de datos"},
        )
    # Con la traza completa, para ver qué consulta ha fallado
    registro.error("Error de la base de datos en %s %s: %s", request.method, request.url.path, error,
                   exc_info=error)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Error en la base de datos (código {codigo}). El detalle está en la terminal del backend"},
    )


@app.get("/api/salud", tags=["Sistema"])
def salud():
    """Comprueba que la API responde."""
    return {"estado": "ok"}
