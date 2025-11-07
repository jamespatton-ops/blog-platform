import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

import turso from './db.js';
import runMigrations from './runMigrations.js';

// Load environment variables from .env
dotenv.config();

await runMigrations();

// Configure Cloudinary credentials.  These values should be set in
// your environment and never checked into version control.  See
// https://cloudinary.com/documentation/node_integration for details
// on using the Node.js SDK and the required environment variables.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

// Security middlewares
app.use(helmet());
// Configure CORS to trust the deployed frontend URL. Fall back to
// wildcard origins only when running in development mode.
const isDevelopment = process.env.NODE_ENV !== 'production';
const configuredFrontendUrl = process.env.FRONTEND_URL;
if (!configuredFrontendUrl && !isDevelopment) {
  console.warn('FRONTEND_URL is not configured. CORS requests may be rejected in production.');
}
app.use(
  cors({
    origin: isDevelopment ? '*' : configuredFrontendUrl,
    credentials: true,
  }),
);
// Parse JSON request bodies
app.use(express.json());

// Rate limiting: limit each IP to 100 POST requests per 15-minute window.
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api', (req, res, next) => {
  if (req.method === 'POST') {
    return postLimiter(req, res, next);
  }
  return next();
});

// Multer configuration for handling photo uploads.  Here we use
// in‑memory storage so that uploaded files reside in memory until
// uploaded to Cloudinary.  Multer will add a `file` property to
// `req`, which contains the binary buffer【802146858807891†L114-L156】.
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Authentication middleware.  Verifies the JWT included in the
 * Authorization header.  Tokens use the Bearer schema.
 * Example from Mattermost: the middleware checks for an
 * Authorization header, extracts the token, verifies it using
 * jwt.verify() with your secret, and attaches the decoded user
 * information to the request【8481175050023†L251-L290】.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Missing access token' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // Attach the user ID to the request for downstream handlers
    req.user = user;
    next();
  });
}

/**
 * Helper: compute the current date (YYYY-MM-DD) in UTC.  Prompts
 * table stores dates as DATE strings without time.
 */
function getCurrentDate() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function serializeTags(tags) {
  if (!tags) {
    return null;
  }
  if (Array.isArray(tags)) {
    return JSON.stringify(tags);
  }
  if (typeof tags === 'string') {
    return tags;
  }
  return JSON.stringify(tags);
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

// ---------------------------------------------------------------------
// Authentication Routes
// ---------------------------------------------------------------------

app.get('/api/health', async (req, res) => {
  try {
    const result = await turso.execute('SELECT 1 as ok');
    const databaseStatus = result.rows.length > 0 ? 'Connected' : 'Unavailable';
    res.json({ status: 'OK', database: databaseStatus, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'ERROR', database: 'Unavailable', timestamp: new Date().toISOString() });
  }
});

/**
 * Register a new user.
 * Body: { email, name, password }
 * Returns 201 on success.
 */
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name and password are required' });
    }
    // Check if user exists
    const existing = await turso.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] });
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    // Insert new user.  Use parameterized query to avoid injection【378334993988428†L195-L208】.
    await turso.execute({
      sql: 'INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)',
      args: [id, email, name, passwordHash],
    });
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
  next(err);
  }
});

/**
 * Login.  Returns JWT on success.
 * Body: { email, password }
 */
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await turso.execute({
      sql: 'SELECT id, password_hash FROM users WHERE email = ?',
      args: [email],
    });
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// Entries Routes
// ---------------------------------------------------------------------

/**
 * Get all entries for the authenticated user with optional pagination.
 * Query params: page (default 1), limit (default 20)
 */
app.get('/api/entries', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const result = await turso.execute({
      sql: 'SELECT * FROM entries WHERE user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      args: [req.user.userId, limit, offset],
    });
    res.json({ entries: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * Get a specific entry by ID.
 */
app.get('/api/entries/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await turso.execute({
      sql: 'SELECT * FROM entries WHERE id = ? AND user_id = ?',
      args: [id, req.user.userId],
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * Create a new entry.
 * Body: { title, content, mood, tags (array) }
 */
app.post('/api/entries', authenticateToken, async (req, res, next) => {
  try {
    const { title, content, mood, tags } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    const tagsJson = tags ? JSON.stringify(tags) : null;
    await turso.execute({
      sql: 'INSERT INTO entries (id, user_id, title, content, timestamp, mood, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, req.user.userId, title, content, timestamp, mood || null, tagsJson],
    });
    res.status(201).json({ id, message: 'Entry created' });
  } catch (err) {
    next(err);
  }
});

/**
 * Update an existing entry.
 */
app.put('/api/entries/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, mood, tags } = req.body;
    // Only update fields if provided
    const existing = await turso.execute({
      sql: 'SELECT * FROM entries WHERE id = ? AND user_id = ?',
      args: [id, req.user.userId],
    });
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    const entry = existing.rows[0];
    const updatedTitle = title || entry.title;
    const updatedContent = content || entry.content;
    const updatedMood = mood !== undefined ? mood : entry.mood;
    const updatedTags = tags ? JSON.stringify(tags) : entry.tags;
    await turso.execute({
      sql: 'UPDATE entries SET title = ?, content = ?, mood = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      args: [updatedTitle, updatedContent, updatedMood, updatedTags, id, req.user.userId],
    });
    res.json({ message: 'Entry updated' });
  } catch (err) {
    next(err);
  }
});

/**
 * Delete an entry.
 */
app.delete('/api/entries/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await turso.execute({
      sql: 'DELETE FROM entries WHERE id = ? AND user_id = ?',
      args: [id, req.user.userId],
    });
    if (result.rowsAffected === 0 || result.changes === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    next(err);
  }
});

/**
 * Search entries.
 * Query: q (search term)
 */
app.get('/api/entries/search', authenticateToken, async (req, res, next) => {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    // Use LIKE with wildcards.  Build parameters to avoid SQL injection.
    const like = `%${q}%`;
    const result = await turso.execute({
      sql:
        'SELECT * FROM entries WHERE user_id = ? AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)',
      args: [req.user.userId, like, like, like],
    });
    res.json({ entries: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// Media Tracking Routes
// ---------------------------------------------------------------------

app.get('/api/music', authenticateToken, async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: 'SELECT * FROM music WHERE user_id = ? ORDER BY created_at DESC',
      args: [req.user.userId],
    });
    const music = result.rows.map((row) => ({
      ...row,
      tags: parseMaybeJson(row.tags),
    }));
    res.json({ music });
  } catch (err) {
    next(err);
  }
});

app.post('/api/music', authenticateToken, async (req, res, next) => {
  try {
    const { title, artist, album, cover_url, spotify_id, rating, review, listen_date, tags } = req.body;
    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }

    let normalizedRating = null;
    if (rating !== undefined && rating !== null && rating !== '') {
      normalizedRating = Number(rating);
      if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
      }
    }

    const id = uuidv4();
    await turso.execute({
      sql:
        'INSERT INTO music (id, user_id, title, artist, album, cover_url, spotify_id, rating, review, listen_date, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        id,
        req.user.userId,
        title,
        artist,
        album || null,
        cover_url || null,
        spotify_id || null,
        normalizedRating,
        review || null,
        listen_date || null,
        serializeTags(tags),
      ],
    });

    res.status(201).json({
      id,
      music: {
        id,
        user_id: req.user.userId,
        title,
        artist,
        album: album || null,
        cover_url: cover_url || null,
        spotify_id: spotify_id || null,
        rating: normalizedRating,
        review: review || null,
        listen_date: listen_date || null,
        tags,
      },
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/movies', authenticateToken, async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: 'SELECT * FROM movies WHERE user_id = ? ORDER BY created_at DESC',
      args: [req.user.userId],
    });
    const movies = result.rows.map((row) => ({
      ...row,
      tags: parseMaybeJson(row.tags),
    }));
    res.json({ movies });
  } catch (err) {
    next(err);
  }
});

app.post('/api/movies', authenticateToken, async (req, res, next) => {
  try {
    const { title, year, director, cover_url, imdb_id, rating, review, watch_date, tags } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let normalizedRating = null;
    if (rating !== undefined && rating !== null && rating !== '') {
      normalizedRating = Number(rating);
      if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
      }
    }

    const id = uuidv4();
    await turso.execute({
      sql:
        'INSERT INTO movies (id, user_id, title, year, director, cover_url, imdb_id, rating, review, watch_date, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        id,
        req.user.userId,
        title,
        year || null,
        director || null,
        cover_url || null,
        imdb_id || null,
        normalizedRating,
        review || null,
        watch_date || null,
        serializeTags(tags),
      ],
    });

    res.status(201).json({
      id,
      movie: {
        id,
        user_id: req.user.userId,
        title,
        year: year || null,
        director: director || null,
        cover_url: cover_url || null,
        imdb_id: imdb_id || null,
        rating: normalizedRating,
        review: review || null,
        watch_date: watch_date || null,
        tags,
      },
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/books', authenticateToken, async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: 'SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC',
      args: [req.user.userId],
    });
    const books = result.rows.map((row) => ({
      ...row,
      tags: parseMaybeJson(row.tags),
    }));
    res.json({ books });
  } catch (err) {
    next(err);
  }
});

app.post('/api/books', authenticateToken, async (req, res, next) => {
  try {
    const { title, author, cover_url, isbn, rating, review, status, start_date, end_date, tags } = req.body;
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    let normalizedRating = null;
    if (rating !== undefined && rating !== null && rating !== '') {
      normalizedRating = Number(rating);
      if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
      }
    }

    const id = uuidv4();
    await turso.execute({
      sql:
        "INSERT INTO books (id, user_id, title, author, cover_url, isbn, rating, review, status, start_date, end_date, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'want_to_read'), ?, ?, ?)",
      args: [
        id,
        req.user.userId,
        title,
        author,
        cover_url || null,
        isbn || null,
        normalizedRating,
        review || null,
        status || null,
        start_date || null,
        end_date || null,
        serializeTags(tags),
      ],
    });

    res.status(201).json({
      id,
      book: {
        id,
        user_id: req.user.userId,
        title,
        author,
        cover_url: cover_url || null,
        isbn: isbn || null,
        rating: normalizedRating,
        review: review || null,
        status: status || 'want_to_read',
        start_date: start_date || null,
        end_date: end_date || null,
        tags,
      },
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/themes', async (req, res, next) => {
  try {
    const publicResult = await turso.execute({
      sql: 'SELECT * FROM themes WHERE is_public = 1 ORDER BY created_at DESC',
    });
    const publicThemes = publicResult.rows.map((row) => ({
      ...row,
      colors: parseMaybeJson(row.colors),
      fonts: parseMaybeJson(row.fonts),
      animations: parseMaybeJson(row.animations),
    }));

    let personalThemes = [];
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const personalResult = await turso.execute({
            sql: 'SELECT * FROM themes WHERE user_id = ? ORDER BY created_at DESC',
            args: [decoded.userId],
          });
          personalThemes = personalResult.rows.map((row) => ({
            ...row,
            colors: parseMaybeJson(row.colors),
            fonts: parseMaybeJson(row.fonts),
            animations: parseMaybeJson(row.animations),
          }));
        } catch (error) {
          console.warn('Invalid token supplied to /api/themes:', error.message);
        }
      }
    }

    res.json({ public: publicThemes, personal: personalThemes });
  } catch (err) {
    next(err);
  }
});

app.post('/api/themes', authenticateToken, async (req, res, next) => {
  try {
    const { name, is_public, colors, fonts, spacing_scale, borderRadius, animations } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!colors) {
      return res.status(400).json({ error: 'Colors are required' });
    }

    const id = uuidv4();
    const serializedColors = typeof colors === 'string' ? colors : JSON.stringify(colors);
    const serializedFonts = fonts ? (typeof fonts === 'string' ? fonts : JSON.stringify(fonts)) : null;
    const serializedAnimations = animations
      ? typeof animations === 'string'
        ? animations
        : JSON.stringify(animations)
      : null;

    await turso.execute({
      sql:
        'INSERT INTO themes (id, user_id, name, is_public, colors, fonts, spacing_scale, borderRadius, animations) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        id,
        req.user.userId,
        name,
        !!is_public,
        serializedColors,
        serializedFonts,
        spacing_scale || '1.2',
        borderRadius || '8px',
        serializedAnimations,
      ],
    });

    res.status(201).json({
      id,
      theme: {
        id,
        user_id: req.user.userId,
        name,
        is_public: !!is_public,
        colors,
        fonts: fonts || null,
        spacing_scale: spacing_scale || '1.2',
        borderRadius: borderRadius || '8px',
        animations: animations || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// Photo Routes
// ---------------------------------------------------------------------

/**
 * Get all photos for the authenticated user.
 */
app.get('/api/photos', authenticateToken, async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: 'SELECT * FROM photos WHERE user_id = ?',
      args: [req.user.userId],
    });
    res.json({ photos: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * Upload/associate a photo.  The request must include a multipart/form-data
 * body with the field name `photo`.  Optionally include `entryId` and
 * `altText` in the body.  The image will be uploaded to Cloudinary
 * using the Node.js SDK【874980728489820†L2187-L2213】 and the returned URL will be
 * stored in the photos table.
 */
app.post(
  '/api/photos',
  authenticateToken,
  upload.single('photo'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No photo uploaded' });
      }
      const entryId = req.body.entryId || null;
      const altText = req.body.altText || null;
      // Upload the image buffer to Cloudinary.  We return a promise to
      // await the upload result.  When you call `cloudinary.v2.uploader.upload`,
      // you can specify options like public_id and resource_type【874980728489820†L2293-L2310】.
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'image' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );
        stream.end(req.file.buffer);
      });
      const photoId = uuidv4();
      await turso.execute({
        sql: 'INSERT INTO photos (id, user_id, entry_id, url, alt_text) VALUES (?, ?, ?, ?, ?)',
        args: [photoId, req.user.userId, entryId, uploadResult.secure_url, altText],
      });
      res.status(201).json({ id: photoId, url: uploadResult.secure_url });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Delete a photo by ID.  Note that this only deletes the reference in
 * the database.  If you want to remove the asset from Cloudinary as
 * well, call cloudinary.api.delete_resources() or similar.
 */
app.delete('/api/photos/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await turso.execute({
      sql: 'DELETE FROM photos WHERE id = ? AND user_id = ?',
      args: [id, req.user.userId],
    });
    if (result.rowsAffected === 0 || result.changes === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// Prompts Routes
// ---------------------------------------------------------------------

/**
 * Get today's prompt.  The date is determined in UTC and matched against
 * the prompts table on the date column.
 */
app.get('/api/prompts/today', async (req, res, next) => {
  try {
    const today = getCurrentDate();
    const result = await turso.execute({
      sql: 'SELECT * FROM prompts WHERE date = ?',
      args: [today],
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No prompt found for today' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * Get a prompt for a specific date (YYYY-MM-DD)
 */
app.get('/api/prompts/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    const result = await turso.execute({
      sql: 'SELECT * FROM prompts WHERE date = ?',
      args: [date],
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// User & Stats Routes
// ---------------------------------------------------------------------

/**
 * Get user statistics such as total number of entries and writing streak.
 * Streak is computed as the number of consecutive days up to today where the
 * user wrote at least one entry.
 */
app.get('/api/user/stats', authenticateToken, async (req, res, next) => {
  try {
    // Count total entries
    const countResult = await turso.execute({
      sql: 'SELECT COUNT(*) as count FROM entries WHERE user_id = ?',
      args: [req.user.userId],
    });
    const totalEntries = countResult.rows[0].count;
    // Fetch distinct dates for entries
    const datesResult = await turso.execute({
      sql: 'SELECT DATE(timestamp) as date FROM entries WHERE user_id = ? GROUP BY DATE(timestamp)',
      args: [req.user.userId],
    });
    const dates = datesResult.rows.map((row) => row.date).sort();
    // Compute streak
    let streak = 0;
    const today = new Date();
    for (let i = 0; ; i++) {
      const checkDate = new Date();
      checkDate.setDate(today.getDate() - i);
      const formatted = checkDate.toISOString().split('T')[0];
      if (dates.includes(formatted)) {
        streak += 1;
      } else {
        // stop at first day with no entry
        break;
      }
    }
    res.json({ totalEntries, streak });
  } catch (err) {
    next(err);
  }
});

/**
 * Get user settings.  If settings do not exist, return defaults.
 */
app.get('/api/user/settings', authenticateToken, async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: 'SELECT theme, notifications FROM user_settings WHERE user_id = ?',
      args: [req.user.userId],
    });
    if (result.rows.length === 0) {
      return res.json({ theme: 'light', notifications: true });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * Update user settings.  Body can include { theme, notifications }.
 */
app.put('/api/user/settings', authenticateToken, async (req, res, next) => {
  try {
    const { theme, notifications } = req.body;
    // Upsert settings: update if exists, insert otherwise.
    const existing = await turso.execute({
      sql: 'SELECT user_id FROM user_settings WHERE user_id = ?',
      args: [req.user.userId],
    });
    if (existing.rows.length === 0) {
      await turso.execute({
        sql: 'INSERT INTO user_settings (user_id, theme, notifications) VALUES (?, ?, ?)',
        args: [req.user.userId, theme || 'light', notifications !== undefined ? !!notifications : true],
      });
    } else {
      await turso.execute({
        sql: 'UPDATE user_settings SET theme = COALESCE(?, theme), notifications = COALESCE(?, notifications), updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        args: [theme, notifications !== undefined ? !!notifications : null, req.user.userId],
      });
    }
    res.json({ message: 'Settings updated' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// Error Handling Middleware
// ---------------------------------------------------------------------

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler.  Express allows defining an
// error‑handling middleware with four parameters【60238914381653†L232-L239】.
app.use((err, req, res, next) => {
  console.error(err);
  // If headers are already sent, delegate to the default error handler
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Journal app backend listening on port ${port}`);
});

// Export the Express app for frameworks like Vercel.  When running
// locally (via `node server.js`), the above `listen` call will still
// start the server.  Vercel will import this file and use the default
// export instead of calling `listen`.
export default app;
