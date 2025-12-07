import { resolve } from 'node:path';
import type { Config, DocumentData } from '@doc-agent/core';
import { extractDocument } from '@doc-agent/extract';
import { storage } from '@doc-agent/storage';
import { Box } from 'ink';
import { useEffect, useState } from 'react';
import { ExtractionProgress, type ExtractionState } from './ExtractionProgress';
import { type OllamaState, OllamaStatus } from './OllamaStatus';
import { Result } from './Result';

interface ExtractAppProps {
  file: string;
  provider: 'gemini' | 'openai' | 'ollama';
  model: string;
  dryRun: boolean;
  onComplete: () => void;
  onError: (error: Error) => void;
}

async function checkOllamaRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}

async function checkModelExists(model: string): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) return false;
    const data = (await response.json()) as { models: { name: string }[] };
    return data.models.some((m) => m.name.includes(model));
  } catch {
    return false;
  }
}

async function pullModel(model: string): Promise<void> {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);
  await execAsync(`ollama pull ${model}`);
}

export function ExtractApp({
  file,
  provider,
  model,
  dryRun,
  onComplete,
  onError,
}: ExtractAppProps) {
  const [ollamaState, setOllamaState] = useState<OllamaState>({ status: 'checking' });
  const [extractionState, setExtractionState] = useState<ExtractionState>({ status: 'idle' });
  const [result, setResult] = useState<DocumentData | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        // Skip Ollama checks for non-Ollama providers
        if (provider !== 'ollama') {
          setOllamaState({ status: 'ready', model: provider });
        } else {
          // Check if Ollama is running
          setOllamaState({ status: 'checking' });
          const isRunning = await checkOllamaRunning();

          if (!isRunning) {
            setOllamaState({ status: 'not-running' });
            return;
          }

          // Check if model exists
          setOllamaState({ status: 'checking-model', model });
          const modelExists = await checkModelExists(model);

          if (!modelExists) {
            setOllamaState({ status: 'pulling-model', model });
            await pullModel(model);
          }

          setOllamaState({ status: 'ready', model });
        }

        // Start extraction
        setExtractionState({ status: 'extracting', startTime: Date.now() });

        const config: Config = {
          aiProvider: provider,
          geminiApiKey: process.env.GEMINI_API_KEY,
          openaiApiKey: process.env.OPENAI_API_KEY,
          ollamaModel: model,
        };

        const extractedData = await extractDocument(file, config);
        setResult(extractedData);

        // Save to database unless dry run
        if (!dryRun) {
          setExtractionState({ status: 'saving' });
          const absolutePath = resolve(file);
          await storage.saveDocument(extractedData, absolutePath);
        }

        setExtractionState({
          status: 'complete',
          id: extractedData.id,
          filename: extractedData.filename,
        });

        onComplete();
      } catch (error) {
        const err = error as Error;
        setExtractionState({ status: 'error', message: err.message });
        onError(err);
      }
    };

    run();
  }, [file, provider, model, dryRun, onComplete, onError]);

  return (
    <Box flexDirection="column" padding={1}>
      <OllamaStatus state={ollamaState} />

      {ollamaState.status === 'ready' && (
        <Box marginTop={1}>
          <ExtractionProgress state={extractionState} dryRun={dryRun} />
        </Box>
      )}

      {result && extractionState.status === 'complete' && <Result data={result} showJson={true} />}
    </Box>
  );
}
