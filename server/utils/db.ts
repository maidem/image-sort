import postgres from "postgres";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

type Row = Record<string, unknown>;

export type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<Row[]>;
  begin(fn: (sql: SqlClient) => Promise<unknown>): Promise<void>;
};

let _client: SqlClient | null = null;

function buildSqliteClient(): SqlClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BetterSqlite3 = _require("better-sqlite3");

  const dbPath = resolve(
    process.env.DATABASE_PATH ||
      (useRuntimeConfig().databasePath as string) ||
      "./data/app.db",
  );
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new BetterSqlite3(dbPath) as import("better-sqlite3").Database;
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Migrate existing databases
  try {
    db.exec(`ALTER TABLE image_pairs ADD COLUMN sort_order INTEGER DEFAULT 0`);
  } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS image_pairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      original_filename TEXT,
      painted_filename TEXT,
      description TEXT,
      painted_at TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_image_pairs_category ON image_pairs(category_id);
  `);

  function tag(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Row[]> {
    const text = strings
      .reduce((acc, str, i) => acc + str + (i < values.length ? "?" : ""), "")
      .trim();
    try {
      const stmt = db.prepare(text);
      // SELECT or INSERT/UPDATE/DELETE … RETURNING → returns rows
      if (stmt.reader) {
        return Promise.resolve(stmt.all(...(values as any[])) as Row[]);
      }
      // Plain write statement → use run(), return empty array
      stmt.run(...(values as any[]));
      return Promise.resolve([]);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  const client = tag as SqlClient;
  // SQLite: run serially without a real transaction (acceptable in dev)
  client.begin = async (fn) => {
    await fn(client);
  };
  return client;
}

export function useDb(): SqlClient {
  if (_client) return _client;

  if (process.env.DATABASE_URL) {
    const pg = postgres(process.env.DATABASE_URL, {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10,
    });
    _client = pg as unknown as SqlClient;
  } else {
    _client = buildSqliteClient();
  }

  return _client;
}

export async function runMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    useDb(); // SQLite: migrations run inside buildSqliteClient
    return;
  }

  const sql = useDb();

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS image_pairs (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      original_filename TEXT,
      painted_filename TEXT,
      description TEXT,
      painted_at TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE image_pairs ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_image_pairs_category ON image_pairs(category_id)
  `;
}
