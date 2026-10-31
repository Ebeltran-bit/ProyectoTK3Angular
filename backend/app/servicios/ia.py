"""IA del duelo: toca la canción como lo haría una persona.

No "ve" la pantalla. Para cada nota decide si se le escapa y, si la toca,
con cuánto error. El error sigue una curva normal: casi siempre cae cerca
de la nota y a veces se pasa. Las pulsaciones que genera se puntúan con las
mismas reglas que las de una persona (ritmo.evaluar).
"""
import random

from app.servicios import ritmo


def pulsaciones(notas: list[dict], nivel: str, aleatorio: random.Random | None = None) -> list[dict]:
    """notas: [{"ms": 1000, "tecla": "accion"}, ...] → pulsaciones con el mismo formato.

    aleatorio permite fijar la semilla en las pruebas.
    """
    azar = aleatorio or random.Random()
    ajustes = ritmo.IA[nivel]
    resultado = []
    for nota in notas:
        if azar.random() < ajustes["prob_fallo"]:
            continue  # se le escapa: la nota quedará como MISS
        error = azar.gauss(0, ajustes["error_ms"])
        resultado.append({"ms": round(nota["ms"] + error, 1), "tecla": nota["tecla"]})
    return resultado
