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