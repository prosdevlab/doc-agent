import type { DocumentData } from '@doc-agent/core';
import { eq } from 'drizzle-orm';
import { createDb, type DbClient } from './db.js';
import { documents, type NewDocument } from './schema.js';

export class DocumentRepository {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db || createDb();
  }

  async saveDocument(docData: DocumentData, filePath: string): Promise<void> {
    const newDoc: NewDocument = {
      id: docData.id,
      path: filePath,
      status: 'pending',
      data: docData,
      createdAt: new Date(),
    };

    // Upsert logic: if id exists, update data
    await this.db
      .insert(documents)
      .values(newDoc)
      .onConflictDoUpdate({
        target: documents.id,
        set: {
          data: docData,
          path: filePath,
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

export const storage = new DocumentRepository();
