# CLAUDE.md — Instrucciones de Claude para TK3 Tournament Manager

## 1. Propósito

Este archivo define cómo debes trabajar en este proyecto.

TK3 Tournament Manager es una aplicación web para gestionar torneos de
eliminación directa (KO). Es el proyecto de la optativa de 2.º DAM, curso
2026–2027, y lo desarrolla Eva.

Tu objetivo es ayudar a desarrollar una aplicación estable, mantenible,
segura, bien probada y fácil de ampliar, **que Eva comprenda y pueda
explicar**. El enunciado evalúa que la autora entienda el recorrido de la
información y justifique sus decisiones, así que el código tiene que ser
legible y estar explicado.

No debes limitarte a generar código. Debes comprender el proyecto,
analizar el impacto de los cambios, planificar la implementación,
verificar los resultados y explicar las decisiones técnicas.

## 2. Fuentes de verdad

Por orden de prioridad:

1. Lo que Eva pida en la conversación.
2. El enunciado: `TK3_Tournament_Manager_Curso_2026_2027.docx.pdf`, en la
   raíz de la carpeta del proyecto (no se sube al repositorio).
3. Este archivo.
4. El `README.md`, que documenta la estructura, el arranque, la API y las
   decisiones tomadas.

No inventes requisitos que no estén en el enunciado. Si una funcionalidad
no aparece en él, propónla como ampliación y espera la aprobación de Eva.

## 3. Contexto del proyecto

### Tecnologías (aprobadas por Eva)

| Parte | Tecnología | Notas |
| --- | --- | --- |
| Frontend | Angular 21, componentes standalone, signals | Carpeta `frontend/` |
| Backend | Python 3.10+ con FastAPI | Carpeta `backend/` |
| Acceso a datos | SQL directo con PyMySQL, **sin ORM** | Consultas siempre parametrizadas (`%s`) |
| Base de datos | MariaDB, gestionada con MySQL Workbench | Scripts en `database/` |
| Pruebas backend | pytest | `backend/tests/` |
| Pruebas del juego | Vitest (aprobado para el juego) | `frontend/src/app/juego/**/*.spec.ts` |
| Seguridad | `hashlib.scrypt` y `secrets` de Python estándar | Sin librerías externas de cifrado |

No añadas dependencias nuevas (librerías de UI, ORM, frameworks de
estado…) sin consultarlo antes con Eva.

### Base de datos

- Todo vive en la base de datos `` `2DAM_alumno03` ``. Como empieza por un
  número, va siempre entre comillas invertidas.
- **Todas las tablas llevan el prefijo `tk3_`** (por ejemplo,
  `tk3_participantes`). No crees tablas fuera de esta base de datos ni sin
  el prefijo.
- `database/01_esquema.sql` tiene que poder ejecutarse varias veces sin
  errores (`CREATE TABLE IF NOT EXISTS`). Cuando cambie el esquema, avisa a
  Eva de que tiene que volver a ejecutarlo en Workbench.
- No borres datos ni tablas sin autorización explícita.

### Arquitectura

Angular → HTTP/JSON → API FastAPI → MariaDB. El frontend nunca accede a la
base de datos y **las reglas del torneo viven en el backend**.

| Capa | Carpeta | Responsabilidad | No debe |
| --- | --- | --- | --- |
| Pantallas | `frontend/src/app/pages/` | Mostrar datos y recoger lo que escribe el usuario | Llamar a la API directamente |
| Componentes | `frontend/src/app/components/` | Piezas visuales reutilizables (el cuadro) | Llamar a la API |
| Servicios Angular | `frontend/src/app/services/` | Peticiones HTTP a la API | Contener reglas del torneo |
| Modelos | `frontend/src/app/models/`, `backend/app/modelos.py` | Forma de los datos | — |
| Routers | `backend/app/routers/` | Traducir HTTP: recibir, responder, códigos de estado | Escribir SQL o decidir reglas |
| Servicios Python | `backend/app/servicios/` | Reglas del torneo, validaciones, estados, sorteo | Saber de HTTP o de SQL |
| Repositorios | `backend/app/repositorios/` | Ejecutar SQL | Saber de HTTP o de reglas |

Los errores de reglas se lanzan como `ErrorDeNegocio`, `NoEncontrado`,
`Conflicto` o `NoAutenticado` (`backend/app/servicios/errores.py`), y `main.py`
los convierte en respuestas HTTP.

### Sesión

- Toda la API exige sesión salvo registro, login y `/api/salud`. Se protege
  en `main.py` con la dependencia `usuario_actual` (`app/dependencias.py`).
- En Angular, `guards/auth.guard.ts` bloquea las pantallas sin sesión e
  `interceptors/auth.interceptor.ts` añade el token y lleva al login si la API
  responde 401.
- **Nunca** guardes, devuelvas ni registres en logs una contraseña o un token
  en claro. En la base de datos solo van el hash scrypt de la contraseña y el
  SHA-256 del token.

### Convenciones

- Nombres de código, comentarios, mensajes y documentación **en español**.
- Comentarios breves que expliquen el *porqué*, al nivel de los existentes.
- Frontend: formato de Prettier del proyecto (`frontend/.prettierrc`).
- Los estilos son provisionales. **El diseño visual lo decide Eva**: no lo
  cambies por iniciativa propia.
- Desactivar un participante no es borrarlo: no hay endpoints de borrado
  de participantes.

### Fases y fechas del enunciado

| Fase | Periodo | Estado |
| --- | --- | --- |
| 1. Base y participantes | 23–30 oct | Hecha |
| 2. Torneos y cuadro KO | 2–13 nov | Hecha |
| 3. Combates, rondas y campeón | 16–20 nov | Hecha |
| 4. Informes y entrega | 23 nov–2 dic | Pendiente |
| Ampliación: duelo de ritmo | — | Etapa 1 (sesión) y limpieza hechas; etapas 3 a 6 pendientes |

El duelo de ritmo es una ampliación aprobada por Eva (31/10/2026) que sustituye
al modo combate anterior: dos participantes siguen la misma canción y gana
quien la toca con más precisión. Sus decisiones y propuestas pendientes están
en el README y en el documento *TK3 · Duelo de ritmo: propuesta técnica*.
La fase 4 sigue siendo obligatoria para la entrega.

Entrega final: vídeo de 5 minutos o más el **miércoles 2 de diciembre de
2026**. Del 30/11 al 02/12 solo se corrigen errores; no se añaden
funcionalidades nuevas. Prioridad del enunciado: una aplicación completa y
comprendida antes que ampliaciones.

Mantén actualizada esta tabla cuando termine una fase.

### Duelo de ritmo

- Se mantienen intactas las fases 1 a 3 y la sesión (etapa 1). El editor
  de personajes y la lucha se retiran: no añadas nada sobre ellos.
- Inspirado en el género de *Rhythm Heaven*, pero **todo es original**:
  minijuegos, personajes, música y nombres. No copies ni recrees nada de
  ese juego ni de ningún otro.
- Juicio de cada pulsación con `AudioContext.currentTime`: PERFECT (±40 ms),
  GREAT (±90 ms) o MISS. Barra de Hype del público y contador de combo.
- Niveles fácil, media y difícil según la ronda del torneo; las semifinales
  y la final son difíciles.
- Estilo plano (Flat Art / vectorial 2D): contorno negro y colores planos.
- Tres escenarios por nivel (lista en el README). El backend elige uno al
  azar para cada combate y lo guarda, así los dos jugadores tocan el mismo.
- La puntuación que cuenta para el torneo la calcula el backend a partir de
  las pulsaciones: el navegador nunca decide quién gana.
- Un jugador por ordenador y sin partidas en directo: cada participante toca
  la canción cuando puede y el backend compara. Si no hay una persona, juega
  la IA. Teclas J y K. Música generada por código (R1–R8 en el README).
- Los números del juego (ventanas, puntos, Hype) van juntos en un archivo
  de reglas, y la lógica en funciones puras probadas con Vitest.

## 4. Análisis previo obligatorio

No modifiques archivos antes de completar el análisis de la tarea.

Primero explica:

1. Qué has entendido de la petición.
2. Cómo funciona actualmente la parte afectada.
3. Qué archivos y módulos están implicados.
4. Qué dependencias y posibles regresiones has identificado.
5. Qué decisiones importantes siguen pendientes.
6. Qué estrategia y pruebas propones.

Si una decisión importante no está resuelta, pregunta y espera la respuesta
antes de implementar la parte afectada.

Durante esta fase puedes inspeccionar archivos y ejecutar comprobaciones de
solo lectura.

## 5. Planificación y ejecución

Para tareas complejas, define fases, pasos y criterios de aceptación.

Trabaja de forma incremental: cada funcionalidad atraviesa las tres capas
(tabla → repositorio → servicio → router → servicio Angular → pantalla) y
se prueba antes de pasar a la siguiente.

Puedes resolver por tu cuenta detalles técnicos de bajo impacto que
respeten la arquitectura y los requisitos aprobados.

**Decisiones importantes que siempre se consultan con Eva:** tecnologías y
dependencias, esquema de base de datos, endpoints nuevos o cambios en los
existentes, reglas del torneo que el enunciado no fije, navegación y
diseño visual.

Si aparecen nuevos requisitos o riesgos que cambien el plan, detente y
explica la situación antes de continuar.

## 6. Arquitectura y calidad

Diseña soluciones que permitan ampliar funcionalidades sin modificar
innecesariamente toda la aplicación.

Respeta las responsabilidades de cada capa (sección 3), evita dependencias
circulares y reduce el acoplamiento.

Aplica SOLID, DRY, KISS y YAGNI cuando corresponda. En este proyecto pesa
especialmente KISS: Eva tiene que poder explicar cada parte en el vídeo.

No introduzcas abstracciones, patrones o dependencias sin una
justificación técnica concreta.

## 7. Pruebas y validación

Las pruebas forman parte de la implementación. Antes de terminar, ejecuta
lo que corresponda al cambio:

| Comprobación | Comando |
| --- | --- |
| Tests del backend | `cd backend && python -m pytest` |
| Tests del juego | `cd frontend && npm test` |
| Compilación del frontend | `cd frontend && npx ng build` |
| API arrancada | `uvicorn app.main:app --reload` y probar en `http://localhost:8000/docs` |
| Recorrido completo | Backend + `npx ng serve` + MariaDB, probando en el navegador |

- Añade o actualiza tests de pytest cuando cambien las reglas del torneo
  (sorteo, avance de rondas, validaciones).
- Prueba siempre los casos con BYE (3, 5, 6 y 7 participantes) y los
  límites (2 participantes).
- Comprueba la persistencia: los datos siguen tras reiniciar la API y
  recargar el navegador.

No afirmes que una prueba ha pasado si no has comprobado su resultado. Si
no puedes ejecutar una comprobación, explica el motivo y qué queda
pendiente.

## 8. Documentación y decisiones

Mantén el `README.md` sincronizado con el código: estructura, arranque,
API, decisiones y estado por fases.

En el README, distingue las decisiones aprobadas por Eva de las propuestas
y de los detalles de implementación decididos por ti.

## 9. Git, seguridad y permisos

- **Los commits y los push los haces tú**, en la rama `main` del
  repositorio `Ebeltran-bit/ProyectoTK3Angular`, con mensajes en español que
  digan qué cambia y por qué.
- Después de cada push, **actualiza también la carpeta local de Eva**
  (`E:\2_DAM\ASIGNATURAS\OPTATIVA\ProyectoTK3Angular`) para que no tenga que
  ejecutar comandos de git. Solo actualizaciones que no pisen nada
  (`--ff-only`); nunca `reset --hard` ni forzar.
- Antes de sincronizar, comprueba que Eva no tiene cambios locales sin
  subir. Si los tiene, para y pregúntale.
- No subas secretos: `backend/.env` está en `.gitignore` y así debe seguir.
- No reescribas el historial (`push --force`, `rebase` de lo ya subido).
- No borres datos de la base de datos ni ejecutes operaciones destructivas
  sin autorización explícita.

## 10. Entrega obligatoria

Al terminar una tarea, presenta un resumen claro, en español, con:

- Qué se ha implementado y por qué.
- Qué archivos se han creado o modificado.
- Qué decisiones técnicas se han tomado y sus consecuencias.
- Qué pruebas se han ejecutado y sus resultados reales.
- La documentación actualizada.
- Si Eva tiene que hacer algo (por ejemplo, volver a ejecutar el script SQL).
- Los riesgos, errores o tareas pendientes.

No declares la tarea terminada si quedan requisitos esenciales o
comprobaciones importantes pendientes sin comunicarlo.

## 11. Principio de trabajo

Analiza antes de modificar.
Pregunta antes de asumir decisiones importantes.
Planifica antes de implementar.
Programa de forma incremental.
Prueba antes de entregar.
Revisa los cambios.
Documenta lo necesario.
Explica las decisiones para que Eva pueda defenderlas.
