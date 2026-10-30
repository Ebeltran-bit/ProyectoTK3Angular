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
│       └── repositorios/      Consultas SQL (lo único que toca la base de datos)
│
└── frontend/                  Aplicación Angular
    └── src/app/
        ├── api.config.ts      Dirección de la API
        ├── models/            Interfaces TypeScript (forma de los datos)
        ├── services/          Comunicación con la API (HttpClient)
        └── pages/             Pantallas (componentes con vista)
```

Cada capa tiene una sola responsabilidad:

| Parte | Qué hace | Qué NO hace |
| --- | --- | --- |
| `pages/` (Angular) | Muestra datos y recoge lo que escribe el usuario | No llama a la API directamente |
| `services/` (Angular) | Hace las peticiones HTTP a la API | No sabe nada de SQL |
| `routers/` (Python) | Recibe la petición, valida y responde con el código HTTP adecuado | No escribe SQL |
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
3. Opcional: lo mismo con `database/02_datos_prueba.sql`.
4. Comprueba que en `2DAM_alumno03` aparece la tabla `tk3_participantes`.

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

## API disponible (fase 1)

| Método | URL | Qué hace |
| --- | --- | --- |
| GET | `/api/participantes` | Lista todos (`?activo=true` o `?activo=false` para filtrar) |
| GET | `/api/participantes/{id}` | Un participante |
| POST | `/api/participantes` | Crea uno (`{"nick": "...", "logo": "..."}`) → 409 si el nick ya existe |
| PUT | `/api/participantes/{id}` | Edita nick y logo |
| PATCH | `/api/participantes/{id}/estado` | Activa o desactiva (`{"activo": false}`) |

No hay DELETE a propósito: el enunciado dice que desactivar no es borrar.

## Decisiones tomadas

- FastAPI con SQL directo (PyMySQL), sin ORM.
- Todas las tablas en `2DAM_alumno03` con prefijo `tk3_`.
- El nick es único (lo garantiza la base de datos con `UNIQUE`).
- El logo es una URL de imagen opcional. Si no hay logo o no carga, se muestra la inicial del nick.
- Los estilos son provisionales y mínimos: el diseño visual está por decidir.

## Estado por fases

- [x] Fase 1 · Participantes: crear, consultar, editar, activar/desactivar, persistencia.
- [ ] Fase 2 · Torneos y cuadro KO.
- [ ] Fase 3 · Combates, rondas y campeón.
- [ ] Fase 4 · Informes y entrega.
