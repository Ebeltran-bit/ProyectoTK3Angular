"""Las conexiones se reutilizan y vuelven siempre limpias (commit o rollback)."""
import pymysql
import pytest

from app import database


class ConexionFalsa:
    def __init__(self):
        self.commits = 0
        self.rollbacks = 0
        self.cerrada = False
        self.pings = 0
        self.rollback_falla = False

    def commit(self):
        self.commits += 1

    def rollback(self):
        if self.rollback_falla:
            raise pymysql.err.InterfaceError(0, "")
        self.rollbacks += 1

    def close(self):
        self.cerrada = True

    def ping(self, reconnect=False):
        self.pings += 1


@pytest.fixture
def abiertas(monkeypatch):
    """Sustituye pymysql.connect y apunta cada conexión que se abre."""
    lista = []

    def conectar(**_):
        lista.append(ConexionFalsa())
        return lista[-1]

    monkeypatch.setattr(database.pymysql, "connect", conectar)
    monkeypatch.setattr(database, "_libres", [])
    return lista


def test_la_segunda_consulta_reutiliza_la_conexion(abiertas):
    with database.obtener_conexion() as a:
        pass
    with database.obtener_conexion() as b:
        pass
    assert a is b
    assert len(abiertas) == 1
    assert a.commits == 2 and not a.cerrada


def test_dos_a_la_vez_usan_dos_conexiones(abiertas):
    with database.obtener_conexion() as a, database.obtener_conexion() as b:
        assert a is not b
    assert len(abiertas) == 2


def test_un_error_hace_rollback_y_la_conexion_se_sigue_usando(abiertas):
    with pytest.raises(ValueError):
        with database.obtener_conexion():
            raise ValueError("fallo de la consulta")
    with database.obtener_conexion() as c:
        pass
    assert len(abiertas) == 1
    assert c.rollbacks == 1 and c.commits == 1


def test_si_el_rollback_falla_la_conexion_se_tira(abiertas):
    with pytest.raises(ValueError):
        with database.obtener_conexion() as rota:
            rota.rollback_falla = True
            raise ValueError("fallo")
    assert rota.cerrada
    with database.obtener_conexion() as nueva:
        pass
    assert nueva is not rota


def test_una_conexion_quieta_mucho_rato_se_comprueba(abiertas, monkeypatch):
    with database.obtener_conexion() as c:
        pass
    ahora = database.time.monotonic()
    monkeypatch.setattr(database.time, "monotonic", lambda: ahora + database.SEGUNDOS_SIN_COMPROBAR + 1)
    with database.obtener_conexion():
        pass
    assert c.pings == 1


def test_no_se_guardan_mas_de_las_maximas(abiertas):
    from contextlib import ExitStack

    with ExitStack() as pila:
        for _ in range(database.MAX_LIBRES + 2):
            pila.enter_context(database.obtener_conexion())
    assert len(database._libres) == database.MAX_LIBRES
    assert sum(c.cerrada for c in abiertas) == 2
