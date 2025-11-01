# Writing Portfolio

A minimalist writing portfolio built with Next.js 14. Posts are written in Markdown and rendered to sanitized HTML on the server. A single owner can draft, publish, and theme the site using CSS variables.

## Prerequisites

- Node.js 18+

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create the local JSON database file:
   ```bash
   npm run migrate
   ```
3. Seed the default owner account and "Plain" theme:
   ```bash
   npm run seed
   ```

Environment defaults are provided in `.env`:

```bash
DATABASE_PATH="./data/app.json"
SESSION_SECRET="change-me"
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

See [DEPLOY.md](./DEPLOY.md) for deployment instructions without Prisma.
