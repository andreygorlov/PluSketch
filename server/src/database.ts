import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// יצירת תיקיית data אם לא קיימת
// ב-Docker: /app/data, בפיתוח: ../../data
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
try {
  mkdirSync(dataDir, { recursive: true });
} catch (error) {
  // התיקייה כבר קיימת או שגיאה אחרת
}

const dbPath = path.join(dataDir, 'plusketch.db');
const db = new Database(dbPath);

// יצירת טבלאות
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    settings TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS elements (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    element_data TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_elements_project_id ON elements(project_id);
`);

export default db;

