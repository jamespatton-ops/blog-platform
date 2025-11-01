# Deployment

The journaling blog uses Prisma with SQLite and NextAuth. Deployment requires running Prisma migrations and the seed script before starting the server.

## Environment variables

Set the following variables in your hosting provider:

- `DATABASE_URL` – e.g. `file:./prisma/dev.db` or a platform-specific SQLite path.
- `NEXTAUTH_SECRET` – a long random string for JWT signing.
- `NEXTAUTH_URL` – the canonical site URL.
- `OWNER_EMAIL`, `OWNER_PASSWORD`, `OWNER_ID` – credentials for the owner account seed.

## Build steps

1. Install dependencies:

   ```bash
   npm install
   ```

2. Apply database migrations:

   ```bash
   npm run migrate
   ```

3. Seed the owner account and default theme:

   ```bash
   npm run seed
   ```

4. Build the app:

   ```bash
   npm run build
   ```

5. Start the production server:

   ```bash
   npm run start
   ```

## SQLite considerations

- Ensure the directory that contains `prisma/dev.db` is writable by the runtime.
- For containerized deployments mount a volume for the `prisma` directory if you need persistence.
- When using read-only builds (e.g. Vercel), run migrations and seed during the build step so the generated database file is available at runtime.
