"""Punto de entrada de la API de TK3.

Arranque (desde la carpeta backend):  uvicorn app.main:app --reload
Documentación interactiva:            http://localhost:8000/docs
"""
import pymysql
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import config
from app.routers import participantes

app = FastAPI(title="TK3 Tournament Manager API")

# Permite que el frontend Angular (otro puerto) llame a la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(participantes.router)


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
