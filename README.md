# Writing Portfolio

A minimalist writing portfolio built with Next.js 14, Prisma, and NextAuth. Posts are written in Markdown and rendered to sanitized HTML on the server. A single owner can draft, publish, and theme the site using CSS variables.

## Prerequisites

- Node.js 18+
- SQLite (bundled with Node)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Apply the initial database migration:
   ```bash
   npx prisma migrate dev --name init
   ```
3. Seed the default owner account and "Plain" theme:
   ```bash
   npx tsx scripts/seed-themes.ts
   ```

Environment defaults are provided in `.env`:

```bash
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="changeme"
OWNER_EMAIL="owner@example.com"
OWNER_PASSWORD="owner-password"
OWNER_ID="OWNER"
```

## Development

Start the development server with:

```bash
npm run dev
```

Open http://localhost:3000 to view the reader experience. The owner can sign in at http://localhost:3000/login with the seeded credentials. Drafts autosave every three seconds from `/write`, and publishing toggles the post status. Markdown is rendered through `remark`/`rehype` with `rehype-sanitize` to prevent unsafe HTML.

## Testing the flow

1. Sign in at `/login` using `owner@example.com` / `owner-password`.
2. Visit `/write`, create a draft, and wait for autosave to finish.
3. Toggle **Publish**, then open the generated slug under `/p/{slug}` to view the sanitized HTML.
4. Adjust the site theme at `/settings/theme` by editing the JSON tokens.

## Deployment

When deploying (e.g., to Vercel), set the same environment variables and migrate the database. If SQLite outgrows local storage, point `DATABASE_URL` to a remote SQLite-compatible provider such as Turso.
