"""Cálculo de la puntuación del duelo de ritmo en el backend.

Es la misma lógica que frontend/src/app/juego/evaluacion.ts, con los mismos
números que frontend/src/app/juego/reglas.ts. El navegador la usa para
enseñar el marcador mientras se juega; la puntuación que se guarda es la de
aquí, calculada a partir de las pulsaciones, para que nadie pueda inventarse
un resultado. Las pruebas de tests/test_ritmo.py repiten los casos de Vitest.
"""
VENTANA_PERFECT_MS = 40
VENTANA_GREAT_MS = 90
PUNTOS = {"perfect": 300, "great": 100, "miss": 0}
HYPE = {"perfect": 3, "great": 1, "miss": -6}
HYPE_INICIAL = 50
HYPE_MAXIMO = 100

# IA del duelo (solo en el backend): para cada nivel, la probabilidad de que
# se le escape una nota y el error típico al pulsar (desviación de una curva
# normal, en ms). Con estos números una persona que juega bien le gana.
IA = {
    "facil": {"prob_fallo": 0.05, "error_ms": 30},
    "media": {"prob_fallo": 0.10, "error_ms": 45},
    "dificil": {"prob_fallo": 0.15, "error_ms": 60},
}


def pulso_a_ms(pulso: float, bpm: int) -> float:
    """Cada pulso dura 60000 / BPM milisegundos."""
    return pulso * 60000 / bpm


def marcador_inicial() -> dict:
    return {"puntos": 0, "combo": 0, "combo_maximo": 0, "hype": HYPE_INICIAL,
            "perfect": 0, "great": 0, "miss": 0}


def juzgar_desfase(desfase_ms: float) -> str:
    distancia = abs(desfase_ms)
    if distancia <= VENTANA_PERFECT_MS:
        return "perfect"
    if distancia <= VENTANA_GREAT_MS:
        return "great"
    return "miss"


def aplicar_juicio(m: dict, juicio: str) -> dict:
    """Devuelve un marcador nuevo con el juicio sumado (el combo se rompe con MISS)."""
    combo = 0 if juicio == "miss" else m["combo"] + 1
    nuevo = dict(m)
    nuevo["puntos"] += PUNTOS[juicio]
    nuevo["combo"] = combo
    nuevo["combo_maximo"] = max(m["combo_maximo"], combo)
    nuevo["hype"] = min(HYPE_MAXIMO, max(0, m["hype"] + HYPE[juicio]))
    nuevo[juicio] += 1
    return nuevo


def evaluar(notas: list[dict], pulsaciones: list[dict]) -> dict:
    """Repite la partida: recorre las pulsaciones en orden y juzga cada una.

    notas:       [{"ms": 1000, "tecla": "accion"}, ...]  (de la canción)
    pulsaciones: [{"ms": 1012, "tecla": "accion"}, ...]  (lo que mandó el navegador)
    """
    juicios: list[str | None] = [None] * len(notas)
    marcador = marcador_inicial()

    def cerrar_pasadas(ahora: float) -> None:
        nonlocal marcador
        for i, nota in enumerate(notas):
            if juicios[i] is None and ahora - nota["ms"] > VENTANA_GREAT_MS:
                juicios[i] = "miss"
                marcador = aplicar_juicio(marcador, "miss")

    for pulsacion in sorted(pulsaciones, key=lambda p: p["ms"]):
        ms = pulsacion["ms"]
        cerrar_pasadas(ms)
        # Nota sin juzgar más cercana dentro de la ventana GREAT
        cercanas = [i for i, n in enumerate(notas)
                    if juicios[i] is None and abs(n["ms"] - ms) <= VENTANA_GREAT_MS]
        if not cercanas:
            marcador = aplicar_juicio(marcador, "miss")  # pulsar sin nota cerca es un fallo
            continue
        i = min(cercanas, key=lambda j: abs(notas[j]["ms"] - ms))
        juicio = juzgar_desfase(ms - notas[i]["ms"]) if notas[i]["tecla"] == pulsacion["tecla"] else "miss"
        juicios[i] = juicio
        marcador = aplicar_juicio(marcador, juicio)

    cerrar_pasadas(float("inf"))  # las notas que nadie pulsó
    return marcador
