import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize and export the database client.  The URL and auth token
// come from the environment.  See the Turso docs for details on
// retrieving these values.  Placeholder values are provided in
// `.env.example`.
const turso = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_AUTH_TOKEN,
});

export default turso;
