"""Pruebas del cálculo de la puntuación en el backend.

Son los mismos casos que frontend/src/app/juego/evaluacion.spec.ts: si las
dos versiones dieran resultados distintos, alguna de las dos pruebas fallaría.
"""
import pytest

from app.servicios.ritmo import aplicar_juicio, evaluar, juzgar_desfase, marcador_inicial, pulso_a_ms


@pytest.mark.parametrize("desfase, esperado", [
    (0, "perfect"), (40, "perfect"), (-40, "perfect"), (41, "great"), (-41, "great"),
    (90, "great"), (-90, "great"), (91, "miss"), (-91, "miss"),
])
def test_juzgar_desfase(desfase, esperado):
    assert juzgar_desfase(desfase) == esperado


def test_pulso_a_ms():
    assert pulso_a_ms(3, 60) == 3000
    assert pulso_a_ms(4, 120) == 2000


def test_hype_entre_0_y_100():
    m = marcador_inicial()
    for _ in range(20):
        m = aplicar_juicio(m, "miss")
    assert m["hype"] == 0
    for _ in range(40):
        m = aplicar_juicio(m, "perfect")
    assert m["hype"] == 100


NOTAS = [{"ms": 1000, "tecla": "accion"}, {"ms": 2000, "tecla": "accion"}, {"ms": 3000, "tecla": "alterna"}]


def test_cada_nota_se_juzga_una_vez():
    m = evaluar(NOTAS, [{"ms": 1000, "tecla": "accion"}, {"ms": 1010, "tecla": "accion"}])
    assert (m["perfect"], m["miss"]) == (1, 1 + 2)  # el segundo toque y las dos notas sin pulsar


def test_pulsar_sin_nota_cerca_no_gasta_nota():
    m = evaluar(NOTAS, [{"ms": 1500, "tecla": "accion"}, {"ms": 2000, "tecla": "accion"},
                        {"ms": 3000, "tecla": "alterna"}])
    assert (m["perfect"], m["miss"]) == (2, 2)  # el toque de 1500 y la nota de 1000


def test_tecla_equivocada_es_miss():
    m = evaluar(NOTAS, [{"ms": 1000, "tecla": "accion"}, {"ms": 2000, "tecla": "accion"},
                        {"ms": 3000, "tecla": "accion"}])
    assert (m["perfect"], m["miss"]) == (2, 1)


def test_el_orden_de_las_pulsaciones_no_importa():
    a = [{"ms": 2000, "tecla": "accion"}, {"ms": 1000, "tecla": "accion"}]
    assert evaluar(NOTAS, a) == evaluar(NOTAS, list(reversed(a)))


def test_sin_pulsaciones_todo_es_miss():
    m = evaluar(NOTAS, [])
    assert (m["miss"], m["puntos"], m["hype"]) == (3, 0, 50 - 18)


def test_cancion_de_ejemplo_igual_que_en_vitest():
    notas = [{"ms": ms, "tecla": "accion"} for ms in (0, 500, 1000, 1500, 2000)]
    pulsaciones = [{"ms": ms, "tecla": "accion"} for ms in (10, 560, 990, 2000)]
    assert evaluar(notas, pulsaciones) == {
        "puntos": 1000, "combo": 1, "combo_maximo": 3, "hype": 50 + 3 + 1 + 3 - 6 + 3,
        "perfect": 3, "great": 1, "miss": 1,
    }
