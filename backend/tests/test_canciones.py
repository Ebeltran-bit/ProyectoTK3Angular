"""Pruebas de las canciones del duelo de ritmo (etapa 3).

Se comprueban los archivos reales de app/beatmaps/ y beatmaps mal hechos
escritos aquí mismo. No hace falta MariaDB.
"""
import copy

import pytest

from app.repositorios import canciones_repo
from app.servicios import canciones_servicio
from app.servicios.canciones_servicio import BeatmapInvalido
from app.servicios.errores import NoEncontrado

BUENA = {
    "id": "prueba", "titulo": "Prueba", "nivel": "facil", "bpm": 100, "pulsos_por_compas": 4,
    "cuenta_atras": 4, "fin": 12, "escenario": "puerto", "audio": None,
    "notas": [{"pulso": 4, "tecla": "accion"}, {"pulso": 5.5, "tecla": "alterna"}],
    "musica": {"repetir_cada": 4, "pistas": [{"instrumento": "bombo", "volumen": 0.5, "notas": [[0, 0, 0.1]]}]},
}


def con(**cambios):
    datos = copy.deepcopy(BUENA)
    datos.update(cambios)
    return datos


@pytest.mark.parametrize("id_cancion", canciones_repo.listar_ids())
def test_todos_los_beatmaps_del_juego_son_validos(id_cancion):
    canciones_servicio.validar(canciones_repo.leer(id_cancion), id_cancion)


def test_la_lista_trae_el_puerto_sin_notas():
    puerto = next(c for c in canciones_servicio.listar() if c["id"] == "puerto")
    assert puerto["nivel"] == "facil" and puerto["bpm"] == 88
    assert puerto["num_notas"] == 40
    assert "notas" not in puerto


def test_el_detalle_trae_notas_y_musica():
    puerto = canciones_servicio.obtener("puerto")
    assert puerto["notas"][0] == {"pulso": 4, "tecla": "accion"}
    assert puerto["musica"]["pistas"]


@pytest.mark.parametrize("id_cancion", ["no-existe", "../.env", "PUERTO", ""])
def test_cancion_que_no_existe(id_cancion):
    with pytest.raises(NoEncontrado):
        canciones_servicio.obtener(id_cancion)


def test_un_beatmap_bien_hecho_pasa():
    assert canciones_servicio.validar(con(), "prueba")["bpm"] == 100


@pytest.mark.parametrize("datos", [
    con(nivel="imposible"),
    con(bpm=10),
    con(notas=[{"pulso": 6, "tecla": "accion"}, {"pulso": 5, "tecla": "accion"}]),  # desordenadas
    con(notas=[{"pulso": 5, "tecla": "accion"}, {"pulso": 5, "tecla": "alterna"}]),  # mismo pulso
    con(notas=[{"pulso": 2, "tecla": "accion"}]),  # durante la cuenta atrás
    con(notas=[{"pulso": 12, "tecla": "accion"}]),  # después del final
    con(notas=[{"pulso": 5, "tecla": "espacio"}]),  # tecla que no existe
    con(notas=[]),
    con(id="otra"),  # no coincide con el archivo
])
def test_beatmaps_mal_hechos(datos):
    with pytest.raises(BeatmapInvalido):
        canciones_servicio.validar(datos, "prueba")
