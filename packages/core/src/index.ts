// Shared type definitions
export interface DocumentData {
  id: string;
  filename: string;
  type: 'invoice' | 'receipt' | 'bank_statement' | 'other';
  extractedAt: Date;
  vendor?: string;
  amount?: number;
  date?: string;
  items?: LineItem[];
  rawText?: string;
}

export interface LineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

export interface SearchResult {
  document: DocumentData;
  similarity: number;
  snippet: string;
}

export interface Config {
  aiProvider: 'gemini' | 'openai' | 'ollama';
  geminiApiKey?: string;
  openaiApiKey?: string;
  ollamaModel?: string;
  dbPath?: string;
}

export interface CoreServiceConfig {
  apiKey: string;
  debug: boolean;
}

export class CoreService {
  private apiKey: string;
  private debug: boolean;

  constructor(config: CoreServiceConfig) {
    this.apiKey = config.apiKey;
    this.debug = config.debug;
  }

  getApiKey(): string {
    return this.apiKey;
  }
}

export function createCoreService(config: CoreServiceConfig): CoreService {
  return new CoreService(config);
}
