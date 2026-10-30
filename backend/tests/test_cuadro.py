"""Pruebas del algoritmo del cuadro.  Ejecutar desde backend/:  python -m pytest"""
import random

import pytest

from app.servicios.cuadro import generar_primera_ronda, generar_siguiente_ronda, tamano_cuadro, total_rondas


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


def test_siguiente_ronda_respeta_el_cuadro():
    ronda1 = [
        {"ronda": 1, "posicion": 0, "id_ganador": 10},
        {"ronda": 1, "posicion": 1, "id_ganador": 11},
        {"ronda": 1, "posicion": 2, "id_ganador": 12},
        {"ronda": 1, "posicion": 3, "id_ganador": 13},
    ]
    ronda2 = generar_siguiente_ronda(list(reversed(ronda1)))  # el orden de entrada no importa
    assert [(c["ronda"], c["posicion"], c["id_participante1"], c["id_participante2"]) for c in ronda2] == [
        (2, 0, 10, 11),
        (2, 1, 12, 13),
    ]
    assert all(c["estado"] == "pendiente" and not c["es_bye"] for c in ronda2)


def test_la_final_no_genera_mas_rondas():
    assert generar_siguiente_ronda([{"ronda": 3, "posicion": 0, "id_ganador": 5}]) == []


def test_no_avanza_si_la_ronda_no_esta_completa():
    with pytest.raises(ValueError):
        generar_siguiente_ronda([
            {"ronda": 1, "posicion": 0, "id_ganador": 1},
            {"ronda": 1, "posicion": 1, "id_ganador": None},
        ])


@pytest.mark.parametrize("n", range(2, 17))
def test_torneo_completo_hasta_el_campeon(n):
    """Simula un torneo entero eligiendo ganadores al azar."""
    aleatorio = random.Random(n)
    ids = list(range(1, n + 1))
    ronda = generar_primera_ronda(ids, aleatorio)
    rondas_jugadas = 0
    combates_reales = 0
    eliminados = []

    while True:
        rondas_jugadas += 1
        for c in ronda:
            if c["id_ganador"] is None:
                c["id_ganador"] = aleatorio.choice([c["id_participante1"], c["id_participante2"]])
                perdedor = c["id_participante2"] if c["id_ganador"] == c["id_participante1"] else c["id_participante1"]
                eliminados.append(perdedor)
                combates_reales += 1
        siguiente = generar_siguiente_ronda(ronda)
        if not siguiente:
            campeon = ronda[0]["id_ganador"]
            break
        ronda = siguiente

    assert rondas_jugadas == total_rondas(n)
    assert combates_reales == n - 1           # en KO cada combate elimina a uno
    assert len(set(eliminados)) == n - 1      # nadie pierde dos veces
    assert campeon in ids and campeon not in eliminados
