import { useCallback, useEffect, useState } from 'react';
import type { OllamaState, PullProgress } from '../components/OllamaStatus';
import { useOllamaService } from '../contexts/OllamaContext';

export interface UseOllamaOptions {
  provider: 'gemini' | 'openai' | 'ollama';
  model: string;
  isInteractive: boolean;
}

export interface UseOllamaResult {
  state: OllamaState;
  isReady: boolean;
  handleInstallConfirm: (confirmed: boolean) => Promise<void>;
  handleStartConfirm: (confirmed: boolean) => Promise<void>;
}

export function useOllama({ provider, model, isInteractive }: UseOllamaOptions): UseOllamaResult {
  const [state, setState] = useState<OllamaState>({ status: 'checking' });
  const [isReady, setIsReady] = useState(false);
  const ollamaService = useOllamaService();

  // Check model and pull if needed (declared first since other callbacks depend on it)
  const checkAndPullModel = useCallback(async () => {
    setState({ status: 'checking-model', model });
    const modelExists = await ollamaService.checkModelExists(model);

    if (!modelExists) {
      setState({ status: 'pulling-model', model });
      await ollamaService.pullModel(model, (progress: PullProgress) => {
        setState({ status: 'pulling-model', model, pullProgress: progress });
      });
    }

    setState({ status: 'ready', model });
    setIsReady(true);
  }, [model, ollamaService]);

  // Handle install confirmation
  const handleInstallConfirm = useCallback(
    async (confirmed: boolean) => {
      if (!confirmed) {
        setState({ status: 'cancelled' });
        return;
      }

      setState({ status: 'installing' });
      try {
        await ollamaService.installOllama((progress) => {
          setState({ status: 'installing', progress });
        });
        setState({ status: 'prompt-start' });
      } catch (err) {
        setState({ status: 'error', message: (err as Error).message });
      }
    },
    [ollamaService]
  );

  // Handle start confirmation
  const handleStartConfirm = useCallback(
    async (confirmed: boolean) => {
      if (!confirmed) {
        setState({ status: 'cancelled' });
        return;
      }

      setState({ status: 'starting' });
      try {
        ollamaService.startOllama();
        const started = await ollamaService.waitForOllama();
        if (!started) {
          throw new Error('Ollama failed to start within 10 seconds');
        }
        // Proceed to model check
        await checkAndPullModel();
      } catch (err) {
        setState({ status: 'error', message: (err as Error).message });
      }
    },
    [checkAndPullModel, ollamaService]
  );

  // Auto-confirm in non-interactive mode
  useEffect(() => {
    if (isInteractive) return;

    if (state.status === 'prompt-install') {
      const timer = setTimeout(() => handleInstallConfirm(true), 500);
      return () => clearTimeout(timer);
    }

    if (state.status === 'prompt-start') {
      const timer = setTimeout(() => handleStartConfirm(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isInteractive, state.status, handleInstallConfirm, handleStartConfirm]);

  // Initial check
  useEffect(() => {
    const checkOllama = async () => {
      // Skip Ollama check for non-Ollama providers
      if (provider !== 'ollama') {
        setState({ status: 'ready', model: provider });
        setIsReady(true);
        return;
      }

      setState({ status: 'checking' });

      // Check if Ollama is running
      const isRunning = await ollamaService.checkOllamaRunning();
      if (isRunning) {
        await checkAndPullModel();
        return;
      }

      // Check if Ollama is installed
      const isInstalled = await ollamaService.checkOllamaInstalled();
      if (!isInstalled) {
        setState({ status: 'prompt-install' });
        return;
      }

      // Installed but not running
      setState({ status: 'prompt-start' });
    };

    checkOllama();
  }, [provider, checkAndPullModel, ollamaService]);

  return {
    state,
    isReady,
    handleInstallConfirm,
    handleStartConfirm,
  };
}
