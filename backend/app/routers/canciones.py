"""Endpoints de canciones del duelo de ritmo (etapa 3). Las reglas están en canciones_servicio.py."""
from fastapi import APIRouter, Depends, status

from app.dependencias import usuario_actual

from app.modelos import Cancion, CancionResumen, PartidaEntrada, Resultado
from app.servicios import canciones_servicio, partidas_servicio

router = APIRouter(prefix="/api/canciones", tags=["Canciones"])


@router.get("", response_model=list[CancionResumen])
def listar_canciones():
    """Canciones disponibles, sin notas: título, nivel, BPM y escenario."""
    return canciones_servicio.listar()


@router.get("/{id_cancion}", response_model=Cancion)
def obtener_cancion(id_cancion: str):
    """Beatmap completo: notas que hay que pulsar y pistas de la música."""
    return canciones_servicio.obtener(id_cancion)


@router.post("/{id_cancion}/partidas", response_model=Resultado, status_code=status.HTTP_201_CREATED)
def guardar_partida(id_cancion: str, datos: PartidaEntrada, usuario: dict = Depends(usuario_actual)):
    """Guarda una partida de práctica. La puntuación la calcula el backend a partir de las pulsaciones."""
    pulsaciones = [p.model_dump() for p in datos.pulsaciones]
    return partidas_servicio.guardar(usuario["id"], id_cancion, pulsaciones)
