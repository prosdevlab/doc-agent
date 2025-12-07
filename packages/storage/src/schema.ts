import type { DocumentData } from '@doc-agent/core';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  pathHash: text('path_hash').notNull().unique(),
  filename: text('filename').notNull(),
  contentHash: text('content_hash'),
  status: text('status', { enum: ['pending', 'indexed', 'failed'] })
    .notNull()
    .default('pending'),
  data: text('data', { mode: 'json' }).$type<DocumentData>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(new Date()),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
