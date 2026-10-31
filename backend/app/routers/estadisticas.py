"""Endpoints de informes (fase 4). Los cálculos están en estadisticas_servicio.py."""
from fastapi import APIRouter

from app.modelos import EstadisticaParticipante, RecordsCancion
from app.servicios import estadisticas_servicio, partidas_servicio

router = APIRouter(prefix="/api/estadisticas", tags=["Estadísticas"])


@router.get("/participantes", response_model=list[EstadisticaParticipante])
def estadisticas_participantes():
    """Combates, victorias, derrotas y torneos ganados de cada participante. Los BYE no cuentan."""
    return estadisticas_servicio.por_participante()


@router.get("/canciones", response_model=list[RecordsCancion])
def records_canciones():
    """Top 5 de cada canción: la mejor partida de práctica de cada usuario."""
    return partidas_servicio.records()
