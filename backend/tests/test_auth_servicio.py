"""Pruebas de las reglas de registro y sesión.

Se sustituye el repositorio por uno en memoria, así las pruebas no
necesitan MariaDB ni dejan usuarios de prueba en la base de datos.
"""
from datetime import datetime, timedelta

import pytest

from app.servicios import auth_servicio
from app.servicios.errores import Conflicto, ErrorDeNegocio, NoAutenticado


class RepoEnMemoria:
    def __init__(self):
        self.usuarios = {}
        self.nicks = {"Jin"}  # un participante que ya existía sin usuario
        self.sesiones = {}

    def obtener_por_nombre(self, nombre):
        return next((u for u in self.usuarios.values() if u["nombre_usuario"].lower() == nombre.lower()), None)

    def nick_ocupado(self, nick):
        return nick.lower() in {n.lower() for n in self.nicks}

    def crear_con_participante(self, nombre, hash_contrasena):
        id_ = len(self.usuarios) + 1
        self.nicks.add(nombre)
        self.usuarios[id_] = {"id": id_, "nombre_usuario": nombre, "hash_contrasena": hash_contrasena,
                              "id_participante": 100 + id_}
        return id_

    def crear_sesion(self, hash_token, id_usuario, caduca_en):
        self.sesiones[hash_token] = (id_usuario, caduca_en)

    def usuario_de_sesion(self, hash_token):
        sesion = self.sesiones.get(hash_token)
        if sesion is None or sesion[1] <= datetime.now():
            return None
        return self.usuarios[sesion[0]]

    def borrar_sesion(self, hash_token):
        self.sesiones.pop(hash_token, None)

    def borrar_sesiones_caducadas(self):
        pass


@pytest.fixture
def repo(monkeypatch):
    falso = RepoEnMemoria()
    monkeypatch.setattr(auth_servicio, "usuarios_repo", falso)
    return falso


def test_registro_abre_sesion(repo):
    sesion = auth_servicio.registrar("eva_03", "contrasena-larga")
    assert sesion["usuario"]["nombre_usuario"] == "eva_03"
    assert "hash_contrasena" not in sesion["usuario"]
    assert auth_servicio.usuario_actual(sesion["token"])["id"] == sesion["usuario"]["id"]


def test_la_contrasena_se_guarda_cifrada(repo):
    auth_servicio.registrar("eva_03", "contrasena-larga")
    assert repo.usuarios[1]["hash_contrasena"].startswith("scrypt$")


@pytest.mark.parametrize("nombre, contrasena", [("ab", "12345678"), ("con espacio", "12345678"), ("eva", "corta")])
def test_registro_invalido(repo, nombre, contrasena):
    with pytest.raises(ErrorDeNegocio):
        auth_servicio.registrar(nombre, contrasena)


@pytest.mark.parametrize("nombre", ["eva_03", "EVA_03", "Jin"])
def test_nombre_en_uso(repo, nombre):
    auth_servicio.registrar("eva_03", "contrasena-larga")
    with pytest.raises(Conflicto):
        auth_servicio.registrar(nombre, "contrasena-larga")


def test_login(repo):
    auth_servicio.registrar("eva_03", "contrasena-larga")
    assert auth_servicio.iniciar_sesion("eva_03", "contrasena-larga")["token"]


@pytest.mark.parametrize("nombre, contrasena", [("eva_03", "otra-cosa-mal"), ("nadie", "contrasena-larga")])
def test_login_incorrecto_mismo_mensaje(repo, nombre, contrasena):
    auth_servicio.registrar("eva_03", "contrasena-larga")
    with pytest.raises(NoAutenticado, match="Usuario o contraseña incorrectos"):
        auth_servicio.iniciar_sesion(nombre, contrasena)


@pytest.mark.parametrize("token", [None, "", "token-inventado"])
def test_sin_sesion_valida(repo, token):
    with pytest.raises(NoAutenticado):
        auth_servicio.usuario_actual(token)


def test_cerrar_sesion_invalida_el_token(repo):
    token = auth_servicio.registrar("eva_03", "contrasena-larga")["token"]
    auth_servicio.cerrar_sesion(token)
    with pytest.raises(NoAutenticado):
        auth_servicio.usuario_actual(token)


def test_sesion_caducada(repo):
    token = auth_servicio.registrar("eva_03", "contrasena-larga")["token"]
    for clave, (id_usuario, _) in list(repo.sesiones.items()):
        repo.sesiones[clave] = (id_usuario, datetime.now() - timedelta(seconds=1))
    with pytest.raises(NoAutenticado, match="caducado"):
        auth_servicio.usuario_actual(token)
