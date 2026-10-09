import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;
let initialized = false;

const INIT_SQL = [
  `CREATE TABLE IF NOT EXISTS event (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    venue TEXT NOT NULL,
    price INTEGER NOT NULL,
    gate_key TEXT NOT NULL,
    gate_open INTEGER DEFAULT 0 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS members (
    email TEXT PRIMARY KEY NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tickets (
    token TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    contact TEXT NOT NULL,
    method TEXT NOT NULL,
    amount INTEGER NOT NULL,
    issued_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    request_id TEXT NOT NULL,
    cancelled INTEGER DEFAULT 0 NOT NULL,
    entered_at TEXT,
    receipt TEXT,
    checked_by TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS tickets_request_id_unique ON tickets (request_id)`,
];

export async function ensureSchema(c: Client) {
  if (initialized) return;
  try {
    for (const sql of INIT_SQL) {
      await c.execute(sql);
    }

    // Try adding email column if table was created in an older schema
    try {
      await c.execute('ALTER TABLE tickets ADD COLUMN email TEXT');
    } catch {
      // column already exists
    }

    // Insert default event if table is empty
    const ev = await c.execute('SELECT COUNT(*) as cnt FROM event WHERE id=1');
    if (!(ev.rows[0] as any)?.cnt) {
      await c.execute({
        sql: `INSERT INTO event (id, name, date, venue, price, gate_key, gate_open)
              VALUES (1, 'Dandiya Night 2026', '2026-10-24T18:30', 'Royal Celebration Grounds, Main Arena', 49900, ?, 1)
              ON CONFLICT(id) DO NOTHING`,
        args: [crypto.randomUUID()],
      });
    }

    initialized = true;
  } catch (err) {
    console.warn('Schema auto-init notice:', err);
  }
}

export function getDb(): Client {
  if (!client) {
    const url =
      process.env.TURSO_DATABASE_URL ||
      process.env.LIBSQL_URL ||
      process.env.DATABASE_URL ||
      (process.env.NODE_ENV === 'production' ? 'file:/tmp/dandiya.db' : 'file:local.db');

    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN,
    });

    ensureSchema(client).catch((e) => console.error('Failed to init schema:', e));
  }
  return client;
}
