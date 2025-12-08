import type { Config, DocumentData } from '@doc-agent/core';
import { type ExtractOptions, extractDocument } from '@doc-agent/extract';
import { storage } from '@doc-agent/storage';
import { createContext, type ReactNode, useContext } from 'react';

// Service interface for dependency injection
export interface ExtractionService {
  extractDocument: (
    filePath: string,
    config: Config,
    options?: ExtractOptions
  ) => Promise<DocumentData>;
  saveDocument: (doc: DocumentData, filePath: string) => Promise<void>;
}

// Default implementation uses real services
const defaultExtractionService: ExtractionService = {
  extractDocument,
  saveDocument: storage.saveDocument.bind(storage),
};

const ExtractionContext = createContext<ExtractionService>(defaultExtractionService);

export interface ExtractionProviderProps {
  children: ReactNode;
  service?: ExtractionService;
}

export function ExtractionProvider({ children, service }: ExtractionProviderProps) {
  return (
    <ExtractionContext.Provider value={service ?? defaultExtractionService}>
      {children}
    </ExtractionContext.Provider>
  );
}

export function useExtractionService(): ExtractionService {
  return useContext(ExtractionContext);
}
