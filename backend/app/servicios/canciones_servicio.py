"""Reglas de las canciones del duelo de ritmo (etapa 3).

Comprueba que cada beatmap está bien hecho antes de mandarlo al navegador:
si un archivo tiene un error, se detecta aquí y no a mitad de partida.
"""
from app.modelos import Cancion
from app.repositorios import canciones_repo
from app.servicios.errores import NoEncontrado


class BeatmapInvalido(ValueError):
    """Un archivo de canción no cumple el formato. Es un error de quien lo escribió, no del usuario."""


def validar(datos: dict, id_esperado: str) -> dict:
    """Comprueba el formato (con el modelo Cancion) y las reglas que el modelo no puede ver."""
    try:
        cancion = Cancion(**datos).model_dump()
    except ValueError as error:
        raise BeatmapInvalido(f"{id_esperado}: {error}") from error
    if cancion["id"] != id_esperado:
        raise BeatmapInvalido(f"{id_esperado}: el id no coincide con el nombre del archivo")
    pulsos = [nota["pulso"] for nota in cancion["notas"]]
    if not pulsos:
        raise BeatmapInvalido(f"{id_esperado}: la canción no tiene notas")
    if pulsos != sorted(pulsos) or len(set(pulsos)) != len(pulsos):
        raise BeatmapInvalido(f"{id_esperado}: las notas tienen que ir en orden y sin repetir pulso")
    if pulsos[0] < cancion["cuenta_atras"]:
        raise BeatmapInvalido(f"{id_esperado}: hay notas durante la cuenta atrás")
    if pulsos[-1] >= cancion["fin"]:
        raise BeatmapInvalido(f"{id_esperado}: hay notas después del final")
    return cancion


def listar() -> list[dict]:
    """Todas las canciones, sin notas ni música (lo justo para elegir una)."""
    resumenes = []
    for id_cancion in canciones_repo.listar_ids():
        c = validar(canciones_repo.leer(id_cancion), id_cancion)
        resumenes.append({"id": c["id"], "titulo": c["titulo"], "nivel": c["nivel"], "bpm": c["bpm"],
                          "escenario": c["escenario"], "num_notas": len(c["notas"])})
    return resumenes


def obtener(id_cancion: str) -> dict:
    datos = canciones_repo.leer(id_cancion)
    if datos is None:
        raise NoEncontrado("La canción no existe")
    return validar(datos, id_cancion)
