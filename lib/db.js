import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { DEFAULT_TOKENS } from './tokens';

const DATABASE_PATH = resolve(process.cwd(), process.env.DATABASE_PATH ?? './data/app.json');

async function ensureDirectory(filePath) {
  await fs.mkdir(dirname(filePath), { recursive: true });
}

async function readDatabase() {
  try {
    const raw = await fs.readFile(DATABASE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.users || !parsed.posts || !parsed.themes || !parsed.fontFaces) {
      throw new Error('Invalid database shape');
    }
    return parsed;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeDatabase(db) {
  await ensureDirectory(DATABASE_PATH);
  await fs.writeFile(DATABASE_PATH, JSON.stringify(db, null, 2));
}

function sortByCreatedAt(items) {
  return items.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function createClient() {
  async function withDatabase(updater) {
    const db = await readDatabase();
    if (!db) {
      throw new Error('Database file missing');
    }
    const result = await updater(db);
    await writeDatabase(db);
    return result;
  }

  async function findUserByEmailInternal(email) {
    const db = await readDatabase();
    if (!db) {
      return null;
    }
    return db.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  return {
    async listPublishedPosts() {
      const db = await readDatabase();
      if (!db) {
        return [];
      }
      return sortByCreatedAt(db.posts.filter((post) => post.status === 'PUBLISHED'));
    },
    async listAllPosts() {
      const db = await readDatabase();
      if (!db) {
        return [];
      }
      return sortByCreatedAt(db.posts);
    },
    async getPostBySlug(slug) {
      const db = await readDatabase();
      if (!db) {
        return null;
      }
      return db.posts.find((post) => post.slug === slug) ?? null;
    },
    async getPostById(id) {
      const db = await readDatabase();
      if (!db) {
        return null;
      }
      return db.posts.find((post) => post.id === id) ?? null;
    },
    async createPost(input) {
      const now = new Date().toISOString();
      return withDatabase(async (db) => {
        const post = {
          id: randomUUID(),
          authorId: input.authorId,
          title: input.title,
          slug: input.slug,
          content_md: input.content_md,
          status: input.status,
          themeId: input.themeId ?? null,
          createdAt: now,
          updatedAt: now
        };
        db.posts.push(post);
        return post;
      });
    },
    async updatePost(id, updates) {
      return withDatabase(async (db) => {
        const index = db.posts.findIndex((post) => post.id === id);
        if (index === -1) {
          return null;
        }
        const current = db.posts[index];
        const updated = {
          ...current,
          ...updates,
          updatedAt: new Date().toISOString()
        };
        db.posts[index] = updated;
        return updated;
      });
    },
    async getDefaultTheme() {
      const db = await readDatabase();
      if (!db) {
        return null;
      }
      return db.themes.find((theme) => theme.isDefault) ?? null;
    },
    async getThemeById(id) {
      const db = await readDatabase();
      if (!db) {
        return null;
      }
      return db.themes.find((theme) => theme.id === id) ?? null;
    },
    async upsertTheme(theme) {
      return withDatabase(async (db) => {
        const now = new Date().toISOString();
        const existingIndex = theme.id ? db.themes.findIndex((item) => item.id === theme.id) : -1;
        if (existingIndex >= 0) {
          const current = db.themes[existingIndex];
          const updated = {
            ...current,
            ...theme,
            tokens: theme.tokens ?? current.tokens ?? DEFAULT_TOKENS,
            createdAt: current.createdAt ?? now,
            updatedAt: now
          };
          db.themes[existingIndex] = updated;
          if (theme.isDefault) {
            db.themes = db.themes.map((item, index) => ({
              ...item,
              isDefault: index === existingIndex
            }));
          }
          return updated;
        }

        const created = {
          id: theme.id ?? randomUUID(),
          name: theme.name,
          tokens: theme.tokens ?? DEFAULT_TOKENS,
          isDefault: Boolean(theme.isDefault),
          ownerId: theme.ownerId,
          createdAt: now,
          updatedAt: now
        };
        if (theme.isDefault) {
          db.themes = db.themes.map((item) => ({ ...item, isDefault: false }));
        }
        db.themes.push(created);
        return created;
      });
    },
    async findUserByEmail(email) {
      return findUserByEmailInternal(email);
    },
    async verifyPassword(email, password) {
      const user = await findUserByEmailInternal(email);
      if (!user) {
        return null;
      }
      const ok = verifyPasswordHash(user.hash, password);
      return ok ? user : null;
    }
  };
}

function verifyPasswordHash(stored, input) {
  if (typeof stored !== 'string') {
    return false;
  }
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) {
    return false;
  }
  const derived = scryptSync(input, salt, 64);
  const storedBuf = Buffer.from(hash, 'hex');
  if (storedBuf.length !== derived.length) {
    return false;
  }
  return timingSafeEqual(storedBuf, derived);
}

export async function safeDb() {
  try {
    const db = await readDatabase();
    if (!db) {
      return { available: false, reason: 'missing-database' };
    }
    return { available: true, client: createClient() };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { available: false, reason: 'malformed-database', error };
    }
    return { available: false, reason: 'unknown-error', error };
  }
}

export async function initializeDatabaseIfNeeded() {
  const db = await readDatabase();
  if (db) {
    return;
  }
  const initial = {
    users: [],
    posts: [],
    themes: [],
    fontFaces: []
  };
  await writeDatabase(initial);
}
