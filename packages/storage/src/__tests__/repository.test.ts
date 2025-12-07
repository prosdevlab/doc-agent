import type { DocumentData } from '@doc-agent/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDb } from '../db';
import { DocumentRepository } from '../index';

describe('DocumentRepository', () => {
  let repo: DocumentRepository;

  beforeEach(() => {
    // Use in-memory DB for tests
    const db = createDb(':memory:');
    repo = new DocumentRepository(db);
  });

  it('should save and retrieve a document', async () => {
    const mockDoc: DocumentData = {
      id: '123',
      filename: 'invoice.pdf',
      type: 'invoice',
      extractedAt: new Date(),
      vendor: 'Acme Corp',
      amount: 100,
    };

    await repo.saveDocument(mockDoc, '/tmp/invoice.pdf');

    const result = await repo.getDocument('123');
    expect(result).toBeDefined();
    expect(result?.id).toBe('123');
    // JSON serialization converts Date to string, so we match that expectation
    expect(result?.data).toEqual({
      ...mockDoc,
      extractedAt: mockDoc.extractedAt.toISOString(),
    });
    expect(result?.path).toBe('/tmp/invoice.pdf');
  });

  it('should update an existing document on save', async () => {
    const mockDoc: DocumentData = {
      id: '123',
      filename: 'invoice.pdf',
      type: 'invoice',
      extractedAt: new Date(),
      vendor: 'Acme Corp',
      amount: 100,
    };

    await repo.saveDocument(mockDoc, '/tmp/invoice.pdf');

    // Update amount
    const updatedDoc = { ...mockDoc, amount: 200 };
    await repo.saveDocument(updatedDoc, '/tmp/invoice.pdf');

    const result = await repo.getDocument('123');
    expect(result?.data.amount).toBe(200);
  });

  it('should list all documents', async () => {
    const doc1 = { id: '1', filename: 'a.pdf', type: 'invoice' as const, extractedAt: new Date() };
    const doc2 = { id: '2', filename: 'b.pdf', type: 'receipt' as const, extractedAt: new Date() };

    await repo.saveDocument(doc1, '/a');
    await repo.saveDocument(doc2, '/b');

    const list = await repo.listDocuments();
    expect(list).toHaveLength(2);
  });
});
