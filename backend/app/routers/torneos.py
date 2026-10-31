"""Endpoints REST de torneos.

Las reglas están en app/servicios/torneos_servicio.py; si se incumple alguna,
el servicio lanza un ErrorDeNegocio y main.py lo convierte en respuesta HTTP.
"""
from fastapi import APIRouter, Depends, status

from app.dependencias import usuario_actual
from app.modelos import (Duelo, GanadorEntrada, IaEntrada, PartidaEntrada, TorneoDetalle, TorneoEntrada,
                         TorneoResumen)
from app.servicios import duelos_servicio, torneos_servicio

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


@router.post("/{id_torneo}/combates/{id_combate}/ganador", response_model=TorneoDetalle)
def registrar_ganador(id_torneo: int, id_combate: int, datos: GanadorEntrada):
    """Guarda el ganador de un combate. Si la ronda queda completa, genera la siguiente o cierra el torneo."""
    return torneos_servicio.registrar_ganador(id_torneo, id_combate, datos.id_ganador)


# ---------------------------------------------------------------------
# Duelo de ritmo de un combate
# ---------------------------------------------------------------------


@router.get("/{id_torneo}/combates/{id_combate}/duelo", response_model=Duelo)
def obtener_duelo(id_torneo: int, id_combate: int, usuario: dict = Depends(usuario_actual)):
    """Canción del duelo y quién ha jugado. La primera vez se elige la canción según la ronda."""
    return duelos_servicio.obtener(id_torneo, id_combate, usuario)


@router.post("/{id_torneo}/combates/{id_combate}/duelo", response_model=Duelo, status_code=status.HTTP_201_CREATED)
def jugar_duelo(id_torneo: int, id_combate: int, datos: PartidaEntrada, usuario: dict = Depends(usuario_actual)):
    """El usuario de la sesión manda sus pulsaciones. Con los dos resultados, el backend decide el ganador."""
    pulsaciones = [p.model_dump() for p in datos.pulsaciones]
    return duelos_servicio.jugar(id_torneo, id_combate, usuario, pulsaciones)


@router.post("/{id_torneo}/combates/{id_combate}/duelo/ia", response_model=Duelo,
             status_code=status.HTTP_201_CREATED)
def jugar_duelo_ia(id_torneo: int, id_combate: int, datos: IaEntrada, usuario: dict = Depends(usuario_actual)):
    """La IA toca la canción por un participante que todavía no ha jugado."""
    return duelos_servicio.jugar_ia(id_torneo, id_combate, usuario, datos.id_participante)
