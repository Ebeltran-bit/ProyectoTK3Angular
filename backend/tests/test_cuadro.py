"""Pruebas del algoritmo del cuadro.  Ejecutar desde backend/:  python -m pytest"""
import random

import pytest

from app.servicios.cuadro import generar_primera_ronda, tamano_cuadro, total_rondas


@pytest.mark.parametrize("n, tamano, rondas", [(2, 2, 1), (3, 4, 2), (4, 4, 2), (5, 8, 3), (8, 8, 3), (9, 16, 4)])
def test_tamano_y_rondas(n, tamano, rondas):
    assert tamano_cuadro(n) == tamano
    assert total_rondas(n) == rondas


@pytest.mark.parametrize("n", range(2, 33))
def test_primera_ronda_valida(n):
    ids = list(range(100, 100 + n))
    combates = generar_primera_ronda(ids, random.Random(n))

    # Un combate por cada pareja de huecos del cuadro, con posiciones 0..k-1
    assert len(combates) == tamano_cuadro(n) // 2
    assert [c["posicion"] for c in combates] == list(range(len(combates)))

    # Cada participante aparece exactamente una vez
    jugadores = [c["id_participante1"] for c in combates] + [
        c["id_participante2"] for c in combates if c["id_participante2"] is not None
    ]
    assert sorted(jugadores) == ids

    # Los BYE pasan directos; el resto queda pendiente
    byes = [c for c in combates if c["es_bye"]]
    assert len(byes) == tamano_cuadro(n) - n
    for c in byes:
        assert c["id_participante2"] is None
        assert c["id_ganador"] == c["id_participante1"]
        assert c["estado"] == "resuelto"
    for c in combates:
        if not c["es_bye"]:
            assert c["id_ganador"] is None and c["estado"] == "pendiente"


def test_el_sorteo_es_aleatorio():
    ids = list(range(1, 9))
    primeros = {generar_primera_ronda(ids)[0]["id_participante1"] for _ in range(50)}
    assert len(primeros) > 1


@pytest.mark.parametrize("ids", [[], [1], [1, 1, 2]])
def test_entradas_invalidas(ids):
    with pytest.raises(ValueError):
        generar_primera_ronda(ids)
