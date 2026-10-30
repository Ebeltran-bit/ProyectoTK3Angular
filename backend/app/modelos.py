"""Modelos de datos de la API (lo que entra y sale en JSON)."""
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ParticipanteEntrada(BaseModel):
    """Datos para crear o editar un participante."""

    nick: str = Field(min_length=1, max_length=30)
    logo: str | None = Field(default=None, max_length=500)

    @field_validator("nick")
    @classmethod
    def limpiar_nick(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("El nick no puede estar vacío")
        return valor

    @field_validator("logo")
    @classmethod
    def limpiar_logo(cls, valor: str | None) -> str | None:
        # Un logo vacío se guarda como NULL
        if valor is None or not valor.strip():
            return None
        return valor.strip()


class CambioEstado(BaseModel):
    """Datos para activar o desactivar un participante."""

    activo: bool


class Participante(BaseModel):
    """Participante tal como lo devuelve la API."""

    id: int
    nick: str
    logo: str | None
    activo: bool
    creado_en: datetime
