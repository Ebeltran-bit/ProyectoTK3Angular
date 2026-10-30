"""Pruebas del personaje: validación del aspecto y valores iniciales."""
import pytest
from pydantic import ValidationError

from app.modelos import Apariencia
from app.servicios import personajes_servicio

VALIDA = {"piel": "#f1c27d", "pelo": "#000000", "ropa": "#E74C3C", "pantalon": "#2c3e50",
          "peinado": "coleta", "accesorio": "gorra"}


def test_apariencia_valida():
    assert Apariencia(**VALIDA).peinado == "coleta"


@pytest.mark.parametrize("campo, valor", [
    ("piel", "rojo"), ("pelo", "#12345"), ("ropa", "#gggggg"), ("pantalon", ""),
    ("peinado", "afro"), ("accesorio", "corona"),
])
def test_apariencia_invalida(campo, valor):
    with pytest.raises(ValidationError):
        Apariencia(**{**VALIDA, campo: valor})


def test_sin_personaje_guardado_devuelve_el_inicial(monkeypatch):
    monkeypatch.setattr(personajes_servicio.personajes_repo, "obtener", lambda _id: None)
    monkeypatch.setattr(personajes_servicio.participantes_repo, "obtener", lambda _id: {"nick": "eva"})
    personaje = personajes_servicio.obtener_de_usuario({"id_participante": 7})
    assert personaje["nick"] == "eva" and personaje["id_participante"] == 7
    assert Apariencia(**personaje)  # el aspecto inicial también es válido
