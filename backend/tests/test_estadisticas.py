"""Pruebas de las estadísticas por participante (fase 4).

Se prueba la función pura calcular(), así no hace falta MariaDB.
"""
from app.servicios.estadisticas_servicio import calcular

ANA, LUIS, MARTA, PEDRO = 1, 2, 3, 4
PARTICIPANTES = [
    {"id": ANA, "nick": "Ana", "logo": None, "activo": True},
    {"id": LUIS, "nick": "Luis", "logo": None, "activo": True},
    {"id": MARTA, "nick": "Marta", "logo": None, "activo": False},
    {"id": PEDRO, "nick": "Pedro", "logo": None, "activo": True},
]


def combate(p1, p2, ganador, bye=False):
    return {"id_participante1": p1, "id_participante2": p2, "id_ganador": ganador, "es_bye": bye}


def por_nick(filas):
    return {f["nick"]: f for f in filas}


def test_victorias_y_derrotas_en_varios_torneos():
    combates = [combate(ANA, LUIS, ANA), combate(ANA, MARTA, MARTA),  # torneo 1
                combate(LUIS, ANA, ANA)]  # torneo 2
    filas = por_nick(calcular(PARTICIPANTES, combates, []))
    assert (filas["Ana"]["combates"], filas["Ana"]["victorias"], filas["Ana"]["derrotas"]) == (3, 2, 1)
    assert (filas["Luis"]["victorias"], filas["Luis"]["derrotas"]) == (0, 2)
    assert (filas["Marta"]["victorias"], filas["Marta"]["derrotas"]) == (1, 0)


def test_un_bye_no_suma_victoria_ni_combate():
    filas = por_nick(calcular(PARTICIPANTES, [combate(PEDRO, None, PEDRO, bye=True)], []))
    assert filas["Pedro"]["combates"] == 0
    assert filas["Pedro"]["victorias"] == 0


def test_un_combate_pendiente_no_cuenta():
    filas = por_nick(calcular(PARTICIPANTES, [combate(ANA, LUIS, None)], []))
    assert filas["Ana"]["combates"] == 0 and filas["Luis"]["combates"] == 0


def test_salen_inactivos_y_participantes_sin_combates():
    filas = por_nick(calcular(PARTICIPANTES, [combate(MARTA, ANA, MARTA)], []))
    assert len(filas) == 4
    assert filas["Marta"]["activo"] is False and filas["Marta"]["victorias"] == 1
    assert filas["Pedro"] == {"id": PEDRO, "nick": "Pedro", "logo": None, "activo": True,
                              "combates": 0, "victorias": 0, "derrotas": 0, "torneos_ganados": 0}


def test_torneos_ganados():
    filas = por_nick(calcular(PARTICIPANTES, [], [ANA, ANA, LUIS]))
    assert filas["Ana"]["torneos_ganados"] == 2
    assert filas["Luis"]["torneos_ganados"] == 1
    assert filas["Pedro"]["torneos_ganados"] == 0


def test_orden_por_victorias_y_luego_menos_derrotas():
    combates = [combate(LUIS, PEDRO, LUIS), combate(ANA, MARTA, ANA), combate(ANA, LUIS, LUIS)]
    # Luis: 2-0; Ana: 1-1; Marta y Pedro: 0-1 (por nick)
    assert [f["nick"] for f in calcular(PARTICIPANTES, combates, [])] == ["Luis", "Ana", "Marta", "Pedro"]


def test_sin_participantes():
    assert calcular([], [], []) == []
