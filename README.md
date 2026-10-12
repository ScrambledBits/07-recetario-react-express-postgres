# Recetario (React + Express + PostgreSQL)

Aplicación *full-stack* de recetas de cocina: un **frontend en React** (empaquetado con **Vite**) consume una **API REST en Express**, que guarda las recetas en **PostgreSQL**. Permite listar recetas, filtrarlas por dificultad, crear nuevas y borrarlas.

> Proyecto con fines exclusivamente educativos. Sin usuarios ni autenticación.

---

## Nivel y objetivos de aprendizaje

**Nivel:** intermedio–avanzado.

Este proyecto tiene **dos aplicaciones** en un mismo repositorio (un *monorepo* pequeño), cada una con su propio `Dockerfile`. Vas a practicar:

- Escribir **dos `Dockerfile`** distintos y orquestarlos con un único `docker-compose.yml`.
- Un **build multi-etapa clásico de frontend**: compilar con Node y servir los archivos estáticos con **Nginx**, sin Node en la imagen final.
- Configurar **Nginx como proxy inverso**: servir la SPA y reenviar `/api` al backend.
- Entender la diferencia entre variables de entorno en **tiempo de construcción** (`ARG`, incrustadas en el JavaScript) y en **tiempo de ejecución** (`ENV`, leídas por el proceso).
- **Inicializar una base de datos** con un script SQL usando el mecanismo de la imagen oficial de PostgreSQL.
- Diseñar **redes** para que la base de datos no sea alcanzable desde el frontend.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite 8 (JavaScript, sin TypeScript) |
| Servidor del frontend en producción | Nginx (a configurar por ti) |
| Backend | Node.js 20.19+ con Express 5 |
| Driver de base de datos | `pg` (node-postgres) con *pool* de conexiones |
| Base de datos | PostgreSQL 16 o 17 |

---

## Arquitectura

**En producción (objetivo del ejercicio):**

```
                     ┌──────────────────────────── red "frontend" ───┐
 Navegador ──HTTP──▶ │ web (Nginx, puerto 80)                         │
                     │   /        → archivos estáticos de React (dist)│
                     │   /api/... → proxy_pass ──┐                    │
                     └───────────────────────────┼────────────────────┘
                                                 ▼
                     ┌──────────────── red "backend" ────────────────┐
                     │ api (Express, puerto 4000)                     │
                     │        │ TCP 5432                              │
                     │        ▼                                       │
                     │ db (PostgreSQL) ◀── init.sql al primer arranque│
                     └────────────────────────────────────────────────┘
```

- El navegador **solo** habla con Nginx. Como el frontend llama a rutas **relativas** (`/api/recetas`), no hay problemas de CORS: todo sale del mismo origen.
- La API **no** necesita publicarse hacia tu máquina.

**En desarrollo (referencia):** el servidor de Vite (puerto 5173) sirve React con recarga en caliente y tiene configurado un **proxy** que reenvía `/api` a la API. Ese proxy **no existe** en el build de producción; por eso hace falta Nginx.

---

## Estructura del proyecto

```
07-recetario-react-express-postgres/
├── backend/
│   ├── server.js            # API Express: rutas /api/*, pool de pg, apagado limpio
│   ├── package.json
│   ├── package-lock.json
│   └── db/
│       └── init.sql         # Crea la tabla "recetas" e inserta 4 recetas de ejemplo
├── frontend/
│   ├── index.html           # Punto de entrada HTML de Vite
│   ├── vite.config.js       # Plugin de React y proxy de desarrollo
│   ├── package.json         # Scripts dev / build / preview
│   ├── package-lock.json
│   ├── public/favicon.svg   # Se copia tal cual al build
│   └── src/
│       ├── main.jsx         # Monta <App /> en #root
│       ├── App.jsx          # Toda la interfaz (lista, filtros, formulario)
│       └── App.css
├── README.md
└── CHANGELOG.md
```

Detalles importantes:

- **`backend/server.js`**
  - No recibe una cadena de conexión: el driver `pg` lee **automáticamente** las variables estándar de PostgreSQL (`PGHOST`, `PGUSER`, etc.).
  - **No crea la tabla**. Si `init.sql` no se ejecutó, las rutas responden `500` con `relation "recetas" does not exist`.
  - Todas las rutas empiezan por `/api`, incluida la de salud (`/api/health`).
- **`backend/db/init.sql`**: la imagen oficial de PostgreSQL ejecuta automáticamente los scripts `.sql` que encuentre en una carpeta especial **solo cuando el directorio de datos está vacío** (primer arranque).
- **`frontend/vite.config.js`**: el destino del proxy de desarrollo se puede cambiar con `API_PROXY_TARGET`.
- **`frontend/src/App.jsx`**
  - Lee `import.meta.env.VITE_APP_TITULO`. Vite **reemplaza** ese valor por texto literal al compilar; cambiar la variable cuando el contenedor ya está corriendo **no tiene efecto**.
  - El pie muestra el modo de build (`production` o `development`).
- **`npm run build`** genera la carpeta `frontend/dist/` con `index.html` y `assets/` (JS y CSS con *hash* en el nombre).

---

## Variables de entorno

### API (tiempo de ejecución)

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PORT` | `4000` | Puerto HTTP de la API. |
| `PGHOST` | `localhost` | Host de PostgreSQL. |
| `PGPORT` | `5432` | Puerto de PostgreSQL. |
| `PGUSER` | usuario del sistema | Usuario de la base de datos. |
| `PGPASSWORD` | — | Contraseña. |
| `PGDATABASE` | igual que `PGUSER` | Nombre de la base de datos. |

### Frontend

| Variable | Momento | Descripción |
|---|---|---|
| `VITE_APP_TITULO` | **Construcción** | Título que aparece en la cabecera. Por defecto, `Recetario`. |
| `API_PROXY_TARGET` | Solo desarrollo | URL a la que el servidor de Vite reenvía `/api`. Por defecto, `http://localhost:4000`. |

---

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | `200` si PostgreSQL responde; `503` si no. |
| `GET` | `/api/recetas` | Lista de recetas. Filtro opcional `?dificultad=facil|media|dificil`. |
| `GET` | `/api/recetas/:id` | Una receta; `404` si no existe. |
| `POST` | `/api/recetas` | Crea una receta. Cuerpo: `{"nombre","descripcion","ingredientes":[...],"minutos","dificultad"}`. `400` con lista de errores si no es válida. |
| `DELETE` | `/api/recetas/:id` | Borra una receta; `204` o `404`. |

---

## Ejecución local sin Docker (referencia)

1. PostgreSQL local con una base creada y `init.sql` ejecutado sobre ella.
2. **Backend:** instala dependencias, define las variables `PG*` y usa el script `start` o `dev`.
3. **Frontend:** instala dependencias y usa el script `dev`; abre el puerto que indique Vite.
4. Para probar el build de producción: script `build` y luego `preview` (pero `preview` **no** tiene el proxy de `/api` configurado).

---

## Reto: dockerizar la aplicación

> Pistas, no soluciones.

### Parte 1: `backend/Dockerfile`

1. Imagen oficial de Node LTS con versión explícita.
2. Dependencias de **producción** a partir del lockfile, con buena caché de capas.
3. `NODE_ENV=production`, usuario sin privilegios, puerto documentado.
4. Arranque directo del proceso de Node para que reciba `SIGTERM`.
5. `.dockerignore` con `node_modules`.
6. Ojo con el **contexto de construcción**: ¿construyes desde la raíz del repositorio o desde `backend/`? Eso cambia las rutas de tus instrucciones de copia y dónde debe estar el `.dockerignore`.

### Parte 2: `frontend/Dockerfile` (multi-etapa)

1. **Etapa de build:** imagen de Node. Aquí **sí** necesitas las dependencias de desarrollo (Vite es una de ellas).
2. Declara un **argumento de construcción** para `VITE_APP_TITULO` y conviértelo en variable de entorno **antes** de compilar.
3. Ejecuta el script de build.
4. **Etapa final:** imagen oficial de Nginx (versión explícita, variante `alpine`). Copia **solo** la carpeta `dist` desde la etapa anterior a la carpeta que Nginx sirve por defecto.
5. **Configuración de Nginx** (crea tu propio archivo y cópialo a la carpeta de configuraciones de la imagen):
   - Un bloque que sirva los archivos estáticos.
   - Un bloque para `/api/` que **reenvíe** al servicio de la API usando su nombre en Compose y su puerto.
   - Un *fallback* a `index.html` para rutas desconocidas (habitual en aplicaciones de una sola página).
6. (Opcional) Investiga las variantes **sin privilegios** (*unprivileged*) de Nginx y qué puerto usan.

### Parte 3: `docker-compose.yml` (en la raíz)

1. Tres servicios: **web**, **api** y **db**. Cada uno de los dos primeros con su propio contexto de construcción.
2. Pasa `VITE_APP_TITULO` como **argumento de construcción** (no como `environment`). Cambia su valor, reconstruye y comprueba que el título cambia.
3. Monta `backend/db/init.sql` en la **carpeta de inicialización** de la imagen de PostgreSQL (búscala en la documentación). Móntalo en **solo lectura**.
4. Volumen con nombre para los datos de PostgreSQL y healthcheck para la base de datos.
5. La API espera a que la base esté **sana**; la web espera a la API.
6. **Dos redes**: `frontend` (web + api) y `backend` (api + db). La web **no** debe poder resolver el nombre de la base de datos.
7. Publica **solo** el puerto de la web.
8. Secretos en un `.env` ignorado por git.

### Criterios de aceptación

- [ ] En el navegador aparecen las 4 recetas iniciales con estilos.
- [ ] Filtrar, crear y borrar recetas funciona.
- [ ] La imagen del frontend **no** contiene Node.js ni `node_modules`.
- [ ] El título viene del argumento de construcción.
- [ ] Desde el contenedor `web` **no** se puede alcanzar `db` (compruébalo intentando resolver su nombre).
- [ ] Solo hay **un** puerto publicado en tu máquina.
- [ ] Los datos persisten tras recrear los contenedores, y `init.sql` **no** vuelve a insertar las recetas de ejemplo.

### Retos extra

- Crea un `compose.dev.yml` que use el servidor de Vite con *bind mount* y recarga en caliente, con `API_PROXY_TARGET` apuntando a la API. Pista: el servidor de Vite ya está configurado para escuchar en todas las interfaces.
- Agrega cabeceras de caché largas a los archivos de `/assets/` en Nginx (sus nombres llevan *hash*).
- Activa compresión `gzip` en Nginx.
- Agrega un healthcheck a la API y a la web.
- Investiga cómo hacer que el título se configure en **tiempo de ejecución** (pista: generar un pequeño archivo de configuración al arrancar Nginx; la imagen oficial soporta *plantillas* con variables de entorno).

---

## Errores comunes

| Síntoma | Causa probable |
|---|---|
| La página carga pero dice "No se pudo contactar con la API" | Nginx no reenvía `/api` o apunta a un host/puerto incorrecto. |
| `502 Bad Gateway` en `/api/...` | La API no está corriendo, o no comparte red con Nginx. |
| `relation "recetas" does not exist` | `init.sql` no se ejecutó: ruta de montaje incorrecta o el volumen ya tenía datos. |
| Cambié `VITE_APP_TITULO` y no cambia nada | Es de **construcción**: hay que reconstruir la imagen, y pasarla como `args`, no como `environment`. |
| `sh: vite: not found` durante el build | Instalaste solo dependencias de producción en la etapa de build. |
| `404` al recargar una ruta interna | Falta el *fallback* a `index.html` en Nginx. |

---

## Referencias

- Variables de entorno en Vite: <https://vite.dev/guide/env-and-mode>
- Despliegue de un sitio estático con Vite: <https://vite.dev/guide/static-deploy>
- Imagen oficial de Nginx: <https://hub.docker.com/_/nginx>
- Módulo proxy de Nginx: <https://nginx.org/en/docs/http/ngx_http_proxy_module.html>
- Imagen oficial de PostgreSQL (scripts de inicialización): <https://hub.docker.com/_/postgres>
- Variables de entorno de node-postgres: <https://node-postgres.com/features/connecting>
- Redes en Compose: <https://docs.docker.com/compose/how-tos/networking/>
- Argumentos de construcción: <https://docs.docker.com/build/building/variables/>
