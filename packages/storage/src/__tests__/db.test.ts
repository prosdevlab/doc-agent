import * as fs from 'node:fs';
import os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb, ensureDirectoryExists, getDbPath, runMigrations } from '../db';

// Mock the migrator module
vi.mock('drizzle-orm/better-sqlite3/migrator', () => ({
  migrate: vi.fn(),
}));

// Mock the logger using hoisted function
const mockError = vi.hoisted(() => vi.fn());
vi.mock('@lytics/kero', () => ({
  default: {
    createLogger: () => ({
      error: mockError,
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

describe('db', () => {
  beforeEach(() => {
    mockError.mockClear();
  });

  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', () => {
      const tempDir = path.join(os.tmpdir(), `doc-agent-test-${Date.now()}`);
      expect(fs.existsSync(tempDir)).toBe(false);

      ensureDirectoryExists(tempDir);

      expect(fs.existsSync(tempDir)).toBe(true);

      // Cleanup
      fs.rmdirSync(tempDir);
    });

    it('should not fail if directory already exists', () => {
      const tempDir = path.join(os.tmpdir(), `doc-agent-test-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });

      expect(() => ensureDirectoryExists(tempDir)).not.toThrow();
      expect(fs.existsSync(tempDir)).toBe(true);

      // Cleanup
      fs.rmdirSync(tempDir);
    });
  });

  describe('getDbPath', () => {
    it('should return a valid database path', () => {
      const dbPath = getDbPath();
      expect(dbPath).toBeTruthy();
      expect(dbPath).toContain('doc-agent.db');
      expect(typeof dbPath).toBe('string');
    });

    it('should accept custom data directory', () => {
      const customDir = path.join(os.tmpdir(), `doc-agent-custom-${Date.now()}`);
      const dbPath = getDbPath(customDir);

      expect(dbPath).toContain('doc-agent.db');
      expect(dbPath).toContain(customDir);
      expect(fs.existsSync(customDir)).toBe(true);

      // Cleanup
      fs.rmdirSync(customDir);
    });
  });

  describe('runMigrations', () => {
    it('should handle migration failures gracefully', async () => {
      const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
      const db = drizzle(new Database(':memory:'), { schema: {} });

      // Create a temp directory that exists but has no valid migrations
      const tempMigrationsDir = path.join(os.tmpdir(), `migrations-test-${Date.now()}`);
      fs.mkdirSync(tempMigrationsDir, { recursive: true });

      // Make migrate throw an error
      vi.mocked(migrate).mockImplementation(() => {
        throw new Error('Test migration failure');
      });

      // This should not throw, just log the error
      expect(() => runMigrations(db, tempMigrationsDir)).not.toThrow();
      expect(mockError).toHaveBeenCalledWith(expect.any(Error), 'Migration failed');

      // Cleanup
      fs.rmdirSync(tempMigrationsDir);
    });

    it('should skip migrations if folder does not exist', () => {
      const db = drizzle(new Database(':memory:'), { schema: {} });
      const nonExistentDir = path.join(os.tmpdir(), `non-existent-${Date.now()}`);

      // Should not throw
      expect(() => runMigrations(db, nonExistentDir)).not.toThrow();
    });
  });

  describe('createDb', () => {
    it('should accept custom connection string', () => {
      const db = createDb(':memory:');
      expect(db).toBeDefined();
    });

    it('should use default path when no connection string provided', () => {
      const db = createDb();
      expect(db).toBeDefined();
    });
  });
});
