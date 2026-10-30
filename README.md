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
│       ├── main.py            Arranque de la API, CORS y errores generales
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
        ├── services/          Comunicación con la API (HttpClient)
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
   `tk3_inscripciones` y `tk3_combates`.

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
todos los endpoints sin Angular.

La próxima vez solo hace falta `cd backend`, `venv\Scripts\activate` y `uvicorn app.main:app --reload`.

### 3. Frontend (terminal 2)

```bash
cd frontend
npm install
npx ng serve
```

Abre <http://localhost:4200>.

## API disponible

| Método | URL | Qué hace |
| --- | --- | --- |
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
campeón (número de rondas correcto, nadie pierde dos veces).

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

## Estado por fases

- [x] Fase 1 · Participantes: crear, consultar, editar, activar/desactivar, persistencia.
- [x] Fase 2 · Torneos y cuadro KO: crear, consultar y editar torneos, solo activos, sorteo con BYE.
- [x] Fase 3 · Combates, rondas y campeón: registrar ganadores, avance automático, campeón y torneo cerrado.
- [ ] Fase 4 · Informes y entrega.
