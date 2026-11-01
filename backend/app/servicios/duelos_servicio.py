"""Duelos de ritmo dentro del torneo.

Cada combate pendiente se decide con un duelo: los dos participantes tocan la
misma canción, cada uno cuando puede (o la IA por él), y cuando están los dos
resultados el backend decide el ganador y llama a la regla de siempre,
torneos_servicio.registrar_ganador, que hace avanzar el cuadro.
"""
import random

from app.repositorios import duelos_repo, participantes_repo, torneos_repo
from app.servicios import canciones_servicio, cuadro, ia, partidas_servicio, torneos_servicio
from app.servicios.errores import Conflicto, ErrorDeNegocio, NoEncontrado, SinPermiso


# ---------------------------------------------------------------------
# Reglas puras (se prueban sin base de datos)
# ---------------------------------------------------------------------

# Canciones retiradas y la que suena en su lugar. Los duelos ya creados con
# ellas no se tocan en la base de datos: solo se juegan y se enseñan con la nueva.
# El 01/11/2026 Gatos en el tejado se sustituyó por Duelo de barberos.
RETIRADAS = {"tejado": "barberia"}


def cancion_del_duelo(duelo: dict) -> str:
    """El id de la canción que se toca en un duelo, contando con las retiradas."""
    return RETIRADAS.get(duelo["id_cancion"], duelo["id_cancion"])


def nivel_de_ronda(ronda: int, total_rondas: int) -> str:
    """R4: semifinales y final, difícil; primera ronda, fácil; el resto, media.

    Las semifinales y la final mandan: con 2 o 3 participantes la primera
    ronda ya es la final o la semifinal, y es difícil.
    """
    if ronda >= total_rondas - 1:
        return "dificil"
    if ronda == 1:
        return "facil"
    return "media"


def elegir_cancion(canciones: list[dict], nivel: str, excluir: str | None = None,
                   aleatorio: random.Random | None = None) -> str:
    """Una canción al azar del nivel. Al repetir un duelo se evita la que ya se tocó."""
    del_nivel = [c["id"] for c in canciones if c["nivel"] == nivel]
    if not del_nivel:
        raise ErrorDeNegocio(f"No hay canciones de nivel {nivel}")
    otras = [i for i in del_nivel if i != excluir] or del_nivel
    return (aleatorio or random).choice(otras)


def decidir_ganador(resultados: list[dict]) -> int | None:
    """R5: más puntos; si empatan, más PERFECT; luego menos MISS. None si empatan en todo."""
    a, b = resultados

    def clave(r: dict) -> tuple:
        return (r["puntos"], r["perfect"], -r["miss"])

    if clave(a) == clave(b):
        return None
    return a["id_participante"] if clave(a) > clave(b) else b["id_participante"]


# ---------------------------------------------------------------------
# Casos de uso (los llama el router)
# ---------------------------------------------------------------------


def _combate(id_torneo: int, id_combate: int) -> tuple[dict, dict]:
    torneo = torneos_repo.obtener(id_torneo)
    if torneo is None:
        raise NoEncontrado("Torneo no encontrado")
    combate = torneos_repo.obtener_combate(id_combate)
    if combate is None or combate["id_torneo"] != id_torneo:
        raise NoEncontrado("Combate no encontrado en este torneo")
    if combate["es_bye"]:
        raise ErrorDeNegocio("Un combate con BYE no se juega: el participante pasa directo")
    return torneo, combate


def _total_rondas(torneo: dict) -> int:
    return cuadro.total_rondas(max(torneo["num_participantes"], 2))


def _duelo(torneo: dict, combate: dict) -> dict:
    """El duelo del combate. Si no existe y el combate está pendiente, se crea con su canción."""
    duelo = duelos_repo.obtener(combate["id"])
    if duelo is not None:
        return duelo
    if combate["estado"] == "resuelto":
        raise Conflicto("Este combate se resolvió sin duelo")
    nivel = nivel_de_ronda(combate["ronda"], _total_rondas(torneo))
    duelos_repo.crear(combate["id"], elegir_cancion(canciones_servicio.listar(), nivel))
    # Se vuelve a leer: si otra persona lo creó a la vez, gana la canción que se guardó primero
    return duelos_repo.obtener(combate["id"])


def _vista(torneo: dict, combate: dict, duelo: dict, usuario: dict, mensaje: str | None = None) -> dict:
    """Lo que ve el navegador. La puntuación de cada uno se oculta hasta que el combate termina,
    salvo la del propio usuario."""
    cancion = next(c for c in canciones_servicio.listar() if c["id"] == cancion_del_duelo(duelo))
    resultados = {r["id_participante"]: r for r in duelos_repo.resultados(combate["id"])}
    ids = [combate["id_participante1"], combate["id_participante2"]]
    nombres = {p["id"]: p for p in participantes_repo.listar_por_ids(ids)}
    terminado = combate["estado"] == "resuelto"

    jugadores = []
    for id_p in ids:
        r = resultados.get(id_p)
        visible = r is not None and (terminado or id_p == usuario["id_participante"])
        jugadores.append({
            "participante": {"id": id_p, "nick": nombres[id_p]["nick"], "logo": nombres[id_p]["logo"]},
            "ha_jugado": r is not None,
            "es_ia": bool(r["es_ia"]) if r else False,
            "resultado": {k: r[k] for k in ("puntos", "perfect", "great", "miss", "combo_maximo")} if visible else None,
        })

    return {
        "id_torneo": torneo["id"],
        "id_combate": combate["id"],
        "ronda": combate["ronda"],
        "total_rondas": _total_rondas(torneo),
        "cancion": cancion,
        "estado": combate["estado"],
        "id_ganador": combate["id_ganador"],
        "jugadores": jugadores,
        "puedo_jugar": (not terminado and usuario["id_participante"] in ids
                        and usuario["id_participante"] not in resultados),
        "mensaje": mensaje,
    }


def obtener(id_torneo: int, id_combate: int, usuario: dict) -> dict:
    torneo, combate = _combate(id_torneo, id_combate)
    return _vista(torneo, combate, _duelo(torneo, combate), usuario)


def jugar(id_torneo: int, id_combate: int, usuario: dict, pulsaciones: list[dict]) -> dict:
    """El usuario de la sesión toca la canción por su participante."""
    id_participante = usuario["id_participante"]
    torneo, combate = _combate(id_torneo, id_combate)
    if id_participante not in (combate["id_participante1"], combate["id_participante2"]):
        raise SinPermiso("Solo pueden jugar este duelo los dos participantes del combate")
    return _guardar(torneo, combate, usuario, id_participante, es_ia=False, pulsaciones=pulsaciones)


def jugar_ia(id_torneo: int, id_combate: int, usuario: dict, id_participante: int) -> dict:
    """La IA toca la canción por un participante que todavía no ha jugado."""
    torneo, combate = _combate(id_torneo, id_combate)
    if id_participante not in (combate["id_participante1"], combate["id_participante2"]):
        raise ErrorDeNegocio("Ese participante no está en este combate")
    return _guardar(torneo, combate, usuario, id_participante, es_ia=True)


def _guardar(torneo: dict, combate: dict, usuario: dict, id_participante: int, es_ia: bool,
             pulsaciones: list[dict] | None = None) -> dict:
    if combate["estado"] == "resuelto":
        raise Conflicto("Este combate ya tiene ganador")
    duelo = _duelo(torneo, combate)
    cancion = canciones_servicio.obtener(cancion_del_duelo(duelo))
    if es_ia:
        pulsaciones = ia.pulsaciones(partidas_servicio.notas_en_ms(cancion), cancion["nivel"])
    marcador = partidas_servicio.puntuar(cancion, pulsaciones)
    if not duelos_repo.guardar_resultado(combate["id"], id_participante, marcador, es_ia):
        raise Conflicto("Este participante ya ha jugado el duelo")

    mensaje = _resolver_si_estan_los_dos(torneo, combate, duelo)
    # Se vuelven a leer el combate y el duelo, que pueden haber cambiado
    return _vista(torneo, torneos_repo.obtener_combate(combate["id"]), duelos_repo.obtener(combate["id"]),
                  usuario, mensaje)


def _resolver_si_estan_los_dos(torneo: dict, combate: dict, duelo: dict) -> str | None:
    resultados = duelos_repo.resultados(combate["id"])
    if len(resultados) < 2:
        return None
    ganador = decidir_ganador(resultados)
    if ganador is None:
        cancion = canciones_servicio.obtener(cancion_del_duelo(duelo))
        nueva = elegir_cancion(canciones_servicio.listar(), cancion["nivel"], excluir=cancion["id"])
        duelos_repo.repetir(combate["id"], nueva)
        return "Empate total: el duelo se repite con otra canción"
    try:
        torneos_servicio.registrar_ganador(torneo["id"], combate["id"], ganador)
    except Conflicto:
        pass  # Otra petición lo registró a la vez: el ganador ya está guardado
    return None
