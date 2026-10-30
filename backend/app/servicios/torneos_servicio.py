"""Reglas de los torneos.

Aquí se decide qué se puede hacer y cuándo. El router solo traduce HTTP y
el repositorio solo ejecuta SQL.
"""
from app.repositorios import participantes_repo, torneos_repo
from app.servicios import cuadro
from app.servicios.errores import Conflicto, ErrorDeNegocio, NoEncontrado


def _resumen(id_, nick, logo) -> dict | None:
    return None if id_ is None else {"id": id_, "nick": nick, "logo": logo}


def _a_torneo(fila: dict) -> dict:
    return {
        "id": fila["id"],
        "nombre": fila["nombre"],
        "estado": fila["estado"],
        "num_participantes": fila["num_participantes"],
        "campeon": _resumen(fila["campeon_id"], fila["campeon_nick"], fila["campeon_logo"]),
        "creado_en": fila["creado_en"],
    }


def _a_combate(fila: dict) -> dict:
    return {
        "id": fila["id"],
        "ronda": fila["ronda"],
        "posicion": fila["posicion"],
        "participante1": _resumen(fila["p1_id"], fila["p1_nick"], fila["p1_logo"]),
        "participante2": _resumen(fila["p2_id"], fila["p2_nick"], fila["p2_logo"]),
        "id_ganador": fila["id_ganador"],
        "es_bye": bool(fila["es_bye"]),
        "estado": fila["estado"],
    }


def _validar_inscritos(ids: list[int], ya_inscritos: list[int] | None = None) -> None:
    """Comprueba que hay al menos 2, sin repetir, que existen y que están activos.

    ya_inscritos: al editar, los que ya estaban pueden seguir aunque se hayan
    desactivado después; los nuevos tienen que estar activos.
    """
    if len(ids) < 2:
        raise ErrorDeNegocio("Un torneo necesita al menos 2 participantes")
    if len(set(ids)) != len(ids):
        raise ErrorDeNegocio("Hay participantes repetidos")

    encontrados = {p["id"]: p for p in participantes_repo.listar_por_ids(ids)}
    faltan = [i for i in ids if i not in encontrados]
    if faltan:
        raise ErrorDeNegocio(f"No existen los participantes con id {faltan}")

    permitidos = set(ya_inscritos or [])
    inactivos = [p["nick"] for i, p in encontrados.items() if not p["activo"] and i not in permitidos]
    if inactivos:
        raise ErrorDeNegocio(f"Solo se pueden inscribir participantes activos: {', '.join(inactivos)}")


def _obtener_o_404(id_torneo: int) -> dict:
    fila = torneos_repo.obtener(id_torneo)
    if fila is None:
        raise NoEncontrado("Torneo no encontrado")
    return fila


def listar() -> list[dict]:
    return [_a_torneo(f) for f in torneos_repo.listar()]


def obtener_detalle(id_torneo: int) -> dict:
    torneo = _a_torneo(_obtener_o_404(id_torneo))
    torneo["participantes"] = torneos_repo.participantes_inscritos(id_torneo)
    torneo["total_rondas"] = cuadro.total_rondas(max(torneo["num_participantes"], 2))
    torneo["combates"] = [_a_combate(f) for f in torneos_repo.combates(id_torneo)]
    return torneo


def crear(nombre: str, ids_participantes: list[int]) -> dict:
    _validar_inscritos(ids_participantes)
    id_torneo = torneos_repo.crear(nombre, ids_participantes)
    return obtener_detalle(id_torneo)


def editar(id_torneo: int, nombre: str, ids_participantes: list[int]) -> dict:
    torneo = _obtener_o_404(id_torneo)
    if torneo["estado"] != "preparacion":
        raise Conflicto("Solo se puede editar un torneo en preparación")
    _validar_inscritos(ids_participantes, ya_inscritos=torneos_repo.ids_inscritos(id_torneo))
    torneos_repo.editar(id_torneo, nombre, ids_participantes)
    return obtener_detalle(id_torneo)


def generar_cuadro(id_torneo: int) -> dict:
    torneo = _obtener_o_404(id_torneo)
    if torneo["estado"] != "preparacion":
        raise Conflicto("El cuadro de este torneo ya está generado")
    ids = torneos_repo.ids_inscritos(id_torneo)
    if len(ids) < 2:
        raise ErrorDeNegocio("Un torneo necesita al menos 2 participantes")

    combates = cuadro.generar_primera_ronda(ids)
    if not torneos_repo.guardar_cuadro(id_torneo, combates):
        raise Conflicto("El cuadro de este torneo ya está generado")
    return obtener_detalle(id_torneo)
