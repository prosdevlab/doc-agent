import { Box, useStdin } from 'ink';
import {
  ExtractionProvider,
  type ExtractionService,
  OllamaProvider,
  type OllamaService,
} from '../contexts';
import { useExtraction } from '../hooks/useExtraction';
import { useOllama } from '../hooks/useOllama';
import { ExtractionProgress } from './ExtractionProgress';
import { OllamaStatus } from './OllamaStatus';
import { Result } from './Result';
import { StreamingOutput } from './StreamingOutput';

export interface ExtractAppProps {
  file: string;
  provider: 'gemini' | 'openai' | 'ollama';
  model: string;
  dryRun: boolean;
  onComplete: () => void;
  onError: (error: Error) => void;
  // Optional services for testing
  ollamaService?: OllamaService;
  extractionService?: ExtractionService;
}

function ExtractAppInner({
  file,
  provider,
  model,
  dryRun,
  onComplete,
  onError,
}: Omit<ExtractAppProps, 'ollamaService' | 'extractionService'>) {
  const { isRawModeSupported } = useStdin();

  const ollama = useOllama({
    provider,
    model,
    isInteractive: isRawModeSupported,
  });

  const extraction = useExtraction({
    file,
    provider,
    model,
    dryRun,
    shouldStart: ollama.isReady,
    onComplete,
    onError,
  });

  return (
    <Box flexDirection="column" padding={1}>
      <OllamaStatus
        state={ollama.state}
        isInteractive={isRawModeSupported}
        onInstallConfirm={
          ollama.state.status === 'prompt-install' ? ollama.handleInstallConfirm : undefined
        }
        onStartConfirm={
          ollama.state.status === 'prompt-start' ? ollama.handleStartConfirm : undefined
        }
      />

      {ollama.state.status === 'ready' && (
        <Box marginTop={1}>
          <ExtractionProgress state={extraction.state} dryRun={dryRun} />
        </Box>
      )}

      {extraction.state.status === 'extracting' && extraction.responseContent && (
        <StreamingOutput content={extraction.responseContent} />
      )}

      {extraction.result && extraction.state.status === 'complete' && (
        <Result data={extraction.result} showJson={true} />
      )}
    </Box>
  );
}

export function ExtractApp({ ollamaService, extractionService, ...props }: ExtractAppProps) {
  return (
    <OllamaProvider service={ollamaService}>
      <ExtractionProvider service={extractionService}>
        <ExtractAppInner {...props} />
      </ExtractionProvider>
    </OllamaProvider>
  );
}
