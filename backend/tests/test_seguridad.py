"""Pruebas del cifrado de contraseñas y de los tokens."""
from app.servicios.seguridad import cifrar_contrasena, generar_token, hash_token, verificar_contrasena


def test_la_contrasena_no_se_guarda_en_claro():
    guardado = cifrar_contrasena("secreta123")
    assert "secreta123" not in guardado
    assert guardado.startswith("scrypt$")


def test_verificar_contrasena():
    guardado = cifrar_contrasena("secreta123")
    assert verificar_contrasena("secreta123", guardado)
    assert not verificar_contrasena("Secreta123", guardado)
    assert not verificar_contrasena("", guardado)


def test_cada_hash_usa_una_sal_distinta():
    assert cifrar_contrasena("igual1234") != cifrar_contrasena("igual1234")


def test_valor_guardado_corrupto():
    assert not verificar_contrasena("lo-que-sea", "texto-sin-formato")
    assert not verificar_contrasena("lo-que-sea", "md5$1$2$3$aa$bb")


def test_tokens():
    a, b = generar_token(), generar_token()
    assert a != b and len(a) >= 40
    assert hash_token(a) == hash_token(a)
    assert len(hash_token(a)) == 64 and hash_token(a) != a
