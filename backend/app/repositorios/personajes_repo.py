"""Acceso a la tabla tk3_personajes con SQL directo."""
from app.database import obtener_conexion

CAMPOS = ("piel", "pelo", "ropa", "pantalon", "peinado", "accesorio")


def obtener(id_participante: int) -> dict | None:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            f"SELECT {', '.join(CAMPOS)} FROM tk3_personajes WHERE id_participante = %s",
            (id_participante,),
        )
        return cursor.fetchone()


def guardar(id_participante: int, apariencia: dict) -> None:
    """Crea el personaje o lo actualiza si ya existía."""
    valores = [apariencia[c] for c in CAMPOS]
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            f"""
            INSERT INTO tk3_personajes (id_participante, {', '.join(CAMPOS)})
            VALUES (%s, {', '.join(['%s'] * len(CAMPOS))})
            ON DUPLICATE KEY UPDATE {', '.join(f'{c} = VALUES({c})' for c in CAMPOS)}
            """,
            (id_participante, *valores),
        )
