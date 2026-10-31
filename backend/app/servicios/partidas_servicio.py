"""Partidas de práctica y récords por canción.

El navegador manda las pulsaciones y aquí se calcula la puntuación con las
mismas reglas del juego (servicios/ritmo.py). El resultado se guarda.
"""
from app.repositorios import partidas_repo
from app.servicios import canciones_servicio, ritmo
from app.servicios.errores import ErrorDeNegocio

TOP = 5


def guardar(id_usuario: int, id_cancion: str, pulsaciones: list[dict]) -> dict:
    cancion = canciones_servicio.obtener(id_cancion)  # NoEncontrado si no existe
    notas = [{"ms": ritmo.pulso_a_ms(n["pulso"], cancion["bpm"]), "tecla": n["tecla"]} for n in cancion["notas"]]
    # Más pulsaciones que tres por nota no tiene sentido: sería alguien aporreando o un envío falso
    if len(pulsaciones) > 3 * len(notas) + 20:
        raise ErrorDeNegocio("Demasiadas pulsaciones para esta canción")
    fin_ms = ritmo.pulso_a_ms(cancion["fin"] + 2, cancion["bpm"])
    # Se admite un segundo antes del inicio por si alguien pulsa durante la entrada
    if any(p["ms"] < -1000 or p["ms"] > fin_ms for p in pulsaciones):
        raise ErrorDeNegocio("Hay pulsaciones fuera de la canción")
    marcador = ritmo.evaluar(notas, pulsaciones)
    partidas_repo.guardar(id_usuario, id_cancion, marcador)
    return marcador


def ordenar(filas: list[dict]) -> list[dict]:
    """Orden del récord: más puntos, más PERFECT, menos MISS y, a igualdad, quien lo hizo antes."""
    return sorted(filas, key=lambda f: (-f["puntos"], -f["perfect"], f["miss"], f["jugada_en"]))


def agrupar_records(canciones: list[dict], mejores: list[dict], limite: int = TOP) -> list[dict]:
    """Junta cada canción con sus mejores marcas (una por usuario). Función pura, se prueba con pytest."""
    resultado = []
    for c in canciones:
        filas = ordenar([f for f in mejores if f["id_cancion"] == c["id"]])[:limite]
        marcas = [{"puesto": i + 1, **{k: v for k, v in f.items() if k != "id_cancion"}} for i, f in enumerate(filas)]
        resultado.append({"id": c["id"], "titulo": c["titulo"], "nivel": c["nivel"], "marcas": marcas})
    return resultado


def records() -> list[dict]:
    return agrupar_records(canciones_servicio.listar(), partidas_repo.mejor_de_cada_usuario())
