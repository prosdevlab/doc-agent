import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { ConfirmInput } from './ConfirmInput';

export interface PullProgress {
  status: string;
  completed?: number;
  total?: number;
}

export type OllamaState =
  | { status: 'checking' }
  | { status: 'not-installed' }
  | { status: 'prompt-install' }
  | { status: 'installing'; progress?: string }
  | { status: 'not-running' }
  | { status: 'prompt-start' }
  | { status: 'starting' }
  | { status: 'checking-model'; model: string }
  | { status: 'pulling-model'; model: string; pullProgress?: PullProgress }
  | { status: 'ready'; model: string }
  | { status: 'error'; message: string }
  | { status: 'cancelled' };

interface OllamaStatusProps {
  state: OllamaState;
  isInteractive: boolean;
  onInstallConfirm?: (confirmed: boolean) => void;
  onStartConfirm?: (confirmed: boolean) => void;
}

export function OllamaStatus({
  state,
  isInteractive,
  onInstallConfirm,
  onStartConfirm,
}: OllamaStatusProps) {
  switch (state.status) {
    case 'checking':
      return (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Checking Ollama...</Text>
        </Box>
      );

    case 'not-installed':
      return (
        <Box>
          <Text color="yellow">⚠</Text>
          <Text> Ollama is not installed</Text>
        </Box>
      );

    case 'prompt-install':
      return (
        <Box flexDirection="column">
          <Box>
            <Text color="yellow">⚠</Text>
            <Text> Ollama is not installed</Text>
          </Box>
          <Box marginTop={1}>
            {onInstallConfirm && (
              <ConfirmInput
                message="Install Ollama now?"
                onConfirm={onInstallConfirm}
                defaultValue={true}
                isInteractive={isInteractive}
              />
            )}
          </Box>
          <Box marginLeft={2} marginTop={1}>
            <Text color="gray">
              (Uses official installer: curl -fsSL https://ollama.com/install.sh | sh)
            </Text>
          </Box>
        </Box>
      );

    case 'installing':
      return (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> {state.progress || 'Installing Ollama...'}</Text>
        </Box>
      );

    case 'not-running':
      return (
        <Box>
          <Text color="yellow">⚠</Text>
          <Text> Ollama is installed but not running</Text>
        </Box>
      );

    case 'prompt-start':
      return (
        <Box flexDirection="column">
          <Box>
            <Text color="yellow">⚠</Text>
            <Text> Ollama is installed but not running</Text>
          </Box>
          <Box marginTop={1}>
            {onStartConfirm && (
              <ConfirmInput
                message="Start Ollama now?"
                onConfirm={onStartConfirm}
                defaultValue={true}
                isInteractive={isInteractive}
              />
            )}
          </Box>
        </Box>
      );

    case 'starting':
      return (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Starting Ollama...</Text>
        </Box>
      );

    case 'checking-model':
      return (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Checking model: {state.model}...</Text>
        </Box>
      );

    case 'pulling-model': {
      const { pullProgress } = state;
      const completed = pullProgress?.completed ?? 0;
      const total = pullProgress?.total ?? 0;
      const hasProgress = total > 0 && completed > 0;
      const percent = hasProgress ? Math.round((completed / total) * 100) : 0;
      const barWidth = 20;
      const filled = hasProgress ? Math.round((percent / 100) * barWidth) : 0;
      const bar = hasProgress ? '█'.repeat(filled) + '░'.repeat(barWidth - filled) : '';

      // Format bytes
      const formatBytes = (bytes: number) => {
        if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
        if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
        return `${bytes} B`;
      };

      return (
        <Box flexDirection="column">
          <Box>
            <Text color="cyan">↓</Text>
            <Text> Pulling {state.model}</Text>
          </Box>
          {hasProgress ? (
            <Box marginLeft={2}>
              <Text color="cyan">{bar}</Text>
              <Text color="gray">
                {' '}
                {percent}% ({formatBytes(completed)} / {formatBytes(total)})
              </Text>
            </Box>
          ) : (
            <Box marginLeft={2}>
              <Text color="cyan">
                <Spinner type="dots" />
              </Text>
              <Text color="gray"> {pullProgress?.status || 'Connecting...'}</Text>
            </Box>
          )}
        </Box>
      );
    }

    case 'ready':
      return (
        <Box>
          <Text color="green">✓</Text>
          <Text> Ollama ready: {state.model}</Text>
        </Box>
      );

    case 'error':
      return (
        <Box flexDirection="column">
          <Box>
            <Text color="red">✗</Text>
            <Text> Ollama error: {state.message}</Text>
          </Box>
        </Box>
      );

    case 'cancelled':
      return (
        <Box flexDirection="column">
          <Box>
            <Text color="gray">─</Text>
            <Text> Cancelled</Text>
          </Box>
          <Box marginLeft={2} marginTop={1} flexDirection="column">
            <Text color="gray">To install manually:</Text>
            <Text color="cyan"> https://ollama.com/download</Text>
            <Box marginTop={1}>
              <Text color="gray">Or use cloud AI:</Text>
            </Box>
            <Text color="white"> doc extract file.pdf --provider gemini</Text>
          </Box>
        </Box>
      );
  }
}
