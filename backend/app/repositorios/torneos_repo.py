"""Acceso a las tablas tk3_torneos, tk3_inscripciones y tk3_combates con SQL directo.

Aquí solo hay consultas. Las reglas (quién se puede inscribir, cuándo se
puede sortear...) están en app/servicios/torneos_servicio.py.
"""
import pymysql

from app.database import obtener_conexion

# Torneo + número de inscritos + datos del campeón (si lo hay)
SELECT_TORNEO = """
    SELECT t.id, t.nombre, t.estado, t.creado_en,
           COUNT(i.id_participante) AS num_participantes,
           c.id AS campeon_id, c.nick AS campeon_nick, c.logo AS campeon_logo
    FROM tk3_torneos t
    LEFT JOIN tk3_inscripciones i ON i.id_torneo = t.id
    LEFT JOIN tk3_participantes c ON c.id = t.id_campeon
"""
GROUP_TORNEO = " GROUP BY t.id, t.nombre, t.estado, t.creado_en, c.id, c.nick, c.logo"


def listar() -> list[dict]:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(SELECT_TORNEO + GROUP_TORNEO + " ORDER BY t.creado_en DESC, t.id DESC")
        return cursor.fetchall()


def obtener(id_torneo: int) -> dict | None:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(SELECT_TORNEO + " WHERE t.id = %s" + GROUP_TORNEO, (id_torneo,))
        return cursor.fetchone()


def ids_inscritos(id_torneo: int) -> list[int]:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            "SELECT id_participante FROM tk3_inscripciones WHERE id_torneo = %s",
            (id_torneo,),
        )
        return [fila["id_participante"] for fila in cursor.fetchall()]


def participantes_inscritos(id_torneo: int) -> list[dict]:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            """
            SELECT p.id, p.nick, p.logo, p.activo, p.creado_en
            FROM tk3_inscripciones i
            JOIN tk3_participantes p ON p.id = i.id_participante
            WHERE i.id_torneo = %s
            ORDER BY p.nick
            """,
            (id_torneo,),
        )
        filas = cursor.fetchall()
    for fila in filas:
        fila["activo"] = bool(fila["activo"])
    return filas


def combates(id_torneo: int) -> list[dict]:
    """Combates del torneo con el nick y el logo de cada participante."""
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            """
            SELECT cb.id, cb.ronda, cb.posicion, cb.id_ganador, cb.es_bye, cb.estado,
                   p1.id AS p1_id, p1.nick AS p1_nick, p1.logo AS p1_logo,
                   p2.id AS p2_id, p2.nick AS p2_nick, p2.logo AS p2_logo
            FROM tk3_combates cb
            JOIN tk3_participantes p1 ON p1.id = cb.id_participante1
            LEFT JOIN tk3_participantes p2 ON p2.id = cb.id_participante2
            WHERE cb.id_torneo = %s
            ORDER BY cb.ronda, cb.posicion
            """,
            (id_torneo,),
        )
        return cursor.fetchall()


def crear(nombre: str, ids_participantes: list[int]) -> int:
    """Crea el torneo y sus inscripciones en una sola transacción."""
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute("INSERT INTO tk3_torneos (nombre) VALUES (%s)", (nombre,))
        id_torneo = cursor.lastrowid
        cursor.executemany(
            "INSERT INTO tk3_inscripciones (id_torneo, id_participante) VALUES (%s, %s)",
            [(id_torneo, id_p) for id_p in ids_participantes],
        )
        return id_torneo


def editar(id_torneo: int, nombre: str, ids_participantes: list[int]) -> None:
    """Cambia el nombre y sustituye las inscripciones (solo se usa en preparación)."""
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute("UPDATE tk3_torneos SET nombre = %s WHERE id = %s", (nombre, id_torneo))
        cursor.execute("DELETE FROM tk3_inscripciones WHERE id_torneo = %s", (id_torneo,))
        cursor.executemany(
            "INSERT INTO tk3_inscripciones (id_torneo, id_participante) VALUES (%s, %s)",
            [(id_torneo, id_p) for id_p in ids_participantes],
        )


def _insertar_combates(cursor, id_torneo: int, combates_ronda: list[dict]) -> None:
    cursor.executemany(
        """
        INSERT INTO tk3_combates
            (id_torneo, ronda, posicion, id_participante1, id_participante2, id_ganador, es_bye, estado)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        [
            (id_torneo, c["ronda"], c["posicion"], c["id_participante1"], c["id_participante2"],
             c["id_ganador"], c["es_bye"], c["estado"])
            for c in combates_ronda
        ],
    )


def guardar_cuadro(id_torneo: int, combates_ronda: list[dict]) -> bool:
    """Guarda los combates y pasa el torneo a 'cuadro_generado', todo junto.

    Devuelve False si el torneo ya no estaba en preparación (por ejemplo,
    si se pulsó dos veces "Generar cuadro"); en ese caso no guarda nada.
    """
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            "UPDATE tk3_torneos SET estado = 'cuadro_generado' WHERE id = %s AND estado = 'preparacion'",
            (id_torneo,),
        )
        if cursor.rowcount != 1:
            return False
        _insertar_combates(cursor, id_torneo, combates_ronda)
        return True


# ---------------------------------------------------------------------
# Fase 3: resultados y avance de rondas
# ---------------------------------------------------------------------


def obtener_combate(id_combate: int) -> dict | None:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, id_torneo, ronda, posicion, id_participante1, id_participante2,
                   id_ganador, es_bye, estado
            FROM tk3_combates WHERE id = %s
            """,
            (id_combate,),
        )
        return cursor.fetchone()


def registrar_ganador(id_combate: int, id_ganador: int) -> bool:
    """Guarda el ganador. Devuelve False si el combate ya estaba resuelto."""
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            """
            UPDATE tk3_combates SET id_ganador = %s, estado = 'resuelto'
            WHERE id = %s AND estado = 'pendiente'
            """,
            (id_ganador, id_combate),
        )
        return cursor.rowcount == 1


def combates_de_ronda(id_torneo: int, ronda: int) -> list[dict]:
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, ronda, posicion, id_ganador, estado
            FROM tk3_combates WHERE id_torneo = %s AND ronda = %s
            ORDER BY posicion
            """,
            (id_torneo, ronda),
        )
        return cursor.fetchall()


def guardar_ronda(id_torneo: int, combates_ronda: list[dict]) -> bool:
    """Inserta una ronda nueva. Devuelve False si esa ronda ya existía.

    La restricción UNIQUE (id_torneo, ronda, posicion) impide que se
    dupliquen rondas aunque lleguen dos peticiones a la vez.
    """
    try:
        with obtener_conexion() as conexion, conexion.cursor() as cursor:
            _insertar_combates(cursor, id_torneo, combates_ronda)
        return True
    except pymysql.err.IntegrityError:
        return False


def finalizar(id_torneo: int, id_campeon: int) -> None:
    """Guarda el campeón y cierra el torneo."""
    with obtener_conexion() as conexion, conexion.cursor() as cursor:
        cursor.execute(
            """
            UPDATE tk3_torneos SET estado = 'finalizado', id_campeon = %s
            WHERE id = %s AND estado = 'cuadro_generado'
            """,
            (id_campeon, id_torneo),
        )
