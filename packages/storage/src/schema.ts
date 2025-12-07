import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import type { DocumentData } from '@doc-agent/core';

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  path: text('path').notNull(),
  hash: text('hash'),
  status: text('status', { enum: ['pending', 'indexed', 'failed'] }).notNull().default('pending'),
  data: text('data', { mode: 'json' }).$type<DocumentData>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(new Date())
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

