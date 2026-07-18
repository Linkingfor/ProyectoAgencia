# 🚀 Despliegue en Render — Agencia de Viajes Ica

El proyecto son **3 piezas**:

| Pieza | Tipo en Render | Carpeta |
|-------|----------------|---------|
| Base de datos | PostgreSQL | — |
| Backend (API) | Web Service (Node) | `backend/` |
| Frontend (web) | Static Site (Vite) | `frontend/` |

Hay dos caminos: **A) Blueprint** (automático con `render.yaml`) o **B) Manual**.

---

## A) Camino rápido — Blueprint

1. En Render: **New +** → **Blueprint** → conecta el repo `Linkingfor/ProyectoAgencia`.
2. Render lee `render.yaml` y crea la base de datos, el backend y el frontend.
3. Completa las variables marcadas como pendientes (ver tablas abajo): claves de Stripe, correo, y las **dos URLs cruzadas** (`VITE_API_URL` y `CORS_ORIGINS`).
4. **Carga el esquema de la base** (paso obligatorio, ver más abajo).

---

## B) Camino manual

### 1. Base de datos
New + → **PostgreSQL** → plan Free → créala. Copia su **Internal Database URL**.

### 2. Backend (Web Service)
- Repo: `Linkingfor/ProyectoAgencia` · **Root Directory:** `backend`
- Build: `npm install` · Start: `node server.js`
- Environment → agrega estas variables:

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(la Internal Database URL del paso 1)* |
| `JWT_SECRET` | *(una cadena larga y aleatoria)* |
| `JWT_EXPIRES_IN` | `8h` |
| `STRIPE_SECRET_KEY` | *(tu clave secreta de Stripe, empieza con `sk` + `_test_`)* |
| `STRIPE_CURRENCY` | `pen` |
| `EMAIL_USER` | `tucorreo@gmail.com` |
| `EMAIL_APP_PASSWORD` | *(contraseña de aplicación de 16 letras, sin espacios)* |
| `EMAIL_FROM_NAME` | `Agencia de Viajes Ica` |
| `CORS_ORIGINS` | *(la URL del frontend, ej. `https://agenciaviajes-frontend.onrender.com`)* |

### 3. Frontend (Static Site)
- Repo: el mismo · **Root Directory:** `frontend`
- Build: `npm install && npm run build` · **Publish Directory:** `dist`
- Environment → agrega:

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://TU-BACKEND.onrender.com/api` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | *(tu clave pública de Stripe, empieza con `pk` + `_test_`)* |

- **Redirects/Rewrites** → agrega una regla: `Source: /*` · `Destination: /index.html` · `Action: Rewrite`
  (necesario para React Router; el archivo `frontend/public/_redirects` ya lo cubre en la mayoría de casos).

---

## 4. Cargar el esquema en la base (OBLIGATORIO, una sola vez)

La base nace vacía. Hay que crear las tablas y los datos iniciales:

**Opción rápida** — desde tu PC, con la **External Database URL** de Render:
```bash
psql "postgresql://usuario:clave@host-externo.render.com/agenciaviajes_db" -f backend/database_postgres.sql
```

Eso deja el usuario admin listo → usuario: `admin` · contraseña: `Admin1234`.

> Las migraciones `backend/migrations/RFC001_*.sql` y `RFC005_*.sql` ya vienen incluidas en `database_postgres.sql`, no hay que correrlas aparte.

---

## 5. El orden de las URLs cruzadas

Como el frontend necesita la URL del backend y el backend necesita la del frontend:

1. Despliega primero el **backend** → anota su URL (`https://...backend.onrender.com`).
2. En el **frontend**, pon `VITE_API_URL = <esa URL>/api` y despliégalo → anota su URL.
3. Vuelve al **backend** y pon `CORS_ORIGINS = <URL del frontend>`. Redeploy del backend.

---

## Notas
- Los archivos `.env` **no** están en el repo (van en `.gitignore`). Usa `.env.example` como referencia.
- El plan Free de Render "duerme" los servicios tras 15 min de inactividad; el primer request tras dormir tarda ~30 s.
- Para el correo: si cambias de cuenta Gmail, genera una nueva contraseña de aplicación en https://myaccount.google.com/apppasswords
