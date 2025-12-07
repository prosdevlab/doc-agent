import type { DocumentData } from '@doc-agent/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDb } from '../db';
import { computePathHash, DocumentRepository } from '../index';

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
    expect(result?.filename).toBe('invoice.pdf');
    expect(result?.pathHash).toBe(computePathHash('/tmp/invoice.pdf'));
  });

  it('should upsert by path (same file = update, not duplicate)', async () => {
    const mockDoc: DocumentData = {
      id: '123',
      filename: 'invoice.pdf',
      type: 'invoice',
      extractedAt: new Date(),
      vendor: 'Acme Corp',
      amount: 100,
    };

    await repo.saveDocument(mockDoc, '/tmp/invoice.pdf');

    // Re-extract same file with new ID and updated data
    const updatedDoc = { ...mockDoc, id: '456', amount: 200 };
    await repo.saveDocument(updatedDoc, '/tmp/invoice.pdf');

    // Should have updated the existing record, not created a new one
    const list = await repo.listDocuments();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('456'); // ID updated
    expect(list[0].data.amount).toBe(200); // Data updated
  });

  it('should list all documents', async () => {
    const doc1 = { id: '1', filename: 'a.pdf', type: 'invoice' as const, extractedAt: new Date() };
    const doc2 = { id: '2', filename: 'b.pdf', type: 'receipt' as const, extractedAt: new Date() };

    await repo.saveDocument(doc1, '/a.pdf');
    await repo.saveDocument(doc2, '/b.pdf');

    const list = await repo.listDocuments();
    expect(list).toHaveLength(2);
  });
});

describe('computePathHash', () => {
  it('should return consistent hash for same absolute path', () => {
    const hash1 = computePathHash('/tmp/invoice.pdf');
    const hash2 = computePathHash('/tmp/invoice.pdf');
    expect(hash1).toBe(hash2);
  });

  it('should return different hash for different paths', () => {
    const hash1 = computePathHash('/tmp/a.pdf');
    const hash2 = computePathHash('/tmp/b.pdf');
    expect(hash1).not.toBe(hash2);
  });

  it('should resolve relative paths to absolute', () => {
    // Same file, different ways of referring to it
    const hash1 = computePathHash('./test.pdf');
    const hash2 = computePathHash('test.pdf');
    expect(hash1).toBe(hash2);
  });
});
