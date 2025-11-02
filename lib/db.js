import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { query, queryOne, run } from './sql.js';
import { DEFAULT_TOKENS } from './tokens.js';

function sortByCreatedAt(items) {
  return items.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// libSQL returns rows as objects already, but we need to parse JSON fields and convert types
function rowToObject(row) {
  if (!row) return null;
  const obj = { ...row };
  // Parse JSON fields
  if (obj.tokens && typeof obj.tokens === 'string') {
    try {
      obj.tokens = JSON.parse(obj.tokens);
    } catch {
      obj.tokens = DEFAULT_TOKENS;
    }
  }
  // Convert integer to boolean for isDefault
  if (typeof obj.isDefault === 'number') {
    obj.isDefault = Boolean(obj.isDefault);
  }
  return obj;
}

function rowsToObjects(rows) {
  return rows.map(row => rowToObject(row));
}

function createClient() {
  async function findUserByEmailInternal(email) {
    const row = await queryOne(`SELECT * FROM User WHERE email = ? COLLATE NOCASE`, [email]);
    return row ? rowToObject(row) : null;
  }

  return {
    async listPublishedPosts() {
      const rows = await query(`SELECT * FROM Post WHERE status = ? ORDER BY createdAt DESC`, ['PUBLISHED']);
      return rowsToObjects(rows);
    },
    async listAllPosts() {
      const rows = await query(`SELECT * FROM Post ORDER BY createdAt DESC`);
      return rowsToObjects(rows);
    },
    async getPostBySlug(slug) {
      const row = await queryOne(`SELECT * FROM Post WHERE slug = ?`, [slug]);
      return row ? rowToObject(row) : null;
    },
    async getPostById(id) {
      const row = await queryOne(`SELECT * FROM Post WHERE id = ?`, [id]);
      return row ? rowToObject(row) : null;
    },
    async createPost(input) {
      const now = new Date().toISOString();
      const postId = randomUUID();
      await run(
        `INSERT INTO Post(id, authorId, title, slug, content_md, status, themeId, createdAt, updatedAt)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          postId,
          input.authorId,
          input.title,
          input.slug,
          input.content_md,
          input.status,
          input.themeId ?? null,
          now,
          now
        ]
      );
      return this.getPostById(postId);
    },
    async updatePost(id, updates) {
      const existing = await this.getPostById(id);
      if (!existing) {
        return null;
      }
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await run(
        `UPDATE Post SET title = ?, slug = ?, content_md = ?, status = ?, themeId = ?, updatedAt = ?
         WHERE id = ?`,
        [
          updated.title,
          updated.slug,
          updated.content_md,
          updated.status,
          updated.themeId ?? null,
          updated.updatedAt,
          id
        ]
      );
      return this.getPostById(id);
    },
    async getDefaultTheme() {
      const row = await queryOne(`SELECT * FROM Theme WHERE isDefault = 1 LIMIT 1`);
      if (!row) {
        return null;
      }
      const theme = rowToObject(row);
      if (typeof theme.tokens === 'string') {
        try {
          theme.tokens = JSON.parse(theme.tokens);
        } catch {
          theme.tokens = DEFAULT_TOKENS;
        }
      }
      return theme;
    },
    async getThemeById(id) {
      const row = await queryOne(`SELECT * FROM Theme WHERE id = ?`, [id]);
      if (!row) {
        return null;
      }
      const theme = rowToObject(row);
      if (typeof theme.tokens === 'string') {
        try {
          theme.tokens = JSON.parse(theme.tokens);
        } catch {
          theme.tokens = DEFAULT_TOKENS;
        }
      }
      return theme;
    },
    async upsertTheme(theme) {
      const now = new Date().toISOString();
      const tokensJson = JSON.stringify(theme.tokens ?? DEFAULT_TOKENS);
      
      const existing = theme.id ? await this.getThemeById(theme.id) : null;
      
      if (existing) {
        // Update existing theme
        if (theme.isDefault) {
          // Clear other default themes
          await run(`UPDATE Theme SET isDefault = 0 WHERE isDefault = 1`);
        }
        
        await run(
          `UPDATE Theme SET name = ?, tokens = ?, isDefault = ?, updatedAt = ? WHERE id = ?`,
          [
            theme.name,
            tokensJson,
            theme.isDefault ? 1 : 0,
            now,
            theme.id
          ]
        );
        return this.getThemeById(theme.id);
      } else {
        // Create new theme
        const themeId = theme.id ?? randomUUID();
        
        if (theme.isDefault) {
          // Clear other default themes
          await run(`UPDATE Theme SET isDefault = 0 WHERE isDefault = 1`);
        }
        
        await run(
          `INSERT INTO Theme(id, name, tokens, isDefault, ownerId, createdAt, updatedAt)
           VALUES(?, ?, ?, ?, ?, ?, ?)`,
          [
            themeId,
            theme.name,
            tokensJson,
            theme.isDefault ? 1 : 0,
            theme.ownerId,
            now,
            now
          ]
        );
        return this.getThemeById(themeId);
      }
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
    // Test connection by running a simple query
    await query(`SELECT 1`);
    return { available: true, client: createClient() };
  } catch (error) {
    return { available: false, reason: 'database-error', error };
  }
}

export async function initializeDatabaseIfNeeded() {
  // This is now handled by bootstrap.js
  // Keeping for compatibility but it's a no-op
}
