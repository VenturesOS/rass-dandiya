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

    // Auto-initialize tables in background
    ensureSchema(client).catch((e) => console.error('Failed to init schema:', e));
  }
  return client;
}
