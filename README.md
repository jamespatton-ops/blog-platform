# OOLUME – Personal Digital Space

OOLUME transforms the original journal platform into a personal hub for journaling, media tracking, and theme curation. The monorepo contains an Express backend (`/backend`) powered by Turso/libSQL and a Vite + React frontend (`/frontend`). Both projects target Node.js 18+ runtime environments and are deploy-ready for Vercel.

## Repository layout

```
backend/   Express API, Turso client, migration runner
frontend/  Vite + React app with media dashboards and theming tools
```

## Quickstart

### 1. Backend (Express)

```bash
cd backend
npm install
```

Create a `.env` file with your local secrets:

```
TURSO_DB_URL=libsql://localhost:8080
TURSO_DB_AUTH_TOKEN=local-dev-token
JWT_SECRET=change-me
FRONTEND_URL=http://localhost:5173
```

Run the server. The lightweight migration runner executes every SQL file in `backend/migrations` on startup and keeps a log to ensure idempotency.

```bash
npm start
# Server runs on http://localhost:3001 by default
```

### 2. Frontend (Vite + React)

```bash
cd frontend
npm install
```

Create `frontend/.env.local` (or `.env`) with the backend URL:

```
VITE_API_URL=http://localhost:3001
```

Start Vite:

```bash
npm run dev
# Visit http://localhost:5173
```

### Authentication token

Write operations use bearer JWTs created with the `JWT_SECRET`. Store a token in `localStorage` under the key `ooulume-token` to test POST routes from the UI.

## API overview

| Route | Method | Description |
| --- | --- | --- |
| `/api/health` | GET | Health check with DB connectivity probe |
| `/api/music` | GET / POST | Manage the authenticated user’s music log |
| `/api/movies` | GET / POST | Manage the authenticated user’s movie log |
| `/api/books` | GET / POST | Manage the authenticated user’s bookshelf |
| `/api/themes` | GET | List public themes (optionally returns personal themes when a valid token is supplied) |
| `/api/themes` | POST | Create or publish a theme for the authenticated user |
| `/api/entries` and related routes | Existing journal CRUD endpoints |

All POST routes expect JSON bodies and require a bearer token. Responses use `{ error: "message" }` when requests fail validation or authorization.

## Database migrations

Place SQL files in `backend/migrations`. On server boot, `runMigrations.js` runs any new files inside a transaction-like loop and records completed filenames in `migrations_log`. Each statement is executed individually—errors are logged but do not crash the server. Re-running the server is safe.

## Vercel deployment

Deploy the backend and frontend as separate Vercel projects.

### Backend project (`/backend`)

- Framework preset: **Other** (Node.js)
- Build command: _none_ (Vercel uses `@vercel/node` via `vercel.json`)
- Root directory: `backend`
- Environment variables:
  - `TURSO_DB_URL=libsql://blog-platform-jamespatton-ops.aws-us-east-1.turso.io`
  - `TURSO_DB_AUTH_TOKEN=<your JWT token>`
  - `JWT_SECRET=<random 32+ character string>`
  - `FRONTEND_URL=<frontend production URL>`

### Frontend project (`/frontend`)

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `frontend`
- Environment variables:
  - `VITE_API_URL=<backend production URL>`

After deployment, update `FRONTEND_URL` on the backend project to the generated frontend domain and redeploy to finalize CORS.

## Production smoke tests

Once both deployments are live, run the provided acceptance checks (replace placeholders with real URLs/tokens):

```bash
curl -sS "<BACKEND_URL>/api/health"
TOKEN="<valid JWT for userId default-user>"
curl -sS -H "Authorization: Bearer $TOKEN" "<BACKEND_URL>/api/music"
curl -sS -H "Authorization: Bearer $TOKEN" "<BACKEND_URL>/api/movies"
curl -sS -H "Authorization: Bearer $TOKEN" "<BACKEND_URL>/api/books"
curl -sS "<BACKEND_URL>/api/themes"
```

The frontend deployment should respond with `HTTP 200` when fetched via `curl -I "<FRONTEND_URL>"`.

## Notes

- Never commit secrets—use Vercel project environment variables.
- The frontend reads API URLs from `import.meta.env.VITE_API_URL`.
- Update `ooulume-token` in the browser’s storage to switch between demo accounts while testing POST flows.
