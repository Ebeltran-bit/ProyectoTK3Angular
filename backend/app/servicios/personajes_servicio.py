"""Reglas del personaje de cada usuario."""
from app.repositorios import participantes_repo, personajes_repo

# Aspecto con el que empieza todo personaje nuevo
APARIENCIA_INICIAL = {
    "piel": "#f1c27d",
    "pelo": "#1b1b1f",
    "ropa": "#e74c3c",
    "pantalon": "#2c3e50",
    "peinado": "corto",
    "accesorio": "cinta",
}


def _con_nick(id_participante: int, apariencia: dict) -> dict:
    participante = participantes_repo.obtener(id_participante)
    return {**apariencia, "id_participante": id_participante, "nick": participante["nick"]}


def obtener_de_usuario(usuario: dict) -> dict:
    """Personaje del usuario; si todavía no lo ha guardado, el aspecto inicial."""
    id_participante = usuario["id_participante"]
    apariencia = personajes_repo.obtener(id_participante) or APARIENCIA_INICIAL
    return _con_nick(id_participante, apariencia)


def guardar_de_usuario(usuario: dict, apariencia: dict) -> dict:
    personajes_repo.guardar(usuario["id_participante"], apariencia)
    return obtener_de_usuario(usuario)
