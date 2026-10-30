"""Endpoints del personaje del usuario que ha iniciado sesión."""
from fastapi import APIRouter, Depends

from app.dependencias import usuario_actual
from app.modelos import Apariencia, Personaje
from app.servicios import personajes_servicio

router = APIRouter(prefix="/api/personaje", tags=["Personaje"])


@router.get("", response_model=Personaje)
def obtener_mi_personaje(usuario: dict = Depends(usuario_actual)):
    return personajes_servicio.obtener_de_usuario(usuario)


@router.put("", response_model=Personaje)
def guardar_mi_personaje(datos: Apariencia, usuario: dict = Depends(usuario_actual)):
    return personajes_servicio.guardar_de_usuario(usuario, datos.model_dump())
