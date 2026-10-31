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


# ---------------------------------------------------------------------
# Torneos (fase 2)
# ---------------------------------------------------------------------


class TorneoEntrada(BaseModel):
    """Datos para crear o editar un torneo en preparación."""

    nombre: str = Field(min_length=1, max_length=60)
    participantes: list[int] = Field(description="Ids de los participantes inscritos")

    @field_validator("nombre")
    @classmethod
    def limpiar_nombre(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("El nombre no puede estar vacío")
        return valor


class GanadorEntrada(BaseModel):
    """Ganador de un combate (fase 3)."""

    id_ganador: int


class ParticipanteResumen(BaseModel):
    """Lo mínimo de un participante para pintarlo en el cuadro."""

    id: int
    nick: str
    logo: str | None


class Combate(BaseModel):
    id: int
    ronda: int
    posicion: int
    participante1: ParticipanteResumen
    participante2: ParticipanteResumen | None
    id_ganador: int | None
    es_bye: bool
    estado: str


class TorneoResumen(BaseModel):
    """Torneo tal como aparece en el listado."""

    id: int
    nombre: str
    estado: str
    num_participantes: int
    campeon: ParticipanteResumen | None
    creado_en: datetime


class TorneoDetalle(TorneoResumen):
    """Torneo completo: inscritos y combates."""

    participantes: list[Participante]
    total_rondas: int
    combates: list[Combate]



class EstadisticaParticipante(BaseModel):
    """Una fila del informe de victorias y derrotas (fase 4)."""

    id: int
    nick: str
    logo: str | None
    activo: bool
    combates: int
    victorias: int
    derrotas: int
    torneos_ganados: int


# ---------------------------------------------------------------------
# Usuarios y sesión (modo combate, etapa 1)
# ---------------------------------------------------------------------


class CredencialesEntrada(BaseModel):
    """Datos para registrarse o iniciar sesión."""

    nombre_usuario: str = Field(min_length=1, max_length=30)
    contrasena: str = Field(min_length=1, max_length=128)

    @field_validator("nombre_usuario")
    @classmethod
    def limpiar_nombre(cls, valor: str) -> str:
        return valor.strip()


class Usuario(BaseModel):
    id: int
    nombre_usuario: str
    id_participante: int


class SesionRespuesta(BaseModel):
    """Lo que devuelve el login: el token y el usuario."""

    token: str
    usuario: Usuario
