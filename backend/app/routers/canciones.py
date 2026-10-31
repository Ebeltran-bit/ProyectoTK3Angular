"""Endpoints de canciones del duelo de ritmo (etapa 3). Las reglas están en canciones_servicio.py."""
from fastapi import APIRouter

from app.modelos import Cancion, CancionResumen
from app.servicios import canciones_servicio

router = APIRouter(prefix="/api/canciones", tags=["Canciones"])


@router.get("", response_model=list[CancionResumen])
def listar_canciones():
    """Canciones disponibles, sin notas: título, nivel, BPM y escenario."""
    return canciones_servicio.listar()


@router.get("/{id_cancion}", response_model=Cancion)
def obtener_cancion(id_cancion: str):
    """Beatmap completo: notas que hay que pulsar y pistas de la música."""
    return canciones_servicio.obtener(id_cancion)
