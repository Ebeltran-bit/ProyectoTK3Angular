"""Punto de entrada de la API de TK3.

Arranque (desde la carpeta backend):  uvicorn app.main:app --reload
Documentación interactiva:            http://localhost:8000/docs
"""
import pymysql
from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import config
from app.dependencias import usuario_actual
from app.routers import auth, participantes, torneos
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


@app.exception_handler(ErrorDeNegocio)
def error_de_negocio(request: Request, error: ErrorDeNegocio):
    """Una regla del torneo no se cumple: respondemos con su código y su mensaje."""
    return JSONResponse(status_code=error.codigo_http, content={"detail": error.mensaje})


@app.exception_handler(pymysql.err.OperationalError)
def base_de_datos_no_disponible(request: Request, error: pymysql.err.OperationalError):
    """Si MariaDB no responde, devolvemos un mensaje claro en lugar de un error 500 genérico."""
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "No se puede conectar con la base de datos"},
    )


@app.get("/api/salud", tags=["Sistema"])
def salud():
    """Comprueba que la API responde."""
    return {"estado": "ok"}
