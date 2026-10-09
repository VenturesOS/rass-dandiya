import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("Set TURSO_DATABASE_URL environment variable");
  process.exit(1);
}

const db = createClient({ url, authToken });

const statements = [
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

for (const sql of statements) {
  await db.execute(sql);
  console.log("✓", sql.split("\n")[0].trim());
}
console.log("\nDatabase schema is ready.");
