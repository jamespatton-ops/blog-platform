import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.LIBSQL_URL || 'file:./data/app.db',
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});

export async function query(sql, params = []) {
  const r = await client.execute({ sql, args: params });
  return r.rows;
}

export async function run(sql, params = []) {
  await client.execute({ sql, args: params });
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

