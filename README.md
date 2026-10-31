# TK3 Tournament Manager

Aplicación web para gestionar torneos de eliminación directa (KO).
Proyecto de la optativa, curso 2026–2027: **Angular + Python (FastAPI) + MariaDB**.

```
Angular (frontend)  ──HTTP/JSON──►  API FastAPI (backend)  ──SQL──►  MariaDB
   localhost:4200                      localhost:8000              2DAM_alumno03
```

## Estructura del proyecto

```
tk3/
├── database/                  Scripts SQL (se ejecutan desde MySQL Workbench)
│   ├── 01_esquema.sql         Crea las tablas tk3_ (se puede ejecutar varias veces)
│   ├── 02_datos_prueba.sql    Participantes de ejemplo (opcional)
│   └── 03_retirar_personajes.sql  Solo si tu base de datos tiene la antigua tabla tk3_personajes
│
├── backend/                   API REST en Python
│   ├── requirements.txt       Librerías necesarias
│   ├── .env.example           Plantilla de configuración (copiar como .env)
│   └── app/
│       ├── main.py            Arranque de la API, CORS, errores y qué rutas exigen sesión
│       ├── dependencias.py    Comprobación de sesión que usan los routers
│       ├── config.py          Lee la configuración del .env
│       ├── database.py        Abre y cierra conexiones a MariaDB
│       ├── modelos.py         Forma de los datos que entran y salen (JSON)
│       ├── beatmaps/          Canciones del duelo de ritmo en JSON
│       ├── routers/           Endpoints HTTP (qué URL hace qué)
│       ├── servicios/         Reglas del torneo (sorteo, validaciones, estados, estadísticas)
│       └── repositorios/      Consultas SQL (lo único que toca la base de datos)
│   └── tests/                 Pruebas automáticas (cuadro, sesión, estadísticas)
│
└── frontend/                  Aplicación Angular
    └── src/app/
        ├── api.config.ts      Dirección de la API
        ├── models/            Interfaces TypeScript (forma de los datos)
        ├── services/          Comunicación con la API (HttpClient) y sesión
        ├── guards/            Bloquean pantallas si no hay sesión
        ├── interceptors/      Añaden el token a cada petición
        ├── juego/             Duelo de ritmo: reglas, evaluación, música y escenarios
        ├── components/        Piezas reutilizables (el cuadro KO)
        └── pages/             Pantallas (componentes con vista)
```

Cada capa tiene una sola responsabilidad:

| Parte | Qué hace | Qué NO hace |
| --- | --- | --- |
| `pages/` (Angular) | Muestra datos y recoge lo que escribe el usuario | No llama a la API directamente |
| `services/` (Angular) | Hace las peticiones HTTP a la API | No sabe nada de SQL |
| `routers/` (Python) | Recibe la petición y responde con el código HTTP adecuado | No escribe SQL ni decide reglas |
| `servicios/` (Python) | Aplica las reglas del torneo (quién se inscribe, cuándo se sortea) | No sabe nada de HTTP ni de SQL |
| `repositorios/` (Python) | Ejecuta las consultas SQL | No sabe nada de HTTP |
| MariaDB | Guarda los datos aunque se reinicie todo | — |

## Requisitos en tu portátil

- **MariaDB** (o el servidor que uses con MySQL Workbench) arrancado.
- **Python 3.10 o superior** → `python --version`
- **Node.js 20.19+, 22.12+ o 24+** → `node --version` (Angular 21 lo necesita)

> El enunciado pide MariaDB. MySQL Workbench es solo el cliente: para comprobar a qué servidor te conectas,
> ejecuta `SELECT VERSION();` en Workbench. Si aparece la palabra `MariaDB`, perfecto.
> El código funciona igual con MySQL, pero conviene que el servidor sea MariaDB.

## Cómo arrancarlo (Windows)

### 1. Base de datos (solo la primera vez)

1. Abre MySQL Workbench y conéctate a tu servidor.
2. `File → Open SQL Script…` → `database/01_esquema.sql` → ejecuta con el rayo ⚡.
   Cuando una fase añade tablas nuevas, vuelve a ejecutar este mismo script: solo crea lo que falta.
3. Opcional: lo mismo con `database/02_datos_prueba.sql`.
4. Comprueba que en `2DAM_alumno03` aparecen las tablas `tk3_participantes`, `tk3_torneos`,
   `tk3_inscripciones`, `tk3_combates`, `tk3_usuarios` y `tk3_sesiones`.
5. Solo si te aparece también `tk3_personajes` (de una versión anterior): ejecuta
   `database/03_retirar_personajes.sql` para quitarla. No toca ningún otro dato.

> El nombre `2DAM_alumno03` empieza por un número, así que en SQL siempre va entre comillas invertidas:
> `` USE `2DAM_alumno03`; ``

### 2. Backend (terminal 1)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Abre `backend/.env` y pon tu usuario y contraseña de la base de datos. Después:

```bash
uvicorn app.main:app --reload
```

Comprueba que funciona en <http://localhost:8000/docs>: es una página donde puedes probar
todos los endpoints sin Angular. Casi todos exigen sesión: primero llama a `/api/auth/login` (o
`/api/auth/registro`), copia el `token` y pégalo en el botón **Authorize**... o, más fácil, usa la app.

La próxima vez solo hace falta `cd backend`, `venv\Scripts\activate` y `uvicorn app.main:app --reload`.

### 3. Frontend (terminal 2)

```bash
cd frontend
npm install
npx ng serve
```

Abre <http://localhost:4200>. La primera vez, pulsa **Regístrate** para crear tu cuenta: tu nombre de
usuario será también tu nick en los torneos.

## API disponible

Todas las rutas, salvo `/api/auth/registro`, `/api/auth/login` y `/api/salud`, exigen la cabecera
`Authorization: Bearer <token>`. Sin ella responden **401**.

| Método | URL | Qué hace |
| --- | --- | --- |
| POST | `/api/auth/registro` | Crea el usuario y su participante, y abre sesión (`{"nombre_usuario": "...", "contrasena": "..."}`) |
| POST | `/api/auth/login` | Inicia sesión y devuelve `{"token": "...", "usuario": {...}}` |
| POST | `/api/auth/logout` | Cierra la sesión (el token deja de valer) |
| GET | `/api/auth/yo` | Usuario de la sesión actual |
| GET | `/api/participantes` | Lista todos (`?activo=true` o `?activo=false` para filtrar) |
| GET | `/api/participantes/{id}` | Un participante |
| POST | `/api/participantes` | Crea uno (`{"nick": "...", "logo": "..."}`) → 409 si el nick ya existe |
| PUT | `/api/participantes/{id}` | Edita nick y logo |
| PATCH | `/api/participantes/{id}/estado` | Activa o desactiva (`{"activo": false}`) |

| GET | `/api/torneos` | Lista de torneos con estado, nº de participantes y campeón |
| GET | `/api/torneos/{id}` | Torneo completo: inscritos, nº de rondas y combates |
| POST | `/api/torneos` | Crea un torneo en preparación (`{"nombre": "...", "participantes": [1, 2, 3]}`) |
| PUT | `/api/torneos/{id}` | Cambia nombre y participantes (solo en preparación) |
| POST | `/api/torneos/{id}/cuadro` | Sortea la primera ronda con BYE y cierra las inscripciones |
| POST | `/api/torneos/{id}/combates/{idCombate}/ganador` | Guarda el ganador (`{"id_ganador": 3}`). Si la ronda queda completa, genera la siguiente o cierra el torneo con su campeón |
| GET | `/api/canciones` | Canciones del duelo de ritmo, sin notas: título, nivel, BPM y escenario (etapa 3) |
| GET | `/api/canciones/{id}` | Beatmap completo: notas que hay que pulsar y pistas de la música (etapa 3) |
| POST | `/api/canciones/{id}/partidas` | Guarda una partida de práctica (`{"pulsaciones": [{"ms": 2730, "tecla": "accion"}]}`). El backend calcula y devuelve la puntuación |
| GET | `/api/estadisticas/canciones` | Récords: top 5 de cada canción, con la mejor partida de cada usuario |
| GET | `/api/estadisticas/participantes` | Combates, victorias, derrotas y torneos ganados de cada participante (fase 4). Los BYE no cuentan |

No hay DELETE a propósito: el enunciado dice que desactivar no es borrar.

## Pruebas automáticas

Desde `backend/`, con el entorno virtual activado: `python -m pytest`. Comprueban el sorteo del cuadro
con entre 2 y 32 participantes (nadie repetido, número correcto de BYE, posiciones correctas), el
emparejamiento de las rondas siguientes y torneos completos simulados de 2 a 16 participantes hasta el
campeón (número de rondas correcto, nadie pierde dos veces), el cifrado de contraseñas y las reglas de
registro y sesión, y las estadísticas de la fase 4 (los BYE y los combates pendientes no cuentan, salen
los inactivos y los participantes sin combates), el cálculo de la puntuación del duelo en el backend y los
récords por canción. Las pruebas de sesión, estadísticas y partidas usan un repositorio en memoria: no necesitan MariaDB ni dejan
usuarios de prueba en la base de datos.

Desde `frontend/`: `npm test`. Ejecuta con Vitest los tests de la lógica del duelo de ritmo
(`src/app/juego/*.spec.ts`): juicio PERFECT/GREAT/MISS en los límites de 40 y 90 ms, puntos, combo, Hype
entre 0 y 100, tecla equivocada, pulsaciones sin nota, notas que pasan sin pulsar y una canción de ejemplo.

En pytest también se comprueba que todos los beatmaps de `backend/app/beatmaps/` son válidos y que los mal
hechos (notas desordenadas, durante la cuenta atrás, nivel o tecla que no existen…) se rechazan.

## Decisiones tomadas

Todas las decisiones de esta lista están **aprobadas por Eva** (30/10/2026).
Las de las fases 1 y 2 las propuso Claude y Eva las aprobó en bloque; las de la fase 3 se aprobaron
antes de programarlas.

**Tecnología y datos**
- FastAPI con SQL directo (PyMySQL), sin ORM. Angular 21. Contraseña de la base de datos en `backend/.env`.
- Todas las tablas en `2DAM_alumno03` con prefijo `tk3_`.
- El nick es único (lo garantiza la base de datos con `UNIQUE`).
- El logo es una URL de imagen opcional. Si no hay logo o no carga, se muestra la inicial del nick.
- Un torneo tiene nombre (máximo 60 caracteres) y fecha de creación automática.

**Reglas del torneo**
- Estados del torneo: `preparacion` → `cuadro_generado` → `finalizado`.
- Mientras está en preparación se pueden cambiar nombre y participantes; al generar el cuadro ya no.
  El cuadro no se puede volver a sortear y los torneos no se borran.
- Solo se inscriben participantes activos. Si un inscrito se desactiva después, puede seguir en el torneo.
- El sorteo se hace en el backend (`servicios/cuadro.py`). El tamaño del cuadro es la siguiente potencia
  de 2; los huecos que sobran son BYE y se reparten al azar en la primera ronda.
- Un BYE se guarda como un combate con un solo participante, ya resuelto: ese participante pasa directo.
- Cada combate tiene ronda y posición. El ganador de la posición *i* pasa a la posición *i ÷ 2* de la
  ronda siguiente.

- Fase 3: el avance de ronda es **automático**: al resolverse el último combate de una ronda se genera
  la siguiente. Al resolverse la final, el torneo pasa a `finalizado` con su campeón.
- Fase 3: solo se guarda el ganador (sin marcador). El ganador tiene que ser uno de los dos participantes.
- Fase 3: un resultado guardado **no se puede corregir**; por eso se pide confirmación antes de guardarlo.

**Informes (fase 4, aprobado por Eva el 31/10/2026)**
- Las estadísticas las calcula el backend (`servicios/estadisticas_servicio.py`) a partir de los combates
  guardados, sin tablas nuevas. Endpoint `GET /api/estadisticas/participantes`.
- Solo cuentan los combates resueltos que no son BYE: pasar por BYE no suma victoria ni combate jugado.
- Salen todos los participantes, también los inactivos (marcados como inactivos) y los que no han jugado.
- Se incluye la columna opcional de torneos ganados (veces que es campeón de un torneo finalizado).
- La tabla se ordena por victorias; a igualdad, por menos derrotas y luego por nick (detalle decidido por
  Claude).
- El historial de combates está en la pantalla de cada torneo, debajo del cuadro, agrupado por rondas.
  Usa los combates que ya devuelve `GET /api/torneos/{id}`, así que no necesita endpoint propio.

**Interfaz**
- Pantallas: participantes (lista y formulario), torneos (lista, formulario y detalle con el cuadro y el
  historial), estadísticas (pestañas Participantes y Canciones) y práctica del duelo de ritmo.
- El cuadro se muestra en columnas por ronda (Cuartos, Semifinales, Final…), con huecos "Por decidir".
  Antes de sortear se pide confirmación.
- En un combate pendiente se pulsa el nombre del ganador. Los perdedores aparecen tachados y el campeón
  se muestra arriba del torneo.
- Los estilos son provisionales y mínimos: el diseño visual está por decidir.

## Duelo de ritmo (ampliación)

**Nuevo enfoque, decidido por Eva el 31/10/2026:** el modo combate pasa a ser un duelo de ritmo en estilo plano
(Flat Art / vectorial 2D), inspirado en el género de *Rhythm Heaven* pero con minijuegos, personajes, música y nombres originales. Dos
participantes siguen la misma canción y gana quien la toca con más precisión. Propuesta técnica (música,
beatmaps, SQL y decisiones pendientes):
[TK3 · Duelo de ritmo: propuesta técnica](https://claude.ai/artifact/2ntw6FFsHfhT5s7gqgwBYk).

**Aprobado por Eva**
- Se mantienen intactas las fases 1, 2 y 3 (participantes, torneos, cuadro KO con BYE y avance de rondas)
  y la etapa 1 (registro, login, sesión y contraseñas cifradas), junto con pytest y Vitest.
- Se retira la personalización: cada escenario tiene sus propios personajes fijos, integrados en el fondo
  según su temática.
- Motor de precisión rítmica en el frontend con la Web Audio API (`AudioContext.currentTime`): cada
  pulsación se juzga como PERFECT (±40 ms), GREAT (±90 ms) o MISS.
- La barra de vida se sustituye por una barra de Hype del público y un contador de combo.
- Tres niveles de canción (fácil, media y difícil) según el BPM y la complejidad del ritmo; el nivel de
  cada duelo depende de la ronda del torneo, y las semifinales y la final son difíciles.
- En la etapa 6 las pulsaciones se envían al backend en Python, que valida la puntuación y hace avanzar el
  cuadro.
- Siguen vigentes D1 (usuario ↔ participante), D3 (sesión obligatoria, sin roles), D4 y D5 (token y
  scrypt), D6 (motor propio en TypeScript sin librerías), D7 (todo el arte y el sonido originales y
  generados por código) y D11 (Vitest). D2, D8, D9 y D10 eran de la lucha y quedan sustituidas.

**Aprobado por Eva el 31/10/2026 (R1–R8 del documento)**
- R1. La música se genera por código con la Web Audio API: chiptune original, sin licencias ni archivos
  de audio. El beatmap admite un campo `audio` por si algún día se usa una pista CC0.
- R2. Dos teclas: J (acción principal) y K (alternativa).
- R3. Un jugador por ordenador, y cada uno juega cuando puede: los dos participantes de un combate tocan
  la misma canción en su ordenador y el backend compara las puntuaciones. Si un participante no tiene a
  una persona que juegue, lo hace una IA que imita a una persona. Sin partidas en directo.
- R4. Nivel según la ronda: final y semifinales, difícil; primera ronda, fácil; el resto, media.
- R5. Empate de puntos: gana quien tenga más PERFECT; si siguen igual, menos MISS; si siguen igual, se
  repite el duelo.
- R6. Escenarios con personajes fijos; las temáticas las elige Eva. Cambiado por Eva el 31/10/2026: tres
  escenarios por nivel (ver abajo).
- R7. Endpoints nuevos: `GET /api/canciones` y `GET /api/canciones/{id}` (etapa 3) y
  `POST /api/torneos/{id}/combates/{id}/duelo` (etapa 6).
- R8. Se retiran `tk3_personajes` y el código del editor y de la lucha.

**Escenarios y estilo, aprobados por Eva el 31/10/2026**
- Estilo visual plano (Flat Art / vectorial 2D): formas geométricas limpias, contorno negro bien definido
  y colores planos sin degradados. Bocetos: [Escenarios de ritmo](https://claude.ai/artifact/5zLUNQahn68jCCnhHik6rS).
- Nueve escenarios, tres por nivel:

| Nivel | Escenarios |
| --- | --- |
| Fácil | Puerto de las gaviotas, Brindis arcade, Huerto a compás |
| Media | Ramen a contratiempo, Correos exprés, Paso de patitos |
| Difícil | Estrellas fugaces, Gatos en el tejado (el gato naranja mueve la cola con un ritmo y el jugador lo repite), La mecanógrafa |

- En cada combate, el backend elige al azar un escenario del nivel de su ronda y lo guarda con el combate,
  para que los dos participantes toquen la misma canción aunque jueguen en momentos distintos.

**Etapas**

| Etapa | Contenido | Estado |
| --- | --- | --- |
| 1. Sesión | Registro, login, sesión y contraseñas cifradas | Hecha |
| Limpieza | Retirar el editor de personajes y la lucha (tabla, backend, frontend y tests) | Hecha |
| 3. Motor de ritmo v1 | Escenario con personajes fijos, reproductor rítmico, evaluación de pulsaciones y marcador | Hecha. Escenarios fáciles listos (puerto, bar y huerto); faltan los 3 medios y los 3 difíciles |
| 4. Rival CPU | El jugador 2 sigue la pista con una precisión que depende de la ronda | Pendiente |
| 5. Música, efectos y sonido | Canciones por nivel, sonidos de acierto y fallo, textos "PERFECT!" y "MISS!" | Pendiente |
| 6. Conexión con el torneo | Botón "Jugar" en el cuadro, canción según la ronda, validación en el backend y avance del cuadro | Pendiente |

**Etapa 3 (motor de ritmo v1), hecha el 31/10/2026.** Aprobado por Eva: pantalla *Práctica* en el menú
para practicar sin que cuente en el torneo, endpoints `GET /api/canciones` y `GET /api/canciones/{id}`,
canciones en archivos JSON sin tabla nueva y el estilo del boceto del puerto.

| Pieza | Archivo |
| --- | --- |
| Números del juego (ventanas, puntos, Hype, teclas) | `frontend/src/app/juego/reglas.ts` |
| Juicio y marcador, funciones puras con Vitest | `frontend/src/app/juego/evaluacion.ts` |
| Música generada con Web Audio | `frontend/src/app/juego/musica.ts` |
| Escenarios: dibujo en canvas, instrucciones, sonido de aviso y frase final | `frontend/src/app/juego/escenarios/` (`puerto.ts`, `bar.ts`, `huerto.ts`) |
| Pantalla que junta las piezas | `frontend/src/app/pages/practica/` |
| Canciones | `backend/app/beatmaps/` (`puerto.json`, `bar.json`, `huerto.json`) |
| Lectura y validación de canciones | `canciones_repo.py`, `canciones_servicio.py`, `routers/canciones.py` |

Detalles que decidí yo (Claude) en esta etapa:
- Los campos del beatmap van en `snake_case` (`cuenta_atras`, `repetir_cada`…), como el resto de la API,
  en lugar del `camelCase` del documento de propuesta. Se añaden `fin` (pulso en el que acaba la canción)
  y `aviso_antes` (pulsos entre el aviso y la nota; en el puerto, el graznido).
- Las alturas de la música son números MIDI (60 = do central). El patrón se repite cada `repetir_cada`
  pulsos desde el final de la cuenta atrás.
- Pulsar con la tecla equivocada en una nota la deja como MISS. Pulsar sin ninguna nota a menos de 90 ms
  también es MISS, pero no gasta ninguna nota.
- Si se cambia de pestaña a mitad de canción, la partida se cancela para no contar fallos falsos.
- El id de una canción solo admite minúsculas, números, `-` y `_`, para que nadie pueda pedir otro archivo.
- En la v1 no hay calibración del retardo del audio; si hace falta, se añade en la etapa 5.
- Brindis arcade: la jarra rubia se pulsa con J y las jarras dobles de tostada con K. Huerto a compás: una
  abeja señala la calabaza que toca regar y cada acierto la hace crecer. La música admite también una
  pista de caja de batería (`caja`).

**Récords por canción (aprobado por Eva el 31/10/2026).** Cada partida terminada en *Práctica* se guarda
en la tabla nueva `tk3_partidas`. El navegador solo manda las pulsaciones y el backend calcula la
puntuación con `servicios/ritmo.py`, que repite las reglas de `juego/evaluacion.ts` con los mismos casos de
prueba (`tests/test_ritmo.py`), así nadie puede inventarse un récord y la misma lógica servirá para validar
los duelos en la etapa 6. En *Estadísticas › Canciones* sale el top 5 de cada canción, una marca por
usuario. Empates: más PERFECT, luego menos MISS y luego quien lo consiguió antes. Detalles míos: se
rechazan las partidas con pulsaciones fuera de la canción o con más de tres por nota (más 20), y el
nombre que se muestra es el nombre de usuario.

**Código de la versión anterior.** El editor de personajes (`/api/personaje`, `tk3_personajes`, pantalla
*Mi personaje*) y la lucha contra la CPU (pantalla *Combate*, `juego/`) se retiraron el 31/10/2026 y siguen
en el historial de git (commit `b118da6` y anteriores). Estos eran los detalles que decidí en esas etapas:

**Etapa 1 (se mantiene):** el nombre de usuario admite de 3 a 30 letras, números,
`-` y `_`; la contraseña, al menos 8 caracteres. El login responde "Usuario o contraseña incorrectos" en
ambos casos, para no revelar qué usuarios existen. Los participantes creados antes del login siguen
existiendo, sin usuario.

**Etapa 2 (se retira):** el sprite mide 48 × 56 píxeles y se dibuja por código
(`juego/sprites/`): un esqueleto de puntos por pose y, encima, piel, ropa, pelo y accesorio, con sombras,
brillos y contorno de 1 píxel. Paletas: 6 tonos de piel y 8 de pelo, camiseta y pantalón. Peinados: corto,
pinchos, coleta y rapado. Accesorios: ninguno, cinta, gorra y máscara (la cinta y la gorra usan el color
de la camiseta). Aspecto inicial: piel media, pelo negro, camiseta roja, pantalón azul oscuro, pelo corto
y cinta.

**Lucha (se retira):**

- La lógica va en funciones puras (`juego/motor/combate.ts`) que avanzan el combate un *tick*, 60 veces
  por segundo, a ritmo fijo aunque la pantalla vaya más rápida o más lenta. El dibujo solo lee ese estado,
  y por eso la lógica se puede probar sin navegador y la IA podrá usar la misma entrada que el teclado.
- Todos los números del juego están en `juego/motor/reglas.ts`. Cada golpe tiene arranque (antes de
  poder dar), ventana activa y recuperación (castigo si falla): puñetazo rápido, 6 de daño; patada más
  lenta, 10; especial, 20, solo con la energía llena (se gana golpeando y recibiendo).
- Bloquear (S) solo sirve de cara al rival y deja pasar el 15 % del daño. Al recibir un golpe te quedas
  aturdido unos instantes y te empuja hacia atrás.
- Rondas de 60 s; gana la ronda quien deja al otro sin vida o tiene más vida al acabar el tiempo (con la
  misma vida, nadie suma). Gana el combate quien gana 2 rondas.
- Escenario pixel art propio (atardecer, montañas y suelo de madera), barras de vida con la parte
  perdida en rojo, reloj, rondas ganadas, energía, mensajes de ronda/K.O./tiempo y pausa con Esc o P.
- Pantalla nueva `/combate` con el enlace "Combate" en el menú. Al acabar: "Revancha" o "Cambiar
  personaje". En esta etapa el rival (CPU, aspecto al azar) no se mueve; la IA llega en la etapa 4.

## Estado por fases

- [x] Fase 1 · Participantes: crear, consultar, editar, activar/desactivar, persistencia.
- [x] Fase 2 · Torneos y cuadro KO: crear, consultar y editar torneos, solo activos, sorteo con BYE.
- [x] Fase 3 · Combates, rondas y campeón: registrar ganadores, avance automático, campeón y torneo cerrado.
- [ ] Fase 4 · Informes y entrega: estadísticas e historial hechos; quedan la revisión final y el vídeo.
