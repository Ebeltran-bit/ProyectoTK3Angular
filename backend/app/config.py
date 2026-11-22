"""Configuración leída del archivo .env (o de variables de entorno)."""
import os

from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
# En Windows, «localhost» prueba antes la dirección IPv6 (::1) y, si MariaDB solo escucha en
# IPv4, cada conexión espera unos segundos antes de reintentar. Como cada consulta abre su
# propia conexión, eso hacía muy lento, por ejemplo, guardar un ganador. Es la misma máquina.
if DB_HOST == "localhost":
    DB_HOST = "127.0.0.1"
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "2DAM_alumno03")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:4200")
