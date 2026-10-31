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
│   └── 02_datos_prueba.sql    Participantes de ejemplo (opcional)
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
│       ├── routers/           Endpoints HTTP (qué URL hace qué)
│       ├── servicios/         Reglas del torneo (sorteo, validaciones, estados)
│       └── repositorios/      Consultas SQL (lo único que toca la base de datos)
│   └── tests/                 Pruebas automáticas del algoritmo del cuadro
│
└── frontend/                  Aplicación Angular
    └── src/app/
        ├── api.config.ts      Dirección de la API
        ├── models/            Interfaces TypeScript (forma de los datos)
        ├── services/          Comunicación con la API (HttpClient) y sesión
        ├── guards/            Bloquean pantallas si no hay sesión
        ├── interceptors/      Añaden el token a cada petición
        ├── components/        Piezas reutilizables (el cuadro KO, la vista del personaje)
        ├── juego/             Modo combate (sin Angular, TypeScript puro)
        │   ├── motor/         Reglas y lógica de la lucha, con sus tests (Vitest)
        │   ├── dibujo/        Escenario, luchadores, chispas y marcador en el canvas
        │   ├── sprites/       Personajes pixel art: aspecto, poses y dibujo
        │   └── teclado.ts     Traduce las teclas a acciones del luchador
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
   `tk3_inscripciones`, `tk3_combates`, `tk3_usuarios`, `tk3_sesiones` y `tk3_personajes`.

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
usuario será también el nick de tu personaje.

## API disponible

Todas las rutas, salvo `/api/auth/registro`, `/api/auth/login` y `/api/salud`, exigen la cabecera
`Authorization: Bearer <token>`. Sin ella responden **401**.

| Método | URL | Qué hace |
| --- | --- | --- |
| POST | `/api/auth/registro` | Crea el usuario y su participante, y abre sesión (`{"nombre_usuario": "...", "contrasena": "..."}`) |
| POST | `/api/auth/login` | Inicia sesión y devuelve `{"token": "...", "usuario": {...}}` |
| POST | `/api/auth/logout` | Cierra la sesión (el token deja de valer) |
| GET | `/api/auth/yo` | Usuario de la sesión actual |
| GET | `/api/personaje` | Aspecto del personaje del usuario (o el inicial si aún no lo ha guardado) |
| PUT | `/api/personaje` | Guarda colores (`#rrggbb`), peinado y accesorio del personaje del usuario |
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

No hay DELETE a propósito: el enunciado dice que desactivar no es borrar.

## Pruebas automáticas

Desde `backend/`, con el entorno virtual activado: `python -m pytest`. Comprueban el sorteo del cuadro
con entre 2 y 32 participantes (nadie repetido, número correcto de BYE, posiciones correctas), el
emparejamiento de las rondas siguientes y torneos completos simulados de 2 a 16 participantes hasta el
campeón (número de rondas correcto, nadie pierde dos veces), el cifrado de contraseñas y las reglas de
registro y sesión, y la validación del aspecto del personaje. Las pruebas de sesión usan un repositorio en memoria: no necesitan MariaDB ni dejan
usuarios de prueba en la base de datos.

Desde `frontend/`: `npm test`. Ejecuta con Vitest los tests de la lógica de la lucha
(`juego/motor/combate.spec.ts`): inicio de ronda, movimiento y paredes, alcance y daño de cada golpe,
que un golpe solo cuente una vez, aturdimiento, bloqueo de cara y de espaldas, el especial con y sin
energía, K.O., fin por tiempo (incluido el empate), cambio de ronda y victoria al mejor de 3.

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

**Interfaz**
- Pantallas: participantes (lista y formulario) y torneos (lista, formulario y detalle con el cuadro).
- El cuadro se muestra en columnas por ronda (Cuartos, Semifinales, Final…), con huecos "Por decidir".
  Antes de sortear se pide confirmación.
- En un combate pendiente se pulsa el nombre del ganador. Los perdedores aparecen tachados y el campeón
  se muestra arriba del torneo.
- Los estilos son provisionales y mínimos: el diseño visual está por decidir.

## Duelo de ritmo (ampliación)

**Nuevo enfoque, decidido por Eva el 31/10/2026:** el modo combate pasa a ser un duelo de ritmo pixel art,
inspirado en el género de *Rhythm Heaven* pero con minijuegos, personajes, música y nombres originales. Dos
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

**Propuestas pendientes de Eva** (R1–R8 en el documento): origen de la música (se recomienda generarla
por código), teclas (J y K), quién juega cada combate del cuadro, la regla exacta ronda → nivel, el
desempate, los escenarios, los endpoints nuevos y la retirada de `tk3_personajes`.

**Etapas**

| Etapa | Contenido | Estado |
| --- | --- | --- |
| 1. Sesión | Registro, login, sesión y contraseñas cifradas | Hecha |
| Limpieza | Retirar el editor de personajes y la lucha (tabla, backend, frontend y tests) | Pendiente |
| 3. Motor de ritmo v1 | Escenario con personajes fijos, reproductor rítmico, evaluación de pulsaciones y marcador | Pendiente |
| 4. Rival CPU | El jugador 2 sigue la pista con una precisión que depende de la ronda | Pendiente |
| 5. Música, efectos y sonido | Canciones por nivel, sonidos de acierto y fallo, textos "PERFECT!" y "MISS!" | Pendiente |
| 6. Conexión con el torneo | Botón "Jugar" en el cuadro, canción según la ronda, validación en el backend y avance del cuadro | Pendiente |

**Código de la versión anterior.** Hasta la limpieza, el repositorio todavía contiene el editor de
personajes (`/api/personaje`, `tk3_personajes`, pantalla *Mi personaje*) y la lucha contra la CPU
(pantalla *Combate*, `juego/motor`, `juego/dibujo`, `juego/sprites`). Después seguirá en el historial de
git. Estos eran los detalles que decidí en esas etapas:

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
- [ ] Fase 4 · Informes y entrega.
