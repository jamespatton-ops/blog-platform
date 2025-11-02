import { run, queryOne } from './sql.js';
import { DEFAULT_TOKENS } from './tokens.js';

let booted = false;

const OWNER_ID = process.env.OWNER_ID || 'OWNER';
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'owner@example.com';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'owner-password';

function hashPassword(password) {
  const { randomBytes, scryptSync } = require('crypto');
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export async function ensureBootstrapped() {
  if (booted) return;

  // Create tables
  await run(`CREATE TABLE IF NOT EXISTS User(
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hash TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS Theme(
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    tokens TEXT NOT NULL,
    isDefault INTEGER NOT NULL DEFAULT 0,
    ownerId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS Post(
    id TEXT PRIMARY KEY,
    authorId TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content_md TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN('DRAFT','PUBLISHED')),
    themeId TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS FontFace(
    id TEXT PRIMARY KEY,
    family TEXT NOT NULL,
    style TEXT NOT NULL DEFAULT 'normal',
    weightMin INTEGER NOT NULL DEFAULT 100,
    weightMax INTEGER NOT NULL DEFAULT 900,
    srcUrl TEXT NOT NULL,
    display TEXT NOT NULL DEFAULT 'swap',
    ownerId TEXT NOT NULL
  )`);

  // Check if owner exists
  const existingOwner = await queryOne(`SELECT id FROM User WHERE id = ?`, [OWNER_ID]);
  
  if (!existingOwner) {
    const hashed = hashPassword(OWNER_PASSWORD);
    await run(`INSERT INTO User(id, email, hash) VALUES(?, ?, ?)`, [OWNER_ID, OWNER_EMAIL, hashed]);
  }

  // Check if default theme exists
  const existingTheme = await queryOne(`SELECT id FROM Theme WHERE isDefault = 1`);
  
  if (!existingTheme) {
    const now = new Date().toISOString();
    const themeId = 'THEME_PLAIN';
    const tokensJson = JSON.stringify(DEFAULT_TOKENS);
    
    // Ensure only one default theme
    await run(`UPDATE Theme SET isDefault = 0 WHERE isDefault = 1`);
    
    await run(`INSERT INTO Theme(id, name, tokens, isDefault, ownerId, createdAt, updatedAt)
               VALUES(?, ?, ?, 1, ?, ?, ?)`,
               [themeId, 'Plain', tokensJson, OWNER_ID, now, now]);
  }

  booted = true;
}

