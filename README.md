# Plain Journal

A minimalist journaling blog built with Next.js 14, Prisma, and NextAuth. Entries are written in Markdown, rendered to sanitized HTML on the server, and presented in a calm, typographic layout that can be tuned through theme tokens.

## Features

- Credentials-based authentication for the single owner account.
- Focused writing surface with autosave, publish toggle, live Markdown preview, and unsaved changes guard.
- Per-post theme overrides backed by a JSON token system with instant preview.
- Self-hosted font registration with automatic `@font-face` injection.
- Sanitized Markdown pipeline (`remark` → `remark-gfm` → `rehype` → `rehype-sanitize`).
- Timeline homepage grouped by month for published entries.

## Prerequisites

- Node.js 18+

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Apply the initial Prisma migration (creates `./prisma/dev.db` by default):

   ```bash
   npm run migrate:dev
   ```

   For CI/production use `npm run migrate`.

3. Seed the owner account and default theme:

   ```bash
   npm run seed
   ```

   The seeded credentials are `owner@example.com` with password `password123`.

4. Start the development server:

   ```bash
   npm run dev
   ```

   Visit http://localhost:3000 for the public view and http://localhost:3000/login to sign in.

## Theme tokens

Each theme stores the following JSON structure:

```json
{
  "fonts": {
    "sans": "",
    "serif": "",
    "mono": "",
    "body": "",
    "headings": "",
    "code": "",
    "opticalSizing": true,
    "liga": true
  },
  "type": {
    "basePx": 18,
    "leading": 1.5,
    "maxCh": 72,
    "hScale": 1.2,
    "paraSpace": 0.6
  },
  "colors": {
    "light": { "bg": "", "text": "", "muted": "", "accent": "" },
    "dark": { "bg": "", "text": "", "muted": "", "accent": "" },
    "hc": { "bg": "", "text": "", "muted": "", "accent": "" }
  },
  "links": {
    "underline": true,
    "offset": 3,
    "thickness": 1
  },
  "rules": {
    "hyphens": "manual",
    "orphans": 2,
    "widows": 2
  }
}
```

Editing a theme at `/settings/theme` updates the `:root` CSS variables live so you can tune typography and color without reloading. Registered fonts are exposed via `@font-face` and can be referenced in the token JSON.

## Environment

The app reads configuration from `.env` (see `.env` in the repository for defaults):

- `DATABASE_URL` – SQLite connection string (`file:./prisma/dev.db`).
- `NEXTAUTH_SECRET` – secret for NextAuth JWTs.
- `NEXTAUTH_URL` – base URL for authentication callbacks.
- `OWNER_EMAIL`, `OWNER_PASSWORD`, `OWNER_ID` – seed data for the owner account.

## Useful commands

- `npm run migrate` – apply pending migrations (deploy).
- `npm run migrate:dev` – apply migrations in development with prompts.
- `npm run prisma:generate` – regenerate the Prisma client.
- `npm run seed` – seed the default owner and theme.
- `npm run build` / `npm run start` – production build and run.

## Security

- Markdown rendering is sanitized to prevent unsafe HTML injection.
- All write/edit/settings routes are protected by NextAuth middleware.
- Uploaded fonts are stored under `public/fonts/` and referenced by the stored URL.
