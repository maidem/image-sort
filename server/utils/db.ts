import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

let db: Database.Database | null = null;

export function useDb(): Database.Database {
  if (db) {
    // Re-run idempotent migrations for hot-reload/deploy safety.
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
    CREATE TABLE IF NOT EXISTS trainers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      pin_hash TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#a3e635',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_trainers (
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
      PRIMARY KEY (group_id, trainer_id)
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      title TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(year, month)
    );

    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
      location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
      trainer_id INTEGER REFERENCES trainers(id) ON DELETE SET NULL,
      note TEXT,
      checked_in_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS slot_trainers (
      slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
      trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
      PRIMARY KEY (slot_id, trainer_id)
    );

    CREATE TABLE IF NOT EXISTS slot_labels (
      slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
      label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY (slot_id, label_id)
    );

    INSERT OR IGNORE INTO slot_trainers (slot_id, trainer_id)
    SELECT id, trainer_id
    FROM slots
    WHERE trainer_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_slots_plan ON slots(plan_id);
    CREATE INDEX IF NOT EXISTS idx_slots_date ON slots(date);
    CREATE INDEX IF NOT EXISTS idx_slot_trainers_slot ON slot_trainers(slot_id);
    CREATE INDEX IF NOT EXISTS idx_slot_labels_slot ON slot_labels(slot_id);
    CREATE INDEX IF NOT EXISTS idx_slot_labels_label ON slot_labels(label_id);
  `);

  const slotColumns = db.prepare("PRAGMA table_info(slots)").all() as {
    name: string;
  }[];

  if (!slotColumns.some((c) => c.name === "location_id")) {
    db.exec(
      "ALTER TABLE slots ADD COLUMN location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;",
    );
  }

  // Index must be created after the column exists (ALTER TABLE path for existing DBs).
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_slots_location ON slots(location_id);",
  );

  const slotTrainerColumns = db
    .prepare("PRAGMA table_info(slot_trainers)")
    .all() as { name: string }[];

  if (!slotTrainerColumns.some((c) => c.name === "checked_in_at")) {
    db.exec("ALTER TABLE slot_trainers ADD COLUMN checked_in_at TEXT;");
  }

  // Backfill legacy single-check-in state into per-trainer check-ins.
  db.exec(`
    UPDATE slot_trainers
    SET checked_in_at = COALESCE(
      checked_in_at,
      (
        SELECT s.checked_in_at
        FROM slots s
        WHERE s.id = slot_trainers.slot_id
          AND s.trainer_id = slot_trainers.trainer_id
      )
    )
    WHERE checked_in_at IS NULL;
  `);

  // Keep legacy slot-level fields as derived compatibility values.
  db.exec(`
    UPDATE slots
    SET
      checked_in_at = (
        SELECT MAX(st.checked_in_at)
        FROM slot_trainers st
        WHERE st.slot_id = slots.id
          AND st.checked_in_at IS NOT NULL
      ),
      trainer_id = (
        SELECT st.trainer_id
        FROM slot_trainers st
        WHERE st.slot_id = slots.id
          AND st.checked_in_at IS NOT NULL
        ORDER BY st.checked_in_at DESC
        LIMIT 1
      );
  `);
}
