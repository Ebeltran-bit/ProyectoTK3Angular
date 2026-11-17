"""El manejador de errores de MariaDB distingue «no hay conexión» de otros fallos de SQL."""
import json

import pymysql
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.requests import Request

from app.main import SIN_CONEXION, app, error_de_base_de_datos


def _peticion() -> Request:
    return Request({"type": "http", "method": "GET", "path": "/api/torneos/7/combates/26/duelo", "headers": []})


def _responder(error: pymysql.err.Error):
    respuesta = error_de_base_de_datos(_peticion(), error)
    return respuesta.status_code, json.loads(respuesta.body)["detail"]


@pytest.mark.parametrize("codigo", sorted(SIN_CONEXION))
def test_los_fallos_de_conexion_son_503(codigo):
    estado, detalle = _responder(pymysql.err.OperationalError(codigo, "sin conexión"))
    assert estado == 503
    assert detalle == "No se puede conectar con la base de datos"


def test_conexion_rota_a_mitad_y_saludo_sin_codigo_son_503():
    assert _responder(pymysql.err.InterfaceError(0, ""))[0] == 503
    assert _responder(pymysql.err.OperationalError("received unknown auth switch request"))[0] == 503


def test_columna_que_no_existe_no_dice_que_no_hay_conexion():
    estado, detalle = _responder(pymysql.err.OperationalError(1054, "Unknown column 'x' in 'field list'"))
    assert estado == 500
    assert "1054" in detalle
    assert "conectar" not in detalle


def test_espera_de_bloqueo_demasiado_larga_es_500_con_su_codigo():
    estado, detalle = _responder(pymysql.err.OperationalError(1205, "Lock wait timeout exceeded"))
    assert estado == 500
    assert "1205" in detalle


def test_tabla_que_no_existe_tambien_da_su_codigo():
    estado, detalle = _responder(pymysql.err.ProgrammingError(1146, "Table 'tk3_duelos' doesn't exist"))
    assert estado == 500
    assert "1146" in detalle


def test_el_error_real_queda_en_la_terminal(caplog):
    _responder(pymysql.err.OperationalError(1205, "Lock wait timeout exceeded"))
    assert "Lock wait timeout exceeded" in caplog.text
    assert "/api/torneos/7/combates/26/duelo" in caplog.text


def test_el_manejador_esta_registrado_en_la_api():
    # Una copia de la API con una ruta que falla, para no tocar la de verdad
    prueba = FastAPI()
    prueba.exception_handlers.update(app.exception_handlers)

    @prueba.get("/falla")
    def falla():
        raise pymysql.err.OperationalError(1054, "Unknown column")

    respuesta = TestClient(prueba).get("/falla")
    assert respuesta.status_code == 500
    assert "1054" in respuesta.json()["detail"]
