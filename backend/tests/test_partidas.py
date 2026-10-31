"""Pruebas de las partidas de práctica y los récords por canción.

El repositorio se sustituye por uno en memoria: no hace falta MariaDB.
"""
from datetime import datetime

import pytest

from app.servicios import partidas_servicio, ritmo
from app.servicios.errores import ErrorDeNegocio, NoEncontrado


class RepoEnMemoria:
    def __init__(self):
        self.guardadas = []

    def guardar(self, id_usuario, id_cancion, marcador):
        self.guardadas.append((id_usuario, id_cancion, marcador))
        return len(self.guardadas)


@pytest.fixture
def repo(monkeypatch):
    falso = RepoEnMemoria()
    monkeypatch.setattr(partidas_servicio, "partidas_repo", falso)
    return falso


def notas_del_puerto_en_ms():
    from app.servicios import canciones_servicio
    c = canciones_servicio.obtener("puerto")
    return [ritmo.pulso_a_ms(n["pulso"], c["bpm"]) for n in c["notas"]]


def test_la_puntuacion_la_calcula_el_backend(repo):
    pulsaciones = [{"ms": ms + 20, "tecla": "accion"} for ms in notas_del_puerto_en_ms()]
    resultado = partidas_servicio.guardar(7, "puerto", pulsaciones)
    assert resultado["perfect"] == 40 and resultado["miss"] == 0
    assert resultado["puntos"] == 40 * 300
    assert repo.guardadas == [(7, "puerto", resultado)]


def test_sin_pulsaciones_se_guarda_con_todo_miss(repo):
    assert partidas_servicio.guardar(7, "puerto", [])["miss"] == 40


def test_cancion_que_no_existe(repo):
    with pytest.raises(NoEncontrado):
        partidas_servicio.guardar(7, "no-existe", [])
    assert repo.guardadas == []


def test_demasiadas_pulsaciones(repo):
    with pytest.raises(ErrorDeNegocio):
        partidas_servicio.guardar(7, "puerto", [{"ms": 3000, "tecla": "accion"}] * 200)


@pytest.mark.parametrize("ms", [-5000, 10_000_000])
def test_pulsaciones_fuera_de_la_cancion(repo, ms):
    with pytest.raises(ErrorDeNegocio):
        partidas_servicio.guardar(7, "puerto", [{"ms": ms, "tecla": "accion"}])


def marca(usuario, puntos, perfect=0, miss=0, dia=1, cancion="puerto"):
    return {"id_cancion": cancion, "nombre_usuario": usuario, "puntos": puntos, "perfect": perfect,
            "great": 0, "miss": miss, "combo_maximo": 0, "jugada_en": datetime(2026, 11, dia)}


CANCIONES = [{"id": "puerto", "titulo": "Puerto", "nivel": "facil"},
             {"id": "bar", "titulo": "Brindis", "nivel": "facil"}]


def test_records_ordenados_y_con_puesto():
    filas = [marca("ana", 900), marca("luis", 1200), marca("eva", 600, cancion="bar")]
    r = partidas_servicio.agrupar_records(CANCIONES, filas)
    assert [m["nombre_usuario"] for m in r[0]["marcas"]] == ["luis", "ana"]
    assert [m["puesto"] for m in r[0]["marcas"]] == [1, 2]
    assert r[1]["marcas"][0]["nombre_usuario"] == "eva"


def test_empates_mas_perfect_luego_menos_miss_luego_el_primero():
    filas = [marca("a", 900, perfect=2, miss=1, dia=3), marca("b", 900, perfect=3, miss=5),
             marca("c", 900, perfect=2, miss=0, dia=5), marca("d", 900, perfect=2, miss=1, dia=2)]
    r = partidas_servicio.agrupar_records(CANCIONES, filas)
    assert [m["nombre_usuario"] for m in r[0]["marcas"]] == ["b", "c", "d", "a"]


def test_solo_el_top_5():
    filas = [marca(f"u{i}", i * 100) for i in range(8)]
    marcas = partidas_servicio.agrupar_records(CANCIONES, filas)[0]["marcas"]
    assert len(marcas) == 5 and marcas[0]["nombre_usuario"] == "u7"


def test_cancion_sin_partidas_sale_vacia():
    assert partidas_servicio.agrupar_records(CANCIONES, [])[1]["marcas"] == []
