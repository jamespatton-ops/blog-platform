# Backend Architecture for the Journaling/Blogging App

## Overview

This project implements a RESTful API for a journaling/blogging application using **Node.js** and **Express**.  It persists data to a **Turso** (libSQL/SQLite) database and exposes endpoints for user authentication, CRUD operations on journal entries, photo uploads, daily prompts, user settings, and writing statistics.  The API is designed to integrate with a React frontend hosted on Vercel and prioritizes security, scalability and clarity.

### Technology stack

- **Express 4.18** web framework for HTTP routing and middleware.
- **@libsql/client** connects to Turso/libSQL.  Queries use positional parameters to prevent SQL injection.  The Turso quick‑start shows how to execute parameterized queries using the `sql` and `args` fields【378334993988428†L188-L208】.
- **SQLite** schema with tables for users, entries, photos, prompts, and user settings.  An additional `password_hash` column stores hashed passwords for authentication.
- **JWT (jsonwebtoken)** for stateless authentication.  A middleware validates the `Authorization` header and attaches the decoded user to the request【8481175050023†L251-L290】.
- **bcrypt** for hashing passwords.
- **Multer** to parse `multipart/form‑data` when uploading images.  Multer adds a `file` or `files` property to the `request` object【802146858807891†L114-L156】.
- **Cloudinary SDK** to store photos.  Environment variables provide the Cloudinary `cloud_name`, `api_key` and `api_secret`.  The Cloudinary docs show how to configure these values【874980728489820†L2187-L2213】 and upload files using `cloudinary.v2.uploader.upload()`【874980728489820†L2293-L2310】.
- **helmet** to set security‑related HTTP headers.
- **cors** to configure allowed origins.  The Express CORS middleware can enable all origins or restrict to specific domains【328272944528732†L118-L133】.
- **express‑rate‑limit** to mitigate abuse.  The MDN blog demonstrates limiting each IP to a maximum number of requests per time window【983068261390070†L383-L414】.

## Database schema

The schema uses SQLite tables with `TEXT` primary keys to store UUIDs:

| Table | Purpose | Key fields |
|------|---------|-----------|
| **users** | Stores user accounts.  Fields: `id` (PK), `email` (unique), `name`, `password_hash`, timestamps. | `id`, `email` |
| **entries** | Journal entries.  Fields: `id` (PK), `user_id`, `title`, `content`, `timestamp`, optional `mood`, JSON‐encoded `tags`, timestamps. | `id`, `user_id` |
| **photos** | Photo metadata.  Fields: `id` (PK), `user_id`, optional `entry_id`, `url`, `alt_text`, timestamp. | `id`, `user_id` |
| **prompts** | Daily writing prompts.  Fields: `id` (PK), `prompt_text`, unique `date`, timestamp. | `date` |
| **user_settings** | Per‑user preferences.  Fields: `user_id` (PK), `theme`, `notifications`, timestamps. | `user_id` |

The repository includes an example migration script (`backend/migrations/2025‑11‑02‑initial.sql`) that creates these tables and indexes.

## Connecting to Turso

The libSQL client is initialized in `db.js` using credentials from the `.env` file.  The Turso quick‑start demonstrates how to connect and execute parameterized queries via `execute()`【378334993988428†L188-L208】.  Use environment variables (`TURSO_DB_URL` and `TURSO_DB_AUTH_TOKEN`) rather than hard‑coding secrets.

### Prepared statements and security

SQL queries must never concatenate untrusted input.  The libSQL client accepts a statement object with a `sql` string and an `args` array.  Placeholders (`?`) are replaced by bound values, which protects against injection.  The Node.js SQLite docs note that prepared statements are more efficient and prevent SQL injection attacks【857700134503029†L892-L900】.  The API uses parameterized queries throughout.

## Authentication

The API implements JWT‑based authentication.  Upon registration the server hashes the user’s password with bcrypt and stores it in the `password_hash` column.  On login it verifies the password and returns a signed JWT containing the user ID.  A middleware (adapted from the Mattermost JWT guide【8481175050023†L251-L290】) checks the `Authorization` header (`Bearer <token>`), verifies the token using the secret from `JWT_SECRET`, and attaches `req.user.userId` to subsequent handlers.  Routes that require authentication apply this middleware.

## API Endpoints

The table below summarizes the main endpoints.  All `/api/*` routes are rate‑limited: each IP is allowed 100 requests per 15‑minute window by default【983068261390070†L383-L414】.

| Method & path | Description |
|--------------|------------|
| **POST** `/api/auth/register` | Register a new user (email, name, password).  Checks if the email already exists, hashes the password, and inserts the record using a parameterized query. |
| **POST** `/api/auth/login` | Authenticate a user.  Verifies credentials and returns a JWT. |
| **GET** `/api/entries` | Return the authenticated user’s entries with pagination (`page`, `limit`). |
| **GET** `/api/entries/:id` | Fetch a single entry by ID for the current user. |
| **POST** `/api/entries` | Create a new entry.  Accepts `title`, `content`, optional `mood` and `tags` array.  Stores tags as JSON. |
| **PUT** `/api/entries/:id` | Update an existing entry.  Only fields present in the body are changed; missing fields retain their previous values. |
| **DELETE** `/api/entries/:id` | Delete an entry. |
| **GET** `/api/entries/search?q=…` | Search the user’s entries by `title`, `content` or `tags` using `LIKE` with wildcards.  For large datasets, consider adding an FTS5 virtual table to support full‑text search【545149127308877†L190-L205】. |
| **GET** `/api/photos` | Return all photos belonging to the authenticated user. |
| **POST** `/api/photos` | Upload a photo.  Uses Multer’s in‑memory storage to parse the multipart body【802146858807891†L114-L156】 and streams the buffer to Cloudinary.  The uploaded asset’s secure URL is stored in the `photos` table.  The Cloudinary SDK requires configuration values and supports the upload API【874980728489820†L2187-L2213】【874980728489820†L2293-L2310】. |
| **DELETE** `/api/photos/:id` | Delete a photo record.  Note: the Cloudinary asset itself is not deleted; call Cloudinary’s admin API if needed. |
| **GET** `/api/prompts/today` | Retrieve the prompt whose `date` matches the current UTC date. |
| **GET** `/api/prompts/:date` | Retrieve the prompt for a specific date (`YYYY‑MM‑DD`). |
| **GET** `/api/user/stats` | Compute statistics: total entries and a writing streak (number of consecutive days up to today that have at least one entry). |
| **GET** `/api/user/settings` | Fetch the current user’s theme and notification preferences.  Returns defaults if no settings are stored. |
| **PUT** `/api/user/settings` | Update user settings.  Uses an upsert to insert or update the `user_settings` record. |

### Error handling

The API defines a centralized error‑handling middleware at the end of the middleware chain.  According to the Express documentation, error handlers must accept four arguments and should be defined after all route handlers【60238914381653†L232-L239】.  The custom handler logs the error and returns an `Internal server error` response unless headers have already been sent.  A 404 handler catches unmatched routes.

## Photo upload and Cloudinary integration

To handle photo uploads, the server uses Multer’s `memoryStorage()`, which parses incoming `multipart/form‑data` and stores uploaded files in memory【802146858807891†L114-L156】.  The uploaded buffer is then streamed to Cloudinary using `cloudinary.uploader.upload_stream()`.  Cloudinary credentials are provided via environment variables (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`), and the SDK is configured accordingly【874980728489820†L2187-L2213】.  After the upload completes, the resulting `secure_url` is stored in the `photos` table along with optional `alt_text` and an associated `entry_id`.

## Security features

1. **Parameterization** – All queries use placeholders rather than string concatenation.  The Node.js SQLite API notes that prepared statements prevent SQL injection and are more efficient【857700134503029†L892-L900】.
2. **Authentication** – JWT tokens are signed with a secret loaded from the environment.  The authentication middleware checks the presence and validity of the token and attaches the decoded user to the request【8481175050023†L251-L290】.
3. **Password hashing** – Passwords are never stored in plain text; bcrypt produces salted hashes.
4. **Rate limiting** – The API uses express‑rate‑limit to throttle requests.  A rate limiter configured at 100 requests per 15 minutes per IP denies additional requests with HTTP 429, as demonstrated in the MDN example【983068261390070†L383-L414】.
5. **CORS** – The Express CORS middleware is configured with an `origin` option.  To restrict requests to your Vercel front‑end, set `CORS_ORIGIN` to the exact origin.  The docs show that calling `app.use(cors())` will enable all origins【328272944528732†L118-L133】.
6. **Helmet** – Helmet sets various HTTP headers to mitigate common web vulnerabilities (XSS, clickjacking, etc.).
7. **Error handling** – A centralized error handler returns JSON errors and prevents unhandled exceptions from crashing the server【60238914381653†L232-L239】.

## Deployment and environment

1. **Environment variables** – Copy `.env.example` to `.env` and fill in the Turso URL and auth token, JWT secret, Cloudinary credentials, CORS origin, and desired port.  Never commit secrets to version control.
2. **Install dependencies** – Run `npm install` in the `backend` directory.  The `package.json` lists all required libraries.
3. **Database migrations** – Execute the SQL in `migrations/2025‑11‑02‑initial.sql` on your Turso database.  This creates all tables and indexes.
4. **Running the server** – Use `npm start` to start the API on the port specified in `.env` (`3001` by default).  In development you can use `nodemon` (`npm run dev`) to reload on file changes.
5. **Vercel integration** – When deploying the front‑end to Vercel, ensure the backend API is reachable via a full URL (e.g., `https://api.example.com`).  Configure the `CORS_ORIGIN` environment variable to the Vercel domain to prevent cross‑origin issues.

## Future enhancements

- **Full‑text search** – For more sophisticated search, create an FTS5 virtual table and sync it with the `entries` table.  The SQLite FTS5 extension supports full‑text queries and can index multiple columns【545149127308877†L190-L205】.
- **Refresh tokens** – Implement refresh tokens to allow long‑lived sessions while maintaining short‑lived access tokens, as described in JWT best practices.  The Mattermost guide explains generating refresh tokens and storing them securely【8481175050023†L346-L384】.
- **Cloudinary cleanup** – When a photo is deleted, call `cloudinary.api.delete_resources([public_id])` to remove the asset from storage.
- **Testing and validation** – Use libraries such as Joi or Zod to validate request payloads.  Add unit and integration tests for all endpoints.

## Conclusion

The provided backend delivers a complete API for a journaling/blogging application.  It uses modern Node.js practices—parameterized database queries, JWT authentication, hashed passwords, file uploads via Multer, and media storage via Cloudinary.  It implements rate limiting, CORS configuration, and robust error handling.  With proper environment configuration and database migrations, the API is ready to support the Vercel‑hosted React frontend.