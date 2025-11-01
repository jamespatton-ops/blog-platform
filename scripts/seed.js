#!/usr/bin/env node
const { promises: fs } = require('fs');
const path = require('path');
const { randomUUID, randomBytes, scryptSync } = require('crypto');

const DEFAULT_TOKENS = {
  fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif',
  maxWidthCh: 72,
  baseFontSizePx: 18,
  lineHeight: 1.55,
  textColor: '#0b0b0b',
  backgroundColor: '#ffffff',
  accentColor: '#0f62fe',
  spacingUnit: 1
};

const DEFAULT_THEME_NAME = 'Plain';
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'owner@example.com';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? 'owner-password';
const OWNER_ID = process.env.OWNER_ID ?? 'OWNER';

async function ensureDatabase(databasePath) {
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  try {
    await fs.access(databasePath);
  } catch {
    const initial = { users: [], posts: [], themes: [], fontFaces: [] };
    await fs.writeFile(databasePath, JSON.stringify(initial, null, 2));
  }
}

async function main() {
  const databasePath = path.resolve(process.cwd(), process.env.DATABASE_PATH ?? './data/app.json');
  await ensureDatabase(databasePath);
  const raw = await fs.readFile(databasePath, 'utf8');
  const data = JSON.parse(raw);

  data.users = Array.isArray(data.users) ? data.users : [];
  data.posts = Array.isArray(data.posts) ? data.posts : [];
  data.themes = Array.isArray(data.themes) ? data.themes : [];
  data.fontFaces = Array.isArray(data.fontFaces) ? data.fontFaces : [];

  const ownerEmail = OWNER_EMAIL.toLowerCase();
  let owner = data.users.find((user) => typeof user.email === 'string' && user.email.toLowerCase() === ownerEmail);
  if (!owner) {
    const hashed = hashPassword(OWNER_PASSWORD);
    owner = { id: OWNER_ID || randomUUID(), email: OWNER_EMAIL, hash: hashed };
    data.users.push(owner);
    console.log(`Created owner user for ${OWNER_EMAIL}`);
  }

  const now = new Date().toISOString();
  let theme = data.themes.find((item) => item.ownerId === owner.id && item.isDefault);
  if (!theme) {
    theme = {
      id: randomUUID(),
      name: DEFAULT_THEME_NAME,
      tokens: DEFAULT_TOKENS,
      isDefault: true,
      ownerId: owner.id,
      createdAt: now,
      updatedAt: now
    };
    data.themes = data.themes.map((item) => ({ ...item, isDefault: false }));
    data.themes.push(theme);
    console.log('Created default theme');
  } else {
    theme.tokens = { ...DEFAULT_TOKENS, ...theme.tokens };
    theme.createdAt = theme.createdAt ?? now;
    theme.updatedAt = now;
    theme.isDefault = true;
    data.themes = data.themes.map((item) => ({
      ...item,
      isDefault: item.id === theme.id
    }));
  }

  await fs.writeFile(databasePath, JSON.stringify(data, null, 2));
  console.log('Seed complete');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}
