import { createContext, type ReactNode, useContext } from 'react';
import * as ollamaService from '../services/ollama';

// Service interface for dependency injection
export interface OllamaService {
  checkOllamaInstalled: typeof ollamaService.checkOllamaInstalled;
  checkOllamaRunning: typeof ollamaService.checkOllamaRunning;
  installOllama: typeof ollamaService.installOllama;
  startOllama: typeof ollamaService.startOllama;
  waitForOllama: typeof ollamaService.waitForOllama;
  checkModelExists: typeof ollamaService.checkModelExists;
  pullModel: typeof ollamaService.pullModel;
}

// Default implementation uses real service
const defaultOllamaService: OllamaService = {
  checkOllamaInstalled: ollamaService.checkOllamaInstalled,
  checkOllamaRunning: ollamaService.checkOllamaRunning,
  installOllama: ollamaService.installOllama,
  startOllama: ollamaService.startOllama,
  waitForOllama: ollamaService.waitForOllama,
  checkModelExists: ollamaService.checkModelExists,
  pullModel: ollamaService.pullModel,
};

const OllamaContext = createContext<OllamaService>(defaultOllamaService);

export interface OllamaProviderProps {
  children: ReactNode;
  service?: OllamaService;
}

export function OllamaProvider({ children, service }: OllamaProviderProps) {
  return (
    <OllamaContext.Provider value={service ?? defaultOllamaService}>
      {children}
    </OllamaContext.Provider>
  );
}

export function useOllamaService(): OllamaService {
  return useContext(OllamaContext);
}
