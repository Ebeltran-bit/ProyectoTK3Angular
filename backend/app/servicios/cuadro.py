"""Algoritmo del cuadro de eliminación directa.

No toca la base de datos: recibe ids y devuelve combates. Así se puede
probar por separado (ver tests/test_cuadro.py).

Idea:
- Con N participantes, el cuadro tiene el tamaño de la siguiente potencia
  de 2 (5 -> 8, 6 -> 8, 9 -> 16).
- Faltan (tamaño - N) participantes: esos huecos son BYE.
- La primera ronda tiene tamaño / 2 combates. En los combates con BYE solo
  hay un participante, que pasa directo a la ronda 2.
- Nunca hay dos BYE en el mismo combate, porque N siempre es mayor que la
  mitad del tamaño del cuadro.
"""
import random


def tamano_cuadro(num_participantes: int) -> int:
    """Siguiente potencia de 2 mayor o igual que num_participantes."""
    tamano = 1
    while tamano < num_participantes:
        tamano *= 2
    return tamano


def total_rondas(num_participantes: int) -> int:
    """Rondas necesarias hasta la final (8 participantes -> 3 rondas)."""
    return tamano_cuadro(num_participantes).bit_length() - 1


def generar_primera_ronda(ids_participantes: list[int], aleatorio: random.Random | None = None) -> list[dict]:
    """Sortea la primera ronda.

    Devuelve una lista de combates como diccionarios:
    {ronda, posicion, id_participante1, id_participante2, id_ganador, es_bye, estado}
    """
    if len(ids_participantes) < 2:
        raise ValueError("Hacen falta al menos 2 participantes")
    if len(set(ids_participantes)) != len(ids_participantes):
        raise ValueError("Hay participantes repetidos")

    aleatorio = aleatorio or random.Random()
    num_combates = tamano_cuadro(len(ids_participantes)) // 2
    num_byes = num_combates * 2 - len(ids_participantes)

    # Orden aleatorio de participantes y posiciones aleatorias para los BYE
    bombo = list(ids_participantes)
    aleatorio.shuffle(bombo)
    posiciones_bye = set(aleatorio.sample(range(num_combates), num_byes))

    combates = []
    for posicion in range(num_combates):
        if posicion in posiciones_bye:
            participante = bombo.pop()
            combates.append({
                "ronda": 1,
                "posicion": posicion,
                "id_participante1": participante,
                "id_participante2": None,
                "id_ganador": participante,
                "es_bye": True,
                "estado": "resuelto",
            })
        else:
            combates.append({
                "ronda": 1,
                "posicion": posicion,
                "id_participante1": bombo.pop(),
                "id_participante2": bombo.pop(),
                "id_ganador": None,
                "es_bye": False,
                "estado": "pendiente",
            })
    return combates
