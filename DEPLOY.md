# Deploy without Prisma

The project ships with a JSON-backed data layer so it can be deployed even when `@prisma/client` and `prisma` are unavailable. The app reads from `DATABASE_PATH` (default `./data/app.json`) and never runs Prisma commands during build.

## Option 1: Local build → deploy

1. Install dependencies and prepare the data file locally:
   ```bash
   npm install
   npm run migrate
   npm run seed
   ```
2. Commit the generated `data/app.json` if you want a snapshot of the seeded state.
3. Deploy to your platform (e.g., Vercel). The app will boot using the committed JSON database.

## Option 2: Remote environment with writable storage

1. Configure the following environment variables:
   - `DATABASE_PATH` (e.g., `/var/data/app.json`)
   - `SESSION_SECRET`
   - `OWNER_EMAIL`, `OWNER_PASSWORD`, `OWNER_ID`
2. Add build steps:
   ```bash
   npm install
   npm run migrate
   npm run seed
   npm run build
   ```
3. Ensure the directory for `DATABASE_PATH` is writable by the runtime. Mount a volume if running in Docker.

## Docker

A simple Docker workflow:

```bash
docker build -t writing-portfolio .
docker run -p 3000:3000 -v $(pwd)/data:/app/data writing-portfolio
```

This mounts the `data` folder so the JSON database persists between runs.
