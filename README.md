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
│   └── tests/                 Pruebas automáticas (cuadro, sesión, estadísticas, ritmo y duelos)
│
└── frontend/                  Aplicación Angular
    └── src/app/
        ├── api.config.ts      Dirección de la API
        ├── models/            Interfaces TypeScript (forma de los datos)
        ├── services/          Comunicación con la API (HttpClient) y sesión
        ├── guards/            Bloquean pantallas si no hay sesión
        ├── interceptors/      Añaden el token a cada petición
        ├── juego/             Duelo de ritmo: reglas, evaluación, música, escenarios planos y escenas 3D
        ├── components/        Piezas reutilizables (el cuadro KO, el reproductor de ritmo y la carita)
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
| PATCH | `/api/auth/yo/icono` | Cambia el icono del usuario de la sesión (`{"icono": "rana"}`; `null` vuelve a la inicial) |
| GET | `/api/participantes` | Lista todos (`?activo=true` o `?activo=false` para filtrar). Cada uno lleva `icono` y `tiene_usuario` de su usuario vinculado, si lo tiene |
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
| GET | `/api/torneos/{id}/combates/{idCombate}/duelo` | Duelo de ritmo del combate: canción, quién ha jugado y si le toca al usuario. La primera vez elige la canción según la ronda. Si un participante no tiene cuenta (un bot), la IA toca por él aquí mismo |
| POST | `/api/torneos/{id}/combates/{idCombate}/duelo` | El usuario de la sesión manda sus pulsaciones (`{"pulsaciones": [...]}`). Con los dos resultados, el backend decide el ganador y el cuadro avanza. 403 si no es uno de los dos participantes; 409 si ya ha jugado |
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
récords por canción, y los duelos del torneo (nivel según la ronda con 2 a 32 participantes, canción al
azar del nivel, nadie juega dos veces, solo juega el usuario de ese participante, la IA respeta sus
porcentajes, la IA toca sola por los bots y nunca por las personas, desempates de R5, empate total que
repite (también contra un bot) y torneos de 2 a 8 participantes jugados enteros a base de duelos hasta el
campeón). Las pruebas de sesión, estadísticas, partidas y duelos usan repositorios en memoria: no necesitan MariaDB ni dejan
usuarios de prueba en la base de datos.

Desde `frontend/`: `npm test`. Ejecuta con Vitest los tests de la lógica del duelo de ritmo
(`src/app/juego/*.spec.ts`): juicio PERFECT/GREAT/MISS en los límites de 40 y 90 ms, puntos, combo, Hype
entre 0 y 100, tecla equivocada, pulsaciones sin nota, notas que pasan sin pulsar y una canción de ejemplo.
También prueba las funciones puras de las escenas 3D (`src/app/juego/escenas3d/*.spec.ts`): las curvas de
animación (anticipación, rebote, parpadeo) y cómo se deduce de las pulsaciones qué nota se acaba de acertar o
fallar.

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
- Icono de usuario (aprobado por Eva el 05/11/2026): pulsando en el nombre de la cabecera se abre un panel
  con 15 personajes en el estilo de la web (gato, rana, patito, gaviota, zorro, oso, pulpo, robot, estrella,
  nota musical, fantasma, seta, calabaza, ramen y trofeo). Se guarda en la columna `icono` de `tk3_usuarios`
  (solo el id; la lista válida está en `auth_servicio.py`) y los dibujos son SVG propios en
  `frontend/src/app/models/iconos.ts`. Sin icono se ve la inicial, como antes.
- Pantalla de inicio (`/`) con cuatro botones grandes: Torneos, Estadísticas, Práctica y Participantes.
  Tras iniciar sesión se llega aquí. Pedida por Eva el 05/11/2026.
- Pantallas: participantes (lista y formulario), torneos (lista, formulario y detalle con el cuadro y el
  historial), estadísticas (pestañas Participantes y Canciones) y práctica del duelo de ritmo. En práctica,
  la lista de canciones se filtra por nivel (Todas, Fácil, Media, Difícil) y se ordena de más fácil a más
  difícil o al revés (pedido por Eva el 05/11/2026; se hace en el navegador, sin cambios en la API).
- El cuadro se muestra en columnas por ronda (Cuartos, Semifinales, Final…), con huecos "Por decidir".
  Antes de sortear se pide confirmación.
- En un combate pendiente se pulsa el nombre del ganador. Los perdedores aparecen tachados y el campeón
  se muestra arriba del torneo.

**Diseño visual «Pop Ritmo»** (propuesta 2 de cinco, elegida por Eva el 05/11/2026; maquetas en
`bocetos/propuestas-web/` de la carpeta del proyecto)
- Fondo crema con rayas diagonales suaves, formas muy redondeadas (píldoras) y sombra sólida debajo de
  botones y tarjetas. Los botones se estiran como una gominola al pasar el ratón y se hunden al pulsar.
- Un color por sección, sacado de la paleta de los escenarios: Torneos coral, Estadísticas amarillo,
  Práctica menta y Participantes azul. Se usan en el menú, el inicio y las pestañas.
- Tipografías Fredoka (títulos y botones) y Nunito (texto), cargadas desde Google Fonts en `index.html`.
- Todo el tema está en variables CSS al principio de `frontend/src/styles.css`; cada pantalla solo
  ajusta su distribución.
- Los botones del inicio y los avatares de los participantes sin logo son caritas: un SVG propio en
  `components/cara/` que parpadea, abre la boca con el ratón encima y duerme si el participante está
  desactivado. El color de cada participante sale de su id, así siempre es el mismo.
- Las listas son tarjetas-pastilla en vez de filas con líneas, y entran una tras otra con una pequeña
  animación. Con «reducir movimiento» activado en el sistema, no hay animaciones.
- Los escenarios del juego tienen su propio estilo plano (ver «Duelo de ritmo»): este tema solo cambia las
  pantallas de gestión, aunque comparten la paleta y las píldoras de color.

**Mejoras del torneo (pedidas por Eva el 12/11/2026)**
- Al crear o editar un torneo, el participante del usuario con sesión sale el primero (con la etiqueta
  «tú») y cada participante lleva el icono de su usuario; los que no tienen cuenta, su inicial. El icono
  vive en `tk3_usuarios`, así que la API de participantes lo trae con un `LEFT JOIN` (sin cambiar el
  esquema).
- Los enlaces de volver (`a.volver`) y los secundarios como «Editar torneo» o «Cancelar» (`a.secundario`)
  son píldoras blancas como el resto de botones.
- Las confirmaciones de generar el cuadro y de elegir ganador a mano usan una ventana propia
  (`components/confirmacion`) en vez del `confirm()` del navegador, que no se puede decorar.
- En el duelo nunca se pregunta si juega la IA. Un participante con cuenta siempre toca él mismo; uno sin
  cuenta (un «bot») no puede jugar, así que la IA toca por él al abrir el duelo. Si dos bots se enfrentan,
  el duelo se resuelve en cuanto alguien lo abre. Se retira `POST .../duelo/ia`. Si un rival con cuenta no
  llega a jugar nunca, el combate se puede seguir cerrando pulsando el ganador en el cuadro.
  *Detalle de implementación (Claude):* la IA juega dentro del `GET` del duelo porque es el momento en que
  alguien lo mira, igual que la canción se elige la primera vez que se abre.
- Cuando un duelo tiene ganador, sale el botón *Ver podio* (en la lista de jugadores y sobre el escenario
  al acabar), que abre `/torneos/:id/combates/:idCombate/podio` (opción elegida por Eva). En un duelo
  cualquiera, el ganador en el escalón alto y el perdedor en el segundo, con sus puntos. Si el duelo era
  la final, el podio del torneo: campeón, subcampeón y, en el tercer escalón, quienes perdieron las
  semifinales (uno o dos, según los BYE). El podio no calcula ganadores: solo coloca lo que ya decidió el
  backend.

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
- **Cambio aprobado por Eva el 01/11/2026: estilo cómic.** De tres propuestas (plano detallado, cómic y
  pixel art, en [TK3 Estilos de la barbería](https://claude.ai/artifact/MDNthc9wSXk4n7Fb1rD3YN)) eligió el cómic:
  contorno negro grueso, colores vivos, una sombra con trama de puntos de imprenta y un brillo en cada forma,
  y una onomatopeya (¡ZAS!, ¡CHOF!…) en cada acierto o «¡UY!» en cada fallo. Todo vive en
  `juego/escenarios/dibujo.ts`, así cada escena solo dice qué formas dibuja y el estilo es el mismo en todas
  (detalle mío: la sombra es la parte de la forma que queda fuera de una copia desplazada; la trama solo va
  en formas grandes para que las caras no parezcan tener barba).
- **Cambio aprobado por Eva el 06/11/2026: vuelta al estilo plano**, sustituye al cómic. Eva lo eligió
  tras revisar el boceto del puerto (`bocetos/plano/puerto-plano.html`) y luego los nueve escenarios
  (`bocetos/plano/escenarios-plano.html`), pidiendo cambios hasta darle el visto bueno:
  - Sin contorno negro: las formas se separan por el color.
  - Una sola sombra plana por forma, una media luna abajo a la derecha del mismo color pero más oscuro
    (la luz viene siempre de arriba a la izquierda). Sin trama ni brillo.
  - Personajes con siluetas curvas en vez de piezas geométricas sueltas, y las articulaciones (hombro,
    codo, muñeca, rodilla) solapadas y del mismo color para que no queden huecos. Boca pequeña.
  - Las palabras de cada golpe (¡HOP!, ¡CHAS!…) salen en una píldora de color con Fredoka, como los
    botones de la web: verde al acertar y rojo con «¡UY!» al fallar.
  - Detalles míos: `persona()` mantiene las medidas de antes (cabeza en y − 30 y la mano a 9 unidades del
    hombro), así los objetos que sujeta cada escena siguen en su sitio; `extremidad()` dibuja brazos y
    piernas que se estrechan y se curvan, y `mano()` la mano con el pulgar. Los parámetros que antes
    decían si una forma llevaba contorno ahora dicen si lleva sombra (`sombreado`).
  - El marcador del reproductor (Hype, puntos, combo y el juicio PERFECT / GREAT / MISS) y la cuenta
    atrás también pasan al plano (pedido por Eva el 06/11/2026): píldoras blancas con sombra sólida y el
    juicio en una píldora de color, con las variables del tema «Pop Ritmo».
- Nueve escenarios, tres por nivel:

| Nivel | Escenarios |
| --- | --- |
| Fácil | Puerto de las gaviotas, Brindis arcade, Huerto a compás |
| Media | Ramen a contratiempo, Correos exprés, Paso de patitos |
| Difícil | Estrellas fugaces, Duelo de barberos (el barbero rival corta un ritmo y el jugador lo repite), La mecanógrafa |

- En cada combate, el backend elige al azar un escenario del nivel de su ronda y lo guarda con el combate,
  para que los dos participantes toquen la misma canción aunque jueguen en momentos distintos.

**Etapas**

| Etapa | Contenido | Estado |
| --- | --- | --- |
| 1. Sesión | Registro, login, sesión y contraseñas cifradas | Hecha |
| Limpieza | Retirar el editor de personajes y la lucha (tabla, backend, frontend y tests) | Hecha |
| 3. Motor de ritmo v1 | Escenario con personajes fijos, reproductor rítmico, evaluación de pulsaciones y marcador | Hecha, con los 9 escenarios jugables en *Práctica* |
| 4. Rival CPU | El jugador 2 sigue la pista con una precisión que depende de la ronda | Hecha junto con la 6 (IA en el backend) |
| 5. Música, efectos y sonido | Canciones por nivel, sonidos de acierto y fallo, textos "PERFECT!" y "MISS!" | En curso: el código ya carga los MP3 grabados; faltan los archivos |
| 6. Conexión con el torneo | Botón "Jugar" en el cuadro, canción según la ronda, validación en el backend y avance del cuadro | Hecha (botón *Duelo*) |

**Etapa 3 (motor de ritmo v1), hecha el 31/10/2026.** Aprobado por Eva: pantalla *Práctica* en el menú
para practicar sin que cuente en el torneo, endpoints `GET /api/canciones` y `GET /api/canciones/{id}`,
canciones en archivos JSON sin tabla nueva y el estilo del boceto del puerto.

| Pieza | Archivo |
| --- | --- |
| Números del juego (ventanas, puntos, Hype, teclas) | `frontend/src/app/juego/reglas.ts` |
| Juicio y marcador, funciones puras con Vitest | `frontend/src/app/juego/evaluacion.ts` |
| Música generada con Web Audio | `frontend/src/app/juego/musica.ts` |
| Sonidos grabados opcionales (MP3) | `frontend/src/app/juego/sonidos.ts` y `frontend/public/sonidos/` |
| Escenarios: dibujo en canvas, instrucciones, sonido de aviso y frase final | `frontend/src/app/juego/escenarios/` (un archivo por escenario) |
| Pantalla que junta las piezas | `frontend/src/app/pages/practica/` |
| Canciones | `backend/app/beatmaps/` (un JSON por escenario) |
| Lectura y validación de canciones | `canciones_repo.py`, `canciones_servicio.py`, `routers/canciones.py` |

**Sonidos grabados con ElevenLabs (etapa 5, aprobado por Eva el 01/11/2026)**
- Eva genera los efectos en ElevenLabs (elevenlabs.io) con la lista del documento *TK3 · Sonidos para generar
  con ElevenLabs* y los guarda en `frontend/public/sonidos/` con el nombre que dice la lista
  (`puerto-aviso.mp3`, `barberia-tijeras.mp3`, `fallo.mp3`…).
- **Todos son opcionales:** si un archivo falta o no se puede leer, suena el sonido generado por código de
  siempre. Cada escenario dice en `grabados` qué archivo usa para el aviso y para el acierto de cada tecla.
- Se cargan antes de empezar la canción (`Sonidos.cargar`) y el aviso se programa con el mismo reloj del
  audio que la música, por eso el archivo tiene que empezar sin silencio delante. Al terminar suena
  `ovacion` si el Hype acaba en 70 o más, o `final-flojo` si acaba por debajo de 40.
- **Créditos:** con el plan gratuito de ElevenLabs los sonidos solo se pueden usar sin ánimo de lucro y hay
  que citar «elevenlabs.io»; se cita aquí y en los créditos del vídeo. Esto cambia D7: el arte y la música
  siguen siendo originales y generados por código, y los efectos pueden ser grabaciones generadas por IA.

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
- Ramen a contratiempo (rehecho el 05/11/2026; Eva eligió «verdura bajo el cuchillo», mismas notas): la
  verdura avanza por la tabla hacia un cuchillo fijo y cada línea de puntos llega bajo él justo en el pulso
  de su corte (J), así la distancia entre líneas es el ritmo, como las cartas de correos. Una línea solo
  desaparece si se corta: un fallo deja una marca roja y el trozo pegado. La tapa de la olla se levanta un
  pulso antes de la K, que va a contratiempo tras el último corte, y la tapa tintinea en ese momento. Los
  cortes ya no tienen aviso sonoro: sonaba encima del corte anterior y despistaba. Cada tanda trae una
  verdura distinta (zanahoria, cebolleta, seta, pimiento, maíz y nabo).
  Correos exprés: J sella cada carta bajo el sello; las urgentes, en rojo, van a
  contratiempo. Paso de patitos: J hace saltar el charco a cada patito y K al segundo de una pareja; se pulsa cuando el
  patito pisa la piedra del borde del charco (cambiado tras las pruebas de Eva del 01/11/2026).
- Estrellas fugaces (`observatorio`): J fotografía cada estrella al pasar por la mira y K los cometas. Tras
  las pruebas de Eva del 05/11/2026 (era demasiado fácil para un nivel difícil) llegan por los dos lados, con
  las mismas notas: en la primera mitad cada compás viene de un lado y en la segunda se alternan una a una.
  Duelo de barberos (`barberia`, sustituye a Gatos en el tejado; aprobado por Eva el 01/11/2026 a partir de
  la vista previa): llamada y respuesta de cuatro pulsos a 124 BPM con ocho patrones. El aviso de cada nota es
  el corte del barbero rival (`aviso_antes: 4`); J es un tijeretazo y K una pasada de navaja. Los puntos de su
  espejo recuerdan el patrón y cada fallo deja un trasquilón en la barba del cliente. Los duelos del torneo
  que ya se habían creado con el tejado se juegan con la barbería (`RETIRADAS` en `duelos_servicio.py`) sin
  cambiar nada en la base de datos. La mecanógrafa: líneas de cuatro pulsos con J para cada letra y K para
  la campanilla.
- Ajuste tras las pruebas de Eva del 01/11/2026 (los difíciles iban demasiado rápidos y dos no se leían bien):
  se baja el BPM de los tres (Mecanógrafa 152 → 126, Estrellas 144 → 120, Gatos 150 → 128), un tempo parecido
  al de los medios (112–124). Mecanógrafa: nueva pauta en la mesa con la línea actual, su cursor y
  la línea siguiente, máximo cinco letras por línea, y un aviso de campanilla antes de la K. Estrellas: todas
  llegan por el mismo camino, a la misma velocidad y con cuatro pulsos de antelación, y las frases son más
  cortas y con silencios. Los récords de práctica anteriores se hicieron con las canciones antiguas.

**Récords por canción (aprobado por Eva el 31/10/2026).** Cada partida terminada en *Práctica* se guarda
en la tabla nueva `tk3_partidas`. El navegador solo manda las pulsaciones y el backend calcula la
puntuación con `servicios/ritmo.py`, que repite las reglas de `juego/evaluacion.ts` con los mismos casos de
prueba (`tests/test_ritmo.py`), así nadie puede inventarse un récord y la misma lógica servirá para validar
los duelos en la etapa 6. En *Estadísticas › Canciones* sale el top 5 de cada canción, una marca por
usuario. Empates: más PERFECT, luego menos MISS y luego quien lo consiguió antes. Detalles míos: se
rechazan las partidas con pulsaciones fuera de la canción o con más de tres por nota (más 20), y el
nombre que se muestra es el nombre de usuario.

**Etapas 4 y 6: duelo en el torneo e IA (aprobado por Eva el 31/10/2026).** Propuesta:
[Duelo en el torneo e IA](https://claude.ai/artifact/4kHPojjhLEbhQtgVPGqSFd). Aprobado tal cual:
- Cada combate pendiente del cuadro tiene un enlace *Duelo* que abre `/torneos/:id/combates/:idCombate/duelo`.
  El botón de elegir ganador a mano se mantiene.
- La primera vez que se abre, el backend elige la canción: nivel según la ronda (R4) y escenario al azar
  dentro del nivel. Se guarda en `tk3_duelos`, así los dos participantes tocan la misma.
- *Jugar el duelo* solo le sale al usuario cuyo participante está en el combate y no ha jugado. ~~*Que juegue
  la IA* sale para cada participante que no ha jugado~~: cambiado el 12/11/2026, ver «Mejoras del torneo».
- La puntuación del rival no se ve hasta que el combate termina; la propia sí.
- Con los dos resultados (`tk3_duelo_resultados`), el backend aplica R5 y llama a la misma regla que el
  botón manual (`torneos_servicio.registrar_ganador`), que genera la ronda siguiente o cierra el torneo.
- Empate total: se borran los dos resultados y el duelo se repite con otra canción del mismo nivel. Es lo
  único que borra datos y solo lo hace esta regla.
- IA (`servicios/ia.py`, números en `servicios/ritmo.py`): para cada nota decide si se le escapa y con
  cuánto error pulsa, con una curva normal. Fácil: 5 % y ±30 ms; media: 10 % y ±45 ms; difícil: 15 % y
  ±60 ms. Sus pulsaciones se puntúan con las mismas reglas que las de una persona.
- El reproductor de Práctica pasa a ser el componente `components/reproductor-ritmo`, que usan Práctica y
  el duelo.

| Pieza | Archivo |
| --- | --- |
| Reglas del duelo (nivel, canción al azar, ganador, repetición) | `backend/app/servicios/duelos_servicio.py` |
| IA | `backend/app/servicios/ia.py` |
| SQL de los duelos | `backend/app/repositorios/duelos_repo.py` |
| Endpoints | `backend/app/routers/torneos.py` |
| Pantalla del duelo | `frontend/src/app/pages/duelo/` |
| Podio del duelo y del torneo | `frontend/src/app/pages/podio/` |
| Reproductor | `frontend/src/app/components/reproductor-ritmo/` |

Detalles que decidí yo (Claude):
- Con 2 o 3 participantes la primera ronda ya es la final o la semifinal, y es difícil (R4: mandan las
  semifinales y la final).
- Un combate con BYE no tiene duelo, y un combate resuelto a mano tampoco lo crea.
- Error nuevo `SinPermiso` (403) para cuando alguien intenta jugar por un participante que no es el suyo.
- La respuesta del duelo incluye `total_rondas` para poder escribir "Semifinales" o "Final".
- Las comprobaciones de pulsaciones de Práctica (máximo por nota, fuera de la canción) se reutilizan en el
  duelo (`partidas_servicio.puntuar`).
- Música mejorada (01/11/2026, aprobado por Eva: "mejorarla por código"). Cada canción tiene ahora intro, parte A,
  parte B y final, con acordes, segunda voz y batería que cambia entre partes. Se escribe entera en el beatmap
  (`repetir_cada` = largo de la canción) y hay cuatro instrumentos nuevos: `flauta`, `pulsado`, `campana` y
  `acordes`. El motor añade un eco de sala y una cadena de salida (compresor, subida de volumen `VOLUMEN_GENERAL` y limitador) que la hace sonar unos 5 dB más fuerte sin saturar: antes se oía floja en los altavoces de un portátil. Con 11 dB (VOLUMEN_GENERAL 2,8) quedaba demasiado fuerte y Eva pidió un punto intermedio el 05/11/2026. Las notas que hay que pulsar no cambian.
- Al acabar la canción, el escenario se queda como terminó la partida (antes volvía a la escena en reposo y,
  por ejemplo, la hortelana del huerto se deslizaba al centro).
- Las pulsaciones se mandan sin redondear: al redondear a milisegundos enteros, una nota a 39,8 ms podía
  ser PERFECT en el navegador y GREAT en el backend. Ahora coinciden siempre.
- Limitación conocida: solo cuenta la partida que llega al final de la canción. Si alguien recarga la
  página a mitad, puede volver a empezar; para evitarlo habría que guardar también los intentos empezados.

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

## Renovación 3D del juego (en curso)

**Pedida por Eva el 10/11/2026 y aprobada el 11/11/2026.** El duelo de ritmo pasa del estilo plano a un 3D
de dibujos animados con aire de película de animación: personajes con volumen y expresiones, luz cálida,
sombras suaves, profundidad y materiales. Las nueve propuestas visuales que Eva aprobó están en
[Renovación 3D del juego](https://claude.ai/artifact/RiV4UDHJMBYMvWZstDgP7L) y en
`bocetos/renovacion-3d/` de la carpeta del proyecto.

**Aprobado por Eva el 11/11/2026**
- Las nueve escenas tal como salen en las propuestas.
- La librería **three.js** (licencia MIT) para dibujar en 3D. Es la única dependencia nueva; sustituye a D6
  (motor de dibujo propio sin librerías) solo en la parte del dibujo. Todos los modelos, texturas y
  animaciones siguen siendo originales y hechos por código: no se descarga ningún modelo ni imagen.
- La música sigue generándose por código, con arreglos nuevos sobre los mismos BPM y las mismas notas.
- Mejoras de sonido y mecánicas: volumen y silencio separados para música y efectos, aviso de «pronto» o
  «tarde», compás de demostración, premios de combo a los 10, 25 y 50, pausa solo en Práctica, pantalla
  final con desglose y efectos de sonido nuevos.
- Las fechas del enunciado no limitan este trabajo (decisión de Eva).
- Las reglas no cambian: mismas ventanas de juicio, mismos puntos, mismas teclas y el backend sigue
  calculando la puntuación oficial.

**Copia intacta de la versión plana.** La rama `copia-version-plana` guarda el proyecto tal como estaba
antes de empezar (commit `688ed10`). Además, los nueve escenarios planos siguen en el código
(`juego/escenarios/`): son lo que se ve mientras una escena no tiene versión 3D, y también si el navegador
no puede dibujar en 3D.

**Etapas**

| Etapa | Contenido | Estado |
| --- | --- | --- |
| 1. Base común y puerto | Motor 3D, personajes, materiales, luz, marcador nuevo y la escena del puerto animada | Hecha el 11/11/2026; Eva la probó en su portátil ese día y va fluida |
| 2. Resto de escenas | Las otras ocho escenas en 3D | Hecha el 12/11/2026: las nueve escenas tienen versión 3D; falta que Eva las pruebe |
| 3. Pantallas del juego | Inicio, final y transiciones (se enseñan propuestas antes) | Pendiente |
| 4. Sonido y mecánicas | Las mejoras aprobadas de la lista de arriba | Pendiente |
| 5. Pruebas, rendimiento y pulido | Revisión de las nueve escenas en ordenadores reales | Pendiente |

**Cómo funciona (etapa 1)**

| Pieza | Archivo (en `frontend/src/app/juego/escenas3d/`) |
| --- | --- |
| Motor: cámara, luces, sombras, efectos de imagen y niveles de calidad | `motor.ts` |
| Curvas de animación, funciones puras con Vitest | `animacion.ts` |
| Qué nota se acaba de acertar o fallar, funciones puras con Vitest | `golpes.ts` |
| Materiales (piel, tela, plástico, metal) y texturas pintadas por código | `materiales.ts` |
| Formas básicas redondeadas y el tubo flexible de brazos y piernas | `formas.ts` |
| Personaje humano: cuerpo, cara, expresiones, parpadeo y respiración | `personaje.ts` |
| Objetos compartidos: mar, nubes, chispas, salpicaduras | `objetos.ts` |
| Escena del puerto: decorado, gaviotas y pescador | `puerto.ts` |
| Escena del bar: barra, clientes y jarras que chocan | `bar.ts` |
| Escena del huerto: hortelana, abejas y calabazas que crecen | `huerto.ts` |
| Escena del ramen: cocinero, verduras que se cortan y olla | `ramen.ts` |
| Escena de correos: cartera, cinta de cartas y sello | `correos.ts` |
| Escena de los patitos: mamá pata, patitos que saltan el charco | `patitos.ts` |
| Escena del observatorio: astrónoma, estrellas fugaces y mira | `observatorio.ts` |
| Escena de la barbería: maestro que marca el patrón, barbero que lo repite y barbas que se recortan | `barberia.ts` |
| Escena de la mecanógrafa: pauta con cursor, máquina de escribir y campanilla | `mecanografa.ts` |
| Lista de escenas que ya tienen versión 3D | `disponibles.ts` e `index.ts` |

- El reproductor (`components/reproductor-ritmo`) mira si el escenario de la canción está en
  `disponibles.ts`. Si está, carga la parte 3D y la dibuja; si no, o si algo falla, dibuja el escenario
  plano de siempre. La lógica de la partida (reloj del audio, juicio, marcador) es la misma en los dos casos.
- La parte 3D se descarga aparte y solo al abrir una canción: las pantallas de gestión no cargan three.js.
  Medido al compilar con las nueve escenas: 768 kB (174 kB comprimido) que se suman una sola vez.
- **Las animaciones no guardan estado.** En cada fotograma la escena recibe lo mismo que el dibujo plano
  (segundos, pulso, notas con su juicio y última pulsación) y calcula con eso la postura de cada personaje:
  anticipación antes del golpe, acción en el pulso y reacción según el juicio. Así el dibujo no puede
  desincronizarse de la música y las curvas se prueban sin navegador.
- **Calidad automática.** Hay tres niveles (alta, media y baja) que cambian la resolución, el tamaño de las
  sombras y los efectos (desenfoque del fondo y resplandor). Si el ordenador encadena 45 fotogramas de más
  de 25 ms, el motor baja un nivel él solo: en un juego de ritmo importa más la fluidez que el adorno.
- **Materiales preparados antes de empezar.** Al crear la escena el motor prepara los materiales de todo,
  también de lo que empieza escondido (chispas, gotas, trozos). Si no, el navegador los prepararía la
  primera vez que aparecen y daría un tirón justo al pulsar la primera nota (`precalentar` en `motor.ts`).
- El marcador (Hype, progreso de la canción, puntos, combo, juicio, palabra del golpe y ayuda de teclas) es
  HTML encima del dibujo, con el diseño de las propuestas. Se usa también sobre los escenarios planos.

Detalles que decidí yo (Claude) en esta etapa:
- three.js en la versión 0.187.0 (las propuestas se hicieron con la 0.170; el resultado es el mismo).
  `@types/three` solo se usa al compilar.
- Cada escenario dice ahora qué hace cada tecla (`teclas` en `escenarios/tipos.ts`) para la ayuda en pantalla,
  y la vista que reciben los escenarios incluye el `bpm`.
- En `angular.json` sube el aviso de tamaño de la hoja de estilos de un componente (de 4 a 8 kB): el
  marcador nuevo ocupa unos 7 kB.
- La calidad se puede fijar a mano guardando `tk3_calidad` (`alta`, `media` o `baja`) en el almacenamiento
  local del navegador; lo usan las pruebas. Un selector en pantalla sería una propuesta para la etapa 4.
- Sin comprobar todavía: el rendimiento en un portátil real (aquí solo se ha podido probar con un navegador
  sin tarjeta gráfica) y el diseño del marcador en pantallas de móvil.

## Estado por fases

- [x] Fase 1 · Participantes: crear, consultar, editar, activar/desactivar, persistencia.
- [x] Fase 2 · Torneos y cuadro KO: crear, consultar y editar torneos, solo activos, sorteo con BYE.
- [x] Fase 3 · Combates, rondas y campeón: registrar ganadores, avance automático, campeón y torneo cerrado.
- [ ] Fase 4 · Informes y entrega: estadísticas e historial hechos; quedan la revisión final y el vídeo.
- [x] Ampliación · Duelo de ritmo: sesión, motor con 9 escenarios, récords de práctica, IA y duelos en el torneo.
- [ ] Renovación 3D del juego: etapas 1 y 2 hechas (base común y las nueve escenas en 3D); faltan pantallas, sonido, mecánicas y pulido.
