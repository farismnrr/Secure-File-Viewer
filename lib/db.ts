/**
 * SQLite database setup for nonce store and access logs
 */

import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'viewer.db');
    db = new Database(dbPath);
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  if (!db) return;

  // Nonces table
  db.exec(`
    CREATE TABLE IF NOT EXISTS nonces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id TEXT NOT NULL,
      nonce TEXT NOT NULL UNIQUE,
      session_id TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Access logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id TEXT NOT NULL,
      session_id TEXT,
      ip TEXT,
      user_agent TEXT,
      action TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_nonces_doc_id ON nonces(doc_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_nonces_nonce ON nonces(nonce)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_access_logs_doc_id ON access_logs(doc_id)`);
}

/**
 * Close database connection (for testing)
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Reset database (for testing - drops all data)
 */
export function resetDb() {
  const database = getDb();
  database.exec('DELETE FROM nonces');
  database.exec('DELETE FROM access_logs');
}
