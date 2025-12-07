import { createHash } from 'node:crypto';
import { basename, resolve } from 'node:path';
import type { DocumentData } from '@doc-agent/core';
import { eq } from 'drizzle-orm';
import { createDb, type DbClient } from './db';
import { documents, type NewDocument } from './schema';

// Re-export db utilities
export { createDb, type DbClient, getDbPath } from './db';

// Re-export schema types
export { type Document, documents, type NewDocument } from './schema';

/**
 * Compute SHA256 hash of a path for PII-safe storage
 */
export function computePathHash(filePath: string): string {
  const absolutePath = resolve(filePath);
  return createHash('sha256').update(absolutePath).digest('hex');
}

export class DocumentRepository {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db || createDb();
  }

  async saveDocument(docData: DocumentData, filePath: string): Promise<void> {
    const pathHash = computePathHash(filePath);
    const filename = basename(filePath);

    const newDoc: NewDocument = {
      id: docData.id,
      pathHash,
      filename,
      status: 'pending',
      data: docData,
      createdAt: new Date(),
    };

    // Upsert logic: if same file path, update existing record
    await this.db
      .insert(documents)
      .values(newDoc)
      .onConflictDoUpdate({
        target: documents.pathHash,
        set: {
          id: docData.id,
          data: docData,
          status: 'pending', // Reset status on update so it gets re-indexed
        },
      });
  }

  async getDocument(id: string) {
    return this.db.query.documents.findFirst({
      where: eq(documents.id, id),
    });
  }

  async listDocuments() {
    return this.db.query.documents.findMany({
      orderBy: (docs, { desc }) => [desc(docs.createdAt)],
    });
  }
}

// Lazy singleton - only initializes when first accessed
let _storage: DocumentRepository | null = null;

export function getStorage(): DocumentRepository {
  if (!_storage) {
    _storage = new DocumentRepository();
  }
  return _storage;
}

// Convenience alias for simple usage
export const storage = {
  saveDocument: (...args: Parameters<DocumentRepository['saveDocument']>) =>
    getStorage().saveDocument(...args),
  getDocument: (...args: Parameters<DocumentRepository['getDocument']>) =>
    getStorage().getDocument(...args),
  listDocuments: (...args: Parameters<DocumentRepository['listDocuments']>) =>
    getStorage().listDocuments(...args),
};
