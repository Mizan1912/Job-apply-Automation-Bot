import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(__dirname, '../../data');
const dbPath = path.join(dbDir, 'naukri.db');

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbConn = null;

/**
 * Get public database connection.
 */
export function getDbConnection() {
  if (dbConn) return dbConn;
  
  dbConn = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error(`[DB] Error opening database: ${err.message}`);
    } else {
      // Enable foreign keys
      dbConn.run('PRAGMA foreign_keys = ON;');
    }
  });

  return dbConn;
}

/**
 * Closes the database connection.
 */
export async function closeDbConnection() {
  return new Promise((resolve, reject) => {
    if (!dbConn) return resolve();
    dbConn.close((err) => {
      if (err) return reject(err);
      dbConn = null;
      resolve();
    });
  });
}

/**
 * Execute a query (INSERT, UPDATE, DELETE).
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<{lastID: number, changes: number}>}
 */
export function dbRun(sql, params = []) {
  const db = getDbConnection();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Fetch a single row.
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<any>}
 */
export function dbGet(sql, params = []) {
  const db = getDbConnection();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/**
 * Fetch all rows.
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<any[]>}
 */
export function dbAll(sql, params = []) {
  const db = getDbConnection();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Initialize all database tables if they do not exist.
 */
export async function initDatabase() {
  console.log('[DB] Initializing SQLite tables...');
  
  // Jobs table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      url TEXT NOT NULL,
      location TEXT,
      experience TEXT,
      salary TEXT,
      posted_date TEXT,
      description TEXT,
      discovered_at TEXT NOT NULL
    )
  `);

  // Applications table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      status TEXT NOT NULL, /* DISCOVERED, QUEUED, APPLYING, APPLIED, NEEDS_USER_INPUT, NEEDS_USER_ACTION, FAILED, SKIPPED */
      telegram_message_ids TEXT, /* comma-separated list of message IDs */
      error_message TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
  `);

  // Application questions table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS application_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      answer_text TEXT,
      status TEXT NOT NULL, /* PENDING, ANSWERED, AUTO_SOLVED */
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      UNIQUE(application_id, question_text)
    )
  `);

  // Migration: add answer_text column to application_questions if it does not exist
  try {
    await dbRun("ALTER TABLE application_questions ADD COLUMN answer_text TEXT");
  } catch (err) {
    // Ignore error if column already exists
  }

  // Global answers dictionary
  await dbRun(`
    CREATE TABLE IF NOT EXISTS answers (
      question_text TEXT PRIMARY KEY,
      answer_text TEXT NOT NULL
    )
  `);

  // Automation runs table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS automation_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      status TEXT, /* RUNNING, COMPLETED, FAILED */
      stats TEXT /* JSON string */
    )
  `);

  // Settings table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  console.log('[DB] Database tables initialized successfully.');
}

/**
 * Fetch all settings from the database as a key-value object.
 * @returns {Promise<Record<string, string>>}
 */
export async function getSettingsOverrides() {
  try {
    const rows = await dbAll('SELECT key, value FROM settings');
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  } catch (err) {
    console.error(`[DB] Error fetching settings: ${err.message}`);
    return {};
  }
}

/**
 * Save a single setting override.
 * @param {string} key 
 * @param {string} value 
 */
export async function saveSettingOverride(key, value) {
  await dbRun(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, String(value)]
  );
}
