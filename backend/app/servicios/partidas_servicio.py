"""Partidas de práctica y récords por canción.

El navegador manda las pulsaciones y aquí se calcula la puntuación con las
mismas reglas del juego (servicios/ritmo.py). El resultado se guarda.
"""
from app.repositorios import partidas_repo
from app.servicios import canciones_servicio, ritmo
from app.servicios.errores import ErrorDeNegocio

TOP = 5
# La pantalla de una canción enseña más puestos que la lista de todas
TOP_CANCION = 10
# Orden de los niveles en las estadísticas: de más fácil a más difícil
ORDEN_NIVEL = {"facil": 0, "media": 1, "dificil": 2}


def notas_en_ms(cancion: dict) -> list[dict]:
    """Notas de la canción con su momento en milisegundos, como las juzga ritmo.evaluar."""
    return [{"ms": ritmo.pulso_a_ms(n["pulso"], cancion["bpm"]), "tecla": n["tecla"]} for n in cancion["notas"]]


def puntuar(cancion: dict, pulsaciones: list[dict]) -> dict:
    """Comprueba que las pulsaciones son razonables y calcula la puntuación.

    Lo usan las partidas de práctica y los duelos del torneo.
    """
    notas = notas_en_ms(cancion)
    # Más pulsaciones que tres por nota no tiene sentido: sería alguien aporreando o un envío falso
    if len(pulsaciones) > 3 * len(notas) + 20:
        raise ErrorDeNegocio("Demasiadas pulsaciones para esta canción")
    fin_ms = ritmo.pulso_a_ms(cancion["fin"] + 2, cancion["bpm"])
    # Se admite un segundo antes del inicio por si alguien pulsa durante la entrada
    if any(p["ms"] < -1000 or p["ms"] > fin_ms for p in pulsaciones):
        raise ErrorDeNegocio("Hay pulsaciones fuera de la canción")
    return ritmo.evaluar(notas, pulsaciones)


def guardar(id_usuario: int, id_cancion: str, pulsaciones: list[dict]) -> dict:
    cancion = canciones_servicio.obtener(id_cancion)  # NoEncontrado si no existe
    marcador = puntuar(cancion, pulsaciones)
    partidas_repo.guardar(id_usuario, id_cancion, marcador)
    return marcador


def ordenar(filas: list[dict]) -> list[dict]:
    """Orden del récord: más puntos, más PERFECT, menos MISS y, a igualdad, quien lo hizo antes."""
    return sorted(filas, key=lambda f: (-f["puntos"], -f["perfect"], f["miss"], f["jugada_en"]))


def ordenar_canciones(canciones: list[dict]) -> list[dict]:
    """De más fácil a más difícil: por nivel y, dentro del mismo nivel, la más lenta primero."""
    return sorted(canciones, key=lambda c: (ORDEN_NIVEL[c["nivel"]], c["bpm"], c["titulo"]))


def agrupar_records(canciones: list[dict], mejores: list[dict], limite: int = TOP) -> list[dict]:
    """Junta cada canción con sus mejores marcas (una por usuario). Función pura, se prueba con pytest."""
    resultado = []
    for c in ordenar_canciones(canciones):
        filas = ordenar([f for f in mejores if f["id_cancion"] == c["id"]])[:limite]
        marcas = [{"puesto": i + 1, **{k: v for k, v in f.items() if k != "id_cancion"}} for i, f in enumerate(filas)]
        resultado.append({"id": c["id"], "titulo": c["titulo"], "nivel": c["nivel"], "marcas": marcas})
    return resultado


def records() -> list[dict]:
    return agrupar_records(canciones_servicio.listar(), partidas_repo.mejor_de_cada_usuario())


def records_de(id_cancion: str) -> dict:
    """El top 10 de una sola canción, para su pantalla con el podio."""
    cancion = canciones_servicio.obtener(id_cancion)  # NoEncontrado si no existe
    mejores = partidas_repo.mejor_de_cada_usuario(id_cancion)
    return agrupar_records([cancion], mejores, TOP_CANCION)[0]
