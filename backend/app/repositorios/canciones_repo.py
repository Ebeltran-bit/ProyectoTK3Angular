"""Lectura de las canciones (beatmaps), que son archivos JSON en app/beatmaps/.

No hay SQL: las canciones forman parte del juego, como las imágenes, y no
cambian mientras se usa la aplicación. Aquí solo se leen los archivos.
"""
import json
import re
from pathlib import Path

CARPETA = Path(__file__).resolve().parent.parent / "beatmaps"

# Solo letras minúsculas, números, - y _: así nadie puede pedir "../.env"
ID_VALIDO = re.compile(r"^[a-z0-9_-]+$")


def listar_ids() -> list[str]:
    return sorted(archivo.stem for archivo in CARPETA.glob("*.json"))


def leer(id_cancion: str) -> dict | None:
    if not ID_VALIDO.match(id_cancion):
        return None
    archivo = CARPETA / f"{id_cancion}.json"
    if not archivo.is_file():
        return None
    return json.loads(archivo.read_text(encoding="utf-8"))
