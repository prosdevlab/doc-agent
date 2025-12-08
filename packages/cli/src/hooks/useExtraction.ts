import { resolve } from 'node:path';
import type { Config, DocumentData } from '@doc-agent/core';
import type { StreamChunk } from '@doc-agent/extract';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExtractionState } from '../components/ExtractionProgress';
import { useExtractionService } from '../contexts/ExtractionContext';

export interface UseExtractionOptions {
  file: string;
  provider: 'gemini' | 'openai' | 'ollama';
  model: string;
  dryRun: boolean;
  shouldStart: boolean;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface UseExtractionResult {
  state: ExtractionState;
  result: DocumentData | null;
  promptContent: string;
  responseContent: string;
}

export function useExtraction({
  file,
  provider,
  model,
  dryRun,
  shouldStart,
  onComplete,
  onError,
}: UseExtractionOptions): UseExtractionResult {
  const [state, setState] = useState<ExtractionState>({ status: 'idle' });
  const [result, setResult] = useState<DocumentData | null>(null);
  const [promptContent, setPromptContent] = useState('');
  const [responseContent, setResponseContent] = useState('');
  const responseRef = useRef('');
  const lastUpdateRef = useRef(0);
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const extractionService = useExtractionService();

  const runExtraction = useCallback(async () => {
    try {
      setState({ status: 'extracting', startTime: Date.now() });
      setPromptContent('');
      responseRef.current = '';
      setResponseContent('');

      const config: Config = {
        aiProvider: provider,
        geminiApiKey: process.env.GEMINI_API_KEY,
        geminiModel: provider === 'gemini' ? model : undefined,
        openaiApiKey: process.env.OPENAI_API_KEY,
        ollamaModel: provider === 'ollama' ? model : undefined,
      };

      const THROTTLE_MS = 250;

      const extractedData = await extractionService.extractDocument(file, config, {
        onStream: (chunk: StreamChunk) => {
          if (chunk.type === 'prompt') {
            setPromptContent(chunk.content);
          } else if (chunk.type === 'response') {
            responseRef.current += chunk.content;

            const now = Date.now();
            if (now - lastUpdateRef.current >= THROTTLE_MS) {
              lastUpdateRef.current = now;
              setResponseContent(responseRef.current);
            } else if (!updateTimerRef.current) {
              updateTimerRef.current = setTimeout(() => {
                updateTimerRef.current = null;
                lastUpdateRef.current = Date.now();
                setResponseContent(responseRef.current);
              }, THROTTLE_MS);
            }
          }
        },
      });

      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      setResponseContent(responseRef.current);
      setResult(extractedData);

      if (!dryRun) {
        setState({ status: 'saving' });
        const absolutePath = resolve(file);
        await extractionService.saveDocument(extractedData, absolutePath);
      }

      setState({
        status: 'complete',
        id: extractedData.id,
        filename: extractedData.filename,
      });

      onComplete();
    } catch (error) {
      const err = error as Error;
      setState({ status: 'error', message: err.message });
      onError(err);
    }
  }, [file, provider, model, dryRun, onComplete, onError, extractionService]);

  useEffect(() => {
    if (shouldStart && state.status === 'idle') {
      runExtraction();
    }
  }, [shouldStart, state.status, runExtraction]);

  return {
    state,
    result,
    promptContent,
    responseContent,
  };
}
