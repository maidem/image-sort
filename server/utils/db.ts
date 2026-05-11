import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

let db: Database.Database | null = null;

export function useDb(): Database.Database {
  if (db) {
    migrate(db);
    return db;
  }
  const config = useRuntimeConfig();
  const dbPath = resolve(
    process.env.DATABASE_PATH || (config.databasePath as string),
  );
  mkdirSync(dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_image_pairs_category ON image_pairs(category_id);
  `);
  
  // Add sort_order column if it doesn't exist
  try {
    db.prepare("ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0").run();
  } catch {
    // Column already exists
  }
}
