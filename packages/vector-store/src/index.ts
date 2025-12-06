import type { Config, DocumentData, SearchResult } from '@doc-agent/core';

export class VectorStore {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async indexDocument(document: DocumentData): Promise<void> {
    console.log(`Indexing document ${document.id} (not implemented)`);
    // TODO: Implement LanceDB indexing
  }

  async search(query: string): Promise<SearchResult[]> {
    console.log(`Searching for "${query}" (not implemented)`);
    // TODO: Implement LanceDB search
    return [];
  }
}

export function createVectorStore(config: Config): VectorStore {
  return new VectorStore(config);
}
