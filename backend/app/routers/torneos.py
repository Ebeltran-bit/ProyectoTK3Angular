"""Endpoints REST de torneos.

Las reglas están en app/servicios/torneos_servicio.py; si se incumple alguna,
el servicio lanza un ErrorDeNegocio y main.py lo convierte en respuesta HTTP.
"""
from fastapi import APIRouter, status

from app.modelos import TorneoDetalle, TorneoEntrada, TorneoResumen
from app.servicios import torneos_servicio

router = APIRouter(prefix="/api/torneos", tags=["Torneos"])


@router.get("", response_model=list[TorneoResumen])
def listar_torneos():
    return torneos_servicio.listar()


@router.get("/{id_torneo}", response_model=TorneoDetalle)
def obtener_torneo(id_torneo: int):
    return torneos_servicio.obtener_detalle(id_torneo)


@router.post("", response_model=TorneoDetalle, status_code=status.HTTP_201_CREATED)
def crear_torneo(datos: TorneoEntrada):
    """Crea un torneo en preparación con los participantes indicados (solo activos)."""
    return torneos_servicio.crear(datos.nombre, datos.participantes)


@router.put("/{id_torneo}", response_model=TorneoDetalle)
def editar_torneo(id_torneo: int, datos: TorneoEntrada):
    """Cambia nombre y participantes. Solo mientras el torneo está en preparación."""
    return torneos_servicio.editar(id_torneo, datos.nombre, datos.participantes)


@router.post("/{id_torneo}/cuadro", response_model=TorneoDetalle)
def generar_cuadro(id_torneo: int):
    """Sortea la primera ronda (con BYE si hace falta) y cierra las inscripciones."""
    return torneos_servicio.generar_cuadro(id_torneo)
