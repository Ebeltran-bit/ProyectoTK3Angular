"""Cifrado de contraseñas y tokens de sesión.

Solo usa la librería estándar de Python:
- hashlib.scrypt: función de hash pensada para contraseñas (lenta a propósito
  para que probar contraseñas a lo bruto sea muy costoso).
- secrets: genera tokens aleatorios seguros.
"""
import hashlib
import hmac
import secrets

# Parámetros de scrypt: coste (N), tamaño de bloque (r) y paralelismo (p)
SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
LONGITUD_SAL = 16


def cifrar_contrasena(contrasena: str) -> str:
    """Devuelve 'scrypt$n$r$p$sal$hash'. Cada llamada usa una sal aleatoria distinta."""
    sal = secrets.token_bytes(LONGITUD_SAL)
    resumen = hashlib.scrypt(contrasena.encode(), salt=sal, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${sal.hex()}${resumen.hex()}"


def verificar_contrasena(contrasena: str, guardado: str) -> bool:
    """Comprueba una contraseña contra el valor guardado en la base de datos."""
    try:
        algoritmo, n, r, p, sal_hex, resumen_hex = guardado.split("$")
    except ValueError:
        return False
    if algoritmo != "scrypt":
        return False
    calculado = hashlib.scrypt(
        contrasena.encode(), salt=bytes.fromhex(sal_hex), n=int(n), r=int(r), p=int(p)
    )
    # compare_digest tarda lo mismo acierte o falle, para no dar pistas
    return hmac.compare_digest(calculado.hex(), resumen_hex)


def generar_token() -> str:
    """Token aleatorio que se entrega al navegador al iniciar sesión."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Lo que se guarda en tk3_sesiones: el SHA-256 del token, nunca el token."""
    return hashlib.sha256(token.encode()).hexdigest()
