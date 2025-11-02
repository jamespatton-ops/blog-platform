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

// Load environment variables from .env
dotenv.config();

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
// Configure CORS.  When deploying your frontend to Vercel, set
// CORS_ORIGIN to the URL of your Vercel domain.  The CORS docs show
// how to allow all origins or specific origins【328272944528732†L118-L133】.
app.use(
  cors({
    // Allow requests from your frontend.  Use FRONTEND_URL to specify
    // the deployed React/Vite URL (e.g., https://your-app.vercel.app).  Fall
    // back to '*' in development.
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  }),
);
// Parse JSON request bodies
app.use(express.json());

// Rate limiting: limit each IP to 100 requests per 15‑15-minute window.
// The MDN blog demonstrates how to use express‑rate‑limit to protect
// Express apps【983068261390070†L388-L414】.  Adjust the values to meet your
// needs.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});
app.use('/api', apiLimiter);

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

// ---------------------------------------------------------------------
// Authentication Routes
// ---------------------------------------------------------------------

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
