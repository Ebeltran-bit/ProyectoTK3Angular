"""Endpoints REST de participantes.

No hay endpoint de borrado: según el enunciado, desactivar no es borrar.
"""
import pymysql
from fastapi import APIRouter, HTTPException, status

from app.modelos import CambioEstado, Participante, ParticipanteEntrada
from app.repositorios import participantes_repo

router = APIRouter(prefix="/api/participantes", tags=["Participantes"])

# Código de error de MariaDB/MySQL para "valor duplicado en un campo UNIQUE"
ERROR_DUPLICADO = 1062


def _nick_duplicado(error: pymysql.err.IntegrityError) -> HTTPException:
    if error.args and error.args[0] == ERROR_DUPLICADO:
        return HTTPException(status.HTTP_409_CONFLICT, "Ya existe un participante con ese nick")
    raise error


def _obtener_o_404(id_participante: int) -> dict:
    participante = participantes_repo.obtener(id_participante)
    if participante is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Participante no encontrado")
    return participante


@router.get("", response_model=list[Participante])
def listar_participantes(activo: bool | None = None):
    """Lista todos los participantes. Con ?activo=true o ?activo=false filtra por estado."""
    return participantes_repo.listar(activo)


@router.get("/{id_participante}", response_model=Participante)
def obtener_participante(id_participante: int):
    return _obtener_o_404(id_participante)


@router.post("", response_model=Participante, status_code=status.HTTP_201_CREATED)
def crear_participante(datos: ParticipanteEntrada):
    try:
        nuevo_id = participantes_repo.crear(datos.nick, datos.logo)
    except pymysql.err.IntegrityError as error:
        raise _nick_duplicado(error)
    return _obtener_o_404(nuevo_id)


@router.put("/{id_participante}", response_model=Participante)
def editar_participante(id_participante: int, datos: ParticipanteEntrada):
    _obtener_o_404(id_participante)
    try:
        participantes_repo.editar(id_participante, datos.nick, datos.logo)
    except pymysql.err.IntegrityError as error:
        raise _nick_duplicado(error)
    return _obtener_o_404(id_participante)


@router.patch("/{id_participante}/estado", response_model=Participante)
def cambiar_estado_participante(id_participante: int, datos: CambioEstado):
    """Activa o desactiva un participante."""
    _obtener_o_404(id_participante)
    participantes_repo.cambiar_estado(id_participante, datos.activo)
    return _obtener_o_404(id_participante)
