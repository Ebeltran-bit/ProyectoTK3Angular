"""Pruebas del duelo de ritmo dentro del torneo y de la IA.

Los repositorios se sustituyen por unos en memoria (no hace falta MariaDB),
pero torneos_servicio.registrar_ganador es el de verdad: así se prueba que
el cuadro avanza cuando el duelo decide un ganador.
"""
import random
import statistics

import pytest

from app.servicios import canciones_servicio, cuadro, duelos_servicio, ia, partidas_servicio, ritmo
from app.servicios import torneos_servicio
from app.servicios.errores import Conflicto, ErrorDeNegocio, NoEncontrado, SinPermiso

NIVEL_DE = {c["id"]: c["nivel"] for c in canciones_servicio.listar()}


# ---------------------------------------------------------------------
# Repositorios en memoria
# ---------------------------------------------------------------------


class TorneosEnMemoria:
    def __init__(self, ids_participantes, semilla=1):
        self.torneo = {"id": 1, "estado": "cuadro_generado", "num_participantes": len(ids_participantes),
                       "id_campeon": None}
        self.combates = {}
        self._insertar(cuadro.generar_primera_ronda(ids_participantes, random.Random(semilla)))

    def _insertar(self, combates_ronda):
        for c in combates_ronda:
            id_ = len(self.combates) + 1
            self.combates[id_] = {**c, "id": id_, "id_torneo": 1}

    def obtener(self, id_torneo):
        return dict(self.torneo) if id_torneo == 1 else None

    def obtener_combate(self, id_combate):
        c = self.combates.get(id_combate)
        return dict(c) if c else None

    def registrar_ganador(self, id_combate, id_ganador):
        c = self.combates[id_combate]
        if c["estado"] != "pendiente":
            return False
        c.update(id_ganador=id_ganador, estado="resuelto")
        return True

    def combates_de_ronda(self, id_torneo, ronda):
        return sorted((dict(c) for c in self.combates.values() if c["ronda"] == ronda), key=lambda c: c["posicion"])

    def guardar_ronda(self, id_torneo, combates_ronda):
        self._insertar(combates_ronda)
        return True

    def finalizar(self, id_torneo, id_campeon):
        self.torneo.update(estado="finalizado", id_campeon=id_campeon)

    def pendientes(self):
        return [c for c in self.combates.values() if c["estado"] == "pendiente"]


class DuelosEnMemoria:
    def __init__(self):
        self.duelos = {}
        self.res = {}

    def obtener(self, id_combate):
        if id_combate not in self.duelos:
            return None
        return {"id_combate": id_combate, "id_cancion": self.duelos[id_combate]}

    def crear(self, id_combate, id_cancion):
        if id_combate in self.duelos:
            return False
        self.duelos[id_combate] = id_cancion
        return True

    def resultados(self, id_combate):
        return [{"id_participante": p, **r} for p, r in self.res.get(id_combate, {}).items()]

    def guardar_resultado(self, id_combate, id_participante, m, es_ia):
        filas = self.res.setdefault(id_combate, {})
        if id_participante in filas:
            return False
        filas[id_participante] = {k: m[k] for k in ("puntos", "perfect", "great", "miss", "combo_maximo")}
        filas[id_participante]["es_ia"] = es_ia
        return True

    def repetir(self, id_combate, id_cancion):
        self.res[id_combate] = {}
        self.duelos[id_combate] = id_cancion


class ParticipantesEnMemoria:
    """Los ids de bots son participantes sin cuenta de usuario: por ellos juega la IA."""

    def __init__(self, bots=()):
        self.bots = set(bots)

    def listar_por_ids(self, ids):
        return [{"id": i, "nick": f"P{i}", "logo": None, "icono": None, "tiene_usuario": i not in self.bots}
                for i in ids]


@pytest.fixture
def entorno(monkeypatch):
    """Torneo de 5 participantes (con BYE) ya sorteado, y repositorios en memoria."""

    def crear(ids=(1, 2, 3, 4, 5), bots=()):
        torneos = TorneosEnMemoria(list(ids))
        duelos = DuelosEnMemoria()
        monkeypatch.setattr(duelos_servicio, "torneos_repo", torneos)
        monkeypatch.setattr(torneos_servicio, "torneos_repo", torneos)
        monkeypatch.setattr(duelos_servicio, "duelos_repo", duelos)
        monkeypatch.setattr(duelos_servicio, "participantes_repo", ParticipantesEnMemoria(bots))
        # registrar_ganador devuelve el detalle del torneo; aquí no hace falta
        monkeypatch.setattr(torneos_servicio, "obtener_detalle", lambda id_torneo: {})
        # La IA con semilla fija, para que las pruebas den siempre lo mismo
        original, azar = ia.pulsaciones, random.Random(5)
        monkeypatch.setattr(ia, "pulsaciones", lambda notas, nivel: original(notas, nivel, azar))
        return torneos, duelos

    return crear


def usuario(id_participante):
    return {"id": 100 + id_participante, "nombre_usuario": f"u{id_participante}", "id_participante": id_participante}


def pulsaciones_perfectas(id_cancion, desfase=0):
    cancion = canciones_servicio.obtener(id_cancion)
    return [{"ms": n["ms"] + desfase, "tecla": n["tecla"]} for n in partidas_servicio.notas_en_ms(cancion)]


def primer_pendiente(torneos):
    return min(torneos.pendientes(), key=lambda c: (c["ronda"], c["posicion"]))


# ---------------------------------------------------------------------
# R4: nivel según la ronda
# ---------------------------------------------------------------------


@pytest.mark.parametrize("participantes, niveles", [
    (2, ["dificil"]),                                   # solo hay final
    (3, ["dificil", "dificil"]),                        # semifinal y final
    (5, ["facil", "dificil", "dificil"]),
    (8, ["facil", "dificil", "dificil"]),
    (16, ["facil", "media", "dificil", "dificil"]),
    (32, ["facil", "media", "media", "dificil", "dificil"]),
])
def test_nivel_segun_la_ronda(participantes, niveles):
    total = cuadro.total_rondas(participantes)
    assert [duelos_servicio.nivel_de_ronda(r, total) for r in range(1, total + 1)] == niveles


@pytest.mark.parametrize("nivel", ["facil", "media", "dificil"])
def test_cancion_al_azar_del_nivel(nivel):
    canciones = canciones_servicio.listar()
    azar = random.Random(4)
    elegidas = {duelos_servicio.elegir_cancion(canciones, nivel, aleatorio=azar) for _ in range(60)}
    assert {NIVEL_DE[c] for c in elegidas} == {nivel}
    assert len(elegidas) == 3  # salen los tres escenarios del nivel


def test_al_repetir_no_sale_la_misma_cancion():
    canciones = canciones_servicio.listar()
    for _ in range(30):
        assert duelos_servicio.elegir_cancion(canciones, "facil", excluir="puerto") != "puerto"


# ---------------------------------------------------------------------
# R5: quién gana
# ---------------------------------------------------------------------


def res(id_p, puntos, perfect, miss):
    return {"id_participante": id_p, "puntos": puntos, "perfect": perfect, "miss": miss}


def test_gana_quien_tiene_mas_puntos():
    assert duelos_servicio.decidir_ganador([res(1, 900, 3, 0), res(2, 1200, 2, 5)]) == 2


def test_empate_a_puntos_gana_mas_perfect():
    assert duelos_servicio.decidir_ganador([res(1, 900, 3, 1), res(2, 900, 1, 0)]) == 1


def test_empate_a_puntos_y_perfect_gana_menos_miss():
    assert duelos_servicio.decidir_ganador([res(1, 900, 3, 4), res(2, 900, 3, 2)]) == 2


def test_empate_total_no_hay_ganador():
    assert duelos_servicio.decidir_ganador([res(1, 900, 3, 2), res(2, 900, 3, 2)]) is None


# ---------------------------------------------------------------------
# La IA
# ---------------------------------------------------------------------


@pytest.mark.parametrize("nivel", ["facil", "media", "dificil"])
def test_la_ia_respeta_sus_porcentajes(nivel):
    notas = [{"ms": 1000.0 + i * 500, "tecla": "accion"} for i in range(20000)]
    pulsadas = ia.pulsaciones(notas, nivel, random.Random(7))
    ajustes = ritmo.IA[nivel]
    escapadas = 1 - len(pulsadas) / len(notas)
    assert escapadas == pytest.approx(ajustes["prob_fallo"], abs=0.01)
    # Cada pulsación cae cerca de su nota: el error está a menos de media nota
    errores = [(p["ms"] - 1000) % 500 for p in pulsadas]
    errores = [e - 500 if e > 250 else e for e in errores]
    assert statistics.mean(errores) == pytest.approx(0, abs=2)
    assert statistics.pstdev(errores) == pytest.approx(ajustes["error_ms"], rel=0.05)


def test_la_ia_usa_la_tecla_de_cada_nota():
    notas = [{"ms": 1000, "tecla": "accion"}, {"ms": 2000, "tecla": "alterna"}]
    pulsadas = ia.pulsaciones(notas, "facil", random.Random(1))
    assert [p["tecla"] for p in pulsadas] == ["accion", "alterna"]


def test_la_ia_facil_toca_mejor_que_la_dificil():
    notas = partidas_servicio.notas_en_ms(canciones_servicio.obtener("ramen"))
    azar = random.Random(11)

    def media(nivel):
        return statistics.mean(ritmo.evaluar(notas, ia.pulsaciones(notas, nivel, azar))["puntos"] for _ in range(30))

    assert media("facil") > media("media") > media("dificil")


# ---------------------------------------------------------------------
# El duelo dentro del torneo
# ---------------------------------------------------------------------


def test_abrir_el_duelo_elige_una_cancion_de_su_ronda_y_la_guarda(entorno):
    torneos, duelos = entorno()
    combate = primer_pendiente(torneos)
    vista = duelos_servicio.obtener(1, combate["id"], usuario(99))
    assert vista["cancion"]["nivel"] == "facil"  # primera ronda de 5 participantes
    # La segunda vez es la misma canción (los dos tocan la misma)
    assert duelos_servicio.obtener(1, combate["id"], usuario(99))["cancion"]["id"] == vista["cancion"]["id"]
    assert duelos.duelos[combate["id"]] == vista["cancion"]["id"]


def test_un_duelo_con_una_cancion_retirada_se_juega_con_la_nueva(entorno):
    """Los duelos creados con Gatos en el tejado se juegan con la barbería, sin tocar la base de datos."""
    torneos, duelos = entorno()
    combate = primer_pendiente(torneos)
    p1 = combate["id_participante1"]
    duelos.duelos[combate["id"]] = "tejado"
    vista = duelos_servicio.obtener(1, combate["id"], usuario(p1))
    assert vista["cancion"]["id"] == "barberia"
    vista = duelos_servicio.jugar(1, combate["id"], usuario(p1), pulsaciones_perfectas("barberia"))
    assert vista["jugadores"][0]["resultado"]["miss"] == 0
    assert duelos.duelos[combate["id"]] == "tejado"


def test_un_combate_con_bye_no_tiene_duelo(entorno):
    torneos, _ = entorno()
    bye = next(c for c in torneos.combates.values() if c["es_bye"])
    with pytest.raises(ErrorDeNegocio):
        duelos_servicio.obtener(1, bye["id"], usuario(1))


def test_combate_de_otro_torneo(entorno):
    entorno()
    with pytest.raises(NoEncontrado):
        duelos_servicio.obtener(2, 1, usuario(1))
    with pytest.raises(NoEncontrado):
        duelos_servicio.obtener(1, 999, usuario(1))


def test_solo_juega_el_usuario_de_ese_participante(entorno):
    torneos, _ = entorno()
    combate = primer_pendiente(torneos)
    fuera = next(i for i in range(1, 6) if i not in (combate["id_participante1"], combate["id_participante2"]))
    with pytest.raises(SinPermiso):
        duelos_servicio.jugar(1, combate["id"], usuario(fuera), [])
    assert duelos_servicio.obtener(1, combate["id"], usuario(fuera))["puedo_jugar"] is False
    assert duelos_servicio.obtener(1, combate["id"], usuario(combate["id_participante1"]))["puedo_jugar"] is True


def test_nadie_juega_dos_veces_y_la_puntuacion_del_otro_se_oculta(entorno):
    torneos, _ = entorno()
    combate = primer_pendiente(torneos)
    p1, p2 = combate["id_participante1"], combate["id_participante2"]
    cancion = duelos_servicio.obtener(1, combate["id"], usuario(p1))["cancion"]["id"]

    vista = duelos_servicio.jugar(1, combate["id"], usuario(p1), pulsaciones_perfectas(cancion))
    yo, otro = vista["jugadores"]
    assert yo["ha_jugado"] and yo["resultado"]["miss"] == 0 and not yo["es_ia"]
    assert vista["puedo_jugar"] is False
    # El rival todavía no sabe cuánto ha sacado
    vista_rival = duelos_servicio.obtener(1, combate["id"], usuario(p2))
    assert vista_rival["jugadores"][0]["ha_jugado"] and vista_rival["jugadores"][0]["resultado"] is None

    with pytest.raises(Conflicto):
        duelos_servicio.jugar(1, combate["id"], usuario(p1), [])


def test_contra_un_bot_la_ia_juega_sola_al_abrir_el_duelo(entorno):
    """Nadie pregunta por la IA: el participante sin cuenta toca en cuanto se abre el duelo."""
    torneos, _ = entorno()
    combate = primer_pendiente(torneos)
    p1, p2 = combate["id_participante1"], combate["id_participante2"]
    duelos_servicio.participantes_repo.bots.add(p2)  # el rival no tiene cuenta
    vista = duelos_servicio.obtener(1, combate["id"], usuario(p1))
    yo, bot = vista["jugadores"]
    assert bot["ha_jugado"] and bot["es_ia"] and bot["resultado"] is None  # su puntuación, oculta
    assert not yo["ha_jugado"] and vista["puedo_jugar"] and vista["estado"] == "pendiente"

    vista = duelos_servicio.jugar(1, combate["id"], usuario(p1), pulsaciones_perfectas(vista["cancion"]["id"]))
    assert vista["estado"] == "resuelto" and vista["id_ganador"] == p1
    assert vista["jugadores"][1]["resultado"] is not None
    assert torneos.combates[combate["id"]]["estado"] == "resuelto"


def test_entre_dos_personas_la_ia_no_juega_nunca(entorno):
    torneos, duelos = entorno()
    combate = primer_pendiente(torneos)
    vista = duelos_servicio.obtener(1, combate["id"], usuario(99))
    assert not any(j["ha_jugado"] for j in vista["jugadores"])
    assert duelos.resultados(combate["id"]) == []


def test_entre_dos_bots_el_duelo_se_resuelve_al_abrirlo(entorno):
    torneos, _ = entorno(bots=range(1, 6))
    combate = primer_pendiente(torneos)
    vista = duelos_servicio.obtener(1, combate["id"], usuario(99))
    assert vista["estado"] == "resuelto" and vista["id_ganador"] in (combate["id_participante1"],
                                                                     combate["id_participante2"])
    assert all(j["es_ia"] and j["resultado"] for j in vista["jugadores"])


def test_si_empatas_con_un_bot_el_bot_vuelve_a_tocar_la_cancion_nueva(entorno, monkeypatch):
    torneos, _ = entorno()
    combate = primer_pendiente(torneos)
    p1, p2 = combate["id_participante1"], combate["id_participante2"]
    duelos_servicio.participantes_repo.bots.add(p2)  # el rival no tiene cuenta
    # La IA toca perfecta con 10 ms de retraso; la persona, con 10 ms de adelanto: empate total
    monkeypatch.setattr(ia, "pulsaciones", lambda notas, nivel: [{"ms": n["ms"] + 10, "tecla": n["tecla"]}
                                                                for n in notas])
    cancion = duelos_servicio.obtener(1, combate["id"], usuario(p1))["cancion"]["id"]
    vista = duelos_servicio.jugar(1, combate["id"], usuario(p1), pulsaciones_perfectas(cancion, -10))

    assert vista["mensaje"] and vista["estado"] == "pendiente" and vista["cancion"]["id"] != cancion
    yo, bot = vista["jugadores"]
    assert bot["ha_jugado"] and not yo["ha_jugado"] and vista["puedo_jugar"]


def test_empate_total_repite_el_duelo_con_otra_cancion(entorno):
    torneos, duelos = entorno()
    combate = primer_pendiente(torneos)
    p1, p2 = combate["id_participante1"], combate["id_participante2"]
    cancion = duelos_servicio.obtener(1, combate["id"], usuario(p1))["cancion"]["id"]

    duelos_servicio.jugar(1, combate["id"], usuario(p1), pulsaciones_perfectas(cancion, 10))
    vista = duelos_servicio.jugar(1, combate["id"], usuario(p2), pulsaciones_perfectas(cancion, -10))

    assert vista["mensaje"] and vista["estado"] == "pendiente"
    assert vista["cancion"]["id"] != cancion and vista["cancion"]["nivel"] == NIVEL_DE[cancion]
    assert not any(j["ha_jugado"] for j in vista["jugadores"])
    assert duelos.resultados(combate["id"]) == []


def test_un_combate_resuelto_a_mano_no_crea_duelo(entorno):
    torneos, _ = entorno()
    combate = primer_pendiente(torneos)
    torneos_servicio.registrar_ganador(1, combate["id"], combate["id_participante1"])
    with pytest.raises(Conflicto):
        duelos_servicio.obtener(1, combate["id"], usuario(1))


def test_dos_bots_que_empatan_repiten_hasta_que_gana_uno(entorno, monkeypatch):
    torneos, _ = entorno(bots=range(1, 6))
    combate = primer_pendiente(torneos)
    # Las dos primeras pasadas, la IA toca perfecta los dos turnos: empate total y se repite
    llamadas = []
    original = ia.pulsaciones

    def ia_que_empata(notas, nivel):
        llamadas.append(1)
        if len(llamadas) <= 4:
            return [{"ms": n["ms"], "tecla": n["tecla"]} for n in notas]
        return original(notas, nivel)

    monkeypatch.setattr(ia, "pulsaciones", ia_que_empata)
    vista = duelos_servicio.obtener(1, combate["id"], usuario(99))
    assert vista["estado"] == "resuelto" and len(llamadas) == 6


def test_si_otra_peticion_ya_jugo_por_el_bot_se_ensena_lo_guardado(entorno, monkeypatch):
    torneos, duelos = entorno(bots=range(1, 6))
    combate = primer_pendiente(torneos)
    duelos_servicio.obtener(1, combate["id"], usuario(99))  # resuelto por los dos bots
    # Simula la carrera: el combate se leyó pendiente, pero el resultado ya estaba guardado
    torneos.combates[combate["id"]].update(estado="pendiente", id_ganador=None)
    monkeypatch.setattr(duelos, "guardar_resultado", lambda *a: False)
    duelos.res[combate["id"]].popitem()
    vista = duelos_servicio.obtener(1, combate["id"], usuario(99))
    assert vista["estado"] == "pendiente" and sum(j["ha_jugado"] for j in vista["jugadores"]) == 1


def test_si_la_persona_ya_jugo_el_bot_toca_al_abrir_y_se_resuelve(entorno):
    """Duelos de antes del cambio: la persona jugó y nadie pulsó la IA por el bot."""
    torneos, _ = entorno()
    combate = primer_pendiente(torneos)
    p1, p2 = combate["id_participante1"], combate["id_participante2"]
    cancion = duelos_servicio.obtener(1, combate["id"], usuario(p1))["cancion"]["id"]
    duelos_servicio.jugar(1, combate["id"], usuario(p1), pulsaciones_perfectas(cancion))
    duelos_servicio.participantes_repo.bots.add(p2)
    vista = duelos_servicio.obtener(1, combate["id"], usuario(p1))
    assert vista["estado"] == "resuelto" and vista["id_ganador"] == p1


def test_abrir_dos_veces_contra_un_bot_no_lo_hace_jugar_otra_vez(entorno):
    torneos, duelos = entorno()
    combate = primer_pendiente(torneos)
    duelos_servicio.participantes_repo.bots.add(combate["id_participante2"])
    duelos_servicio.obtener(1, combate["id"], usuario(99))
    duelos_servicio.obtener(1, combate["id"], usuario(99))
    assert len(duelos.resultados(combate["id"])) == 1


def test_un_combate_resuelto_a_mano_no_hace_jugar_al_bot(entorno):
    torneos, duelos = entorno()
    combate = primer_pendiente(torneos)
    duelos_servicio.obtener(1, combate["id"], usuario(99))  # crea el duelo, entre personas
    torneos_servicio.registrar_ganador(1, combate["id"], combate["id_participante1"])
    duelos_servicio.participantes_repo.bots.add(combate["id_participante2"])
    vista = duelos_servicio.obtener(1, combate["id"], usuario(99))
    assert vista["estado"] == "resuelto" and duelos.resultados(combate["id"]) == []


def test_empate_entre_personas_no_hace_jugar_a_la_ia(entorno):
    torneos, duelos = entorno()
    combate = primer_pendiente(torneos)
    p1, p2 = combate["id_participante1"], combate["id_participante2"]
    cancion = duelos_servicio.obtener(1, combate["id"], usuario(p1))["cancion"]["id"]
    duelos_servicio.jugar(1, combate["id"], usuario(p1), pulsaciones_perfectas(cancion, 10))
    vista = duelos_servicio.jugar(1, combate["id"], usuario(p2), pulsaciones_perfectas(cancion, -10))
    assert vista["mensaje"] and duelos.resultados(combate["id"]) == []


@pytest.mark.parametrize("participantes", [2, 3, 5, 6, 7, 8])
def test_torneo_entero_a_base_de_duelos_hasta_el_campeon(entorno, participantes):
    """La persona 1 toca perfecta; el resto son bots. El cuadro avanza solo hasta el campeón."""
    torneos, duelos = entorno(range(1, participantes + 1), bots=range(2, participantes + 1))
    total = cuadro.total_rondas(participantes)
    while torneos.pendientes():
        combate = primer_pendiente(torneos)
        vista = duelos_servicio.obtener(1, combate["id"], usuario(1))
        assert vista["cancion"]["nivel"] == duelos_servicio.nivel_de_ronda(combate["ronda"], total)
        if vista["puedo_jugar"]:
            duelos_servicio.jugar(1, combate["id"], usuario(1), pulsaciones_perfectas(vista["cancion"]["id"]))
            assert torneos.combates[combate["id"]]["id_ganador"] == 1

    assert torneos.torneo["estado"] == "finalizado"
    final = max(torneos.combates.values(), key=lambda c: c["ronda"])
    assert torneos.torneo["id_campeon"] == final["id_ganador"] == 1
    assert final["ronda"] == total
