# Writing Portfolio

A minimalist writing portfolio built with Next.js 14. Posts are written in Markdown and rendered to sanitized HTML on the server. A single owner can draft, publish, and theme the site using CSS variables.

## Prerequisites

- Node.js 18+

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   SESSION_SECRET="change-me"
   OWNER_EMAIL="owner@example.com"
   OWNER_PASSWORD="owner-password"
   OWNER_ID="OWNER"
   ```

### Local Development (SQLite)

For local development, the database will automatically use a local SQLite file (`./data/app.db`). The database and seed data are automatically initialized on first request.

### Production (Turso/libSQL)

For Vercel deployment, use Turso (hosted SQLite):

1. **Create a Turso database:**
   ```bash
   turso db create blog-platform
   turso db tokens create blog-platform
   ```

2. **Add environment variables in Vercel:**
   - `LIBSQL_URL` - Your Turso database URL (e.g., `libsql://your-db.turso.io`)
   - `LIBSQL_AUTH_TOKEN` - Your Turso auth token
   - `SESSION_SECRET` - Generate with: `openssl rand -base64 32`
   - `OWNER_EMAIL` - Your owner email
   - `OWNER_PASSWORD` - Your owner password
   - `OWNER_ID` - Your owner ID (e.g., `OWNER`)

3. **Deploy** - The database will automatically initialize on first request.

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
