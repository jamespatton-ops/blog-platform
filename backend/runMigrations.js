import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import turso from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, 'migrations');
const MIGRATIONS_TABLE = 'migrations_log';

async function ensureMigrationsTable() {
  try {
    await turso.execute(
      `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (name TEXT PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    );
  } catch (error) {
    console.error('Failed to ensure migrations table exists:', error);
    throw error;
  }
}

async function hasRunMigration(name) {
  const result = await turso.execute({
    sql: `SELECT 1 FROM ${MIGRATIONS_TABLE} WHERE name = ? LIMIT 1`,
    args: [name],
  });
  return result.rows.length > 0;
}

async function markMigrationComplete(name) {
  await turso.execute({
    sql: `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`,
    args: [name],
  });
}

function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function runMigrations() {
  try {
    await ensureMigrationsTable();
  } catch (error) {
    console.error('Unable to create migrations log table. Skipping migrations.');
    return;
  }

  let files = [];
  try {
    files = await fs.readdir(migrationsDir);
  } catch (error) {
    console.error('Unable to read migrations directory:', error);
    return;
  }

  const sqlFiles = files.filter((file) => file.endsWith('.sql')).sort();

  for (const file of sqlFiles) {
    try {
      const alreadyRan = await hasRunMigration(file);
      if (alreadyRan) {
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf-8');
      const statements = splitStatements(sql);
      let allStatementsSucceeded = true;

      for (const statement of statements) {
        try {
          await turso.execute(statement);
        } catch (error) {
          allStatementsSucceeded = false;
          console.error(`Failed to execute statement from migration ${file}:`, error);
        }
      }

      if (allStatementsSucceeded) {
        await markMigrationComplete(file);
        console.log(`Migration applied: ${file}`);
      } else {
        console.error(`Migration ${file} did not complete successfully. It will be retried on next startup.`);
      }
    } catch (error) {
      console.error(`Unexpected error while applying migration ${file}:`, error);
    }
  }
}

export default runMigrations;
