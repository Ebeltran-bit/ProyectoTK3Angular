"""Reglas de las estadísticas por participante (fase 4).

- Solo cuentan los combates resueltos que no son BYE: pasar por BYE no es
  jugar un combate, así que no suma victoria ni combate jugado.
- Salen todos los participantes, también los inactivos (desactivar no borra
  su historial) y los que aún no han jugado (con todo a 0).
- Torneos ganados: veces que el participante es campeón de un torneo finalizado.
"""
from app.repositorios import estadisticas_repo, participantes_repo


def calcular(participantes: list[dict], combates: list[dict], campeones: list[int]) -> list[dict]:
    """Cuenta combates, victorias, derrotas y torneos ganados de cada participante.

    Es una función pura (no toca la base de datos) para poder probarla con pytest.
    """
    filas = {
        p["id"]: {"id": p["id"], "nick": p["nick"], "logo": p["logo"], "activo": p["activo"],
                  "combates": 0, "victorias": 0, "derrotas": 0, "torneos_ganados": 0}
        for p in participantes
    }
    for combate in combates:
        if combate["es_bye"] or combate["id_ganador"] is None:
            continue
        for id_ in (combate["id_participante1"], combate["id_participante2"]):
            fila = filas.get(id_)
            if fila is None:
                continue
            fila["combates"] += 1
            if id_ == combate["id_ganador"]:
                fila["victorias"] += 1
            else:
                fila["derrotas"] += 1
    for id_campeon in campeones:
        if id_campeon in filas:
            filas[id_campeon]["torneos_ganados"] += 1

    # Primero quien más gana; a igualdad, quien menos pierde, y luego por nick
    return sorted(filas.values(), key=lambda f: (-f["victorias"], f["derrotas"], f["nick"].lower()))


def por_participante() -> list[dict]:
    return calcular(
        participantes_repo.listar(),
        estadisticas_repo.combates_resueltos(),
        estadisticas_repo.campeones(),
    )
