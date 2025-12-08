import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kero from '@lytics/kero';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import envPaths from 'env-paths';
import * as schema from './schema';

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
  let sqlite = new Database(dbPath);
  let db = drizzle(sqlite, { schema });

  // Try migration, auto-reset on schema mismatch
  const needsReset = runMigrations(db);

  if (needsReset && !connectionString?.includes(':memory:')) {
    // Close and delete the old database
    sqlite.close();
    fs.unlinkSync(dbPath);

    // Recreate fresh
    sqlite = new Database(dbPath);
    db = drizzle(sqlite, { schema });
    runMigrations(db);

    logger.info('Database reset due to schema change.');
  }

  return db;
}

/** Run migrations. Returns true if database needs reset (schema mismatch). */
export function runMigrations(db: ReturnType<typeof drizzle>, migrationsFolder?: string): boolean {
  const folder = migrationsFolder || path.join(__dirname, '../drizzle');

  // Check if migrations folder exists (dev mode vs prod)
  if (!fs.existsSync(folder)) {
    return false;
  }

  try {
    migrate(db, { migrationsFolder: folder });
    return false;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Schema mismatch - needs reset
    if (errorMsg.includes('has no column named') || errorMsg.includes('already exists')) {
      return true;
    }

    // Other error - log but don't reset
    logger.error(error instanceof Error ? error : new Error(errorMsg), 'Migration failed');
    return false;
  }
}

export type DbClient = ReturnType<typeof createDb>;
