import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kero from '@lytics/kero';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import envPaths from 'env-paths';
import * as schema from './schema.js';

const logger = kero.createLogger();

const paths = envPaths('doc-agent');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getDbPath(dataDir?: string): string {
  const baseDir = dataDir || paths.data;
  ensureDirectoryExists(baseDir);
  return path.join(baseDir, 'doc-agent.db');
}

export function createDb(connectionString?: string) {
  const dbPath = connectionString || getDbPath();
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });

  // Lazy migration logic
  runMigrations(db);

  return db;
}

export function runMigrations(db: ReturnType<typeof drizzle>, migrationsFolder?: string) {
  const folder = migrationsFolder || path.join(__dirname, '../drizzle');

  // Check if migrations folder exists (dev mode vs prod)
  if (fs.existsSync(folder)) {
    try {
      migrate(db, { migrationsFolder: folder });
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Migration failed');
      // Don't crash, just warn. might be a locked DB or permission issue.
    }
  }
}

export type DbClient = ReturnType<typeof createDb>;
