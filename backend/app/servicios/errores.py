"""Errores de las reglas del torneo.

Los servicios lanzan estas excepciones y main.py las convierte en una
respuesta HTTP con el código y el mensaje adecuados.
"""


class ErrorDeNegocio(Exception):
    """Una operación no cumple las reglas (por ejemplo, inscribir a un inactivo)."""

    codigo_http = 400

    def __init__(self, mensaje: str):
        super().__init__(mensaje)
        self.mensaje = mensaje


class NoEncontrado(ErrorDeNegocio):
    codigo_http = 404


class Conflicto(ErrorDeNegocio):
    """La operación no se permite en el estado actual (por ejemplo, editar un torneo ya sorteado)."""

    codigo_http = 409


class NoAutenticado(ErrorDeNegocio):
    """Falta la sesión, ha caducado o los datos de acceso no son correctos."""

    codigo_http = 401
