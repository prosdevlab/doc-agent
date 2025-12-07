import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

export type OllamaState =
  | { status: 'checking' }
  | { status: 'not-running' }
  | { status: 'checking-model'; model: string }
  | { status: 'pulling-model'; model: string }
  | { status: 'ready'; model: string }
  | { status: 'error'; message: string };

interface OllamaStatusProps {
  state: OllamaState;
}

export function OllamaStatus({ state }: OllamaStatusProps) {
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

    case 'not-running':
      return (
        <Box flexDirection="column">
          <Box>
            <Text color="red">✗</Text>
            <Text> Ollama is not running</Text>
          </Box>
          <Box marginLeft={2} marginTop={1} flexDirection="column">
            <Text color="yellow">To use local AI extraction:</Text>
            <Text color="gray"> 1. Install Ollama: </Text>
            <Text color="cyan"> https://ollama.com/download</Text>
            <Text color="gray"> 2. Start Ollama: </Text>
            <Text color="white"> ollama serve</Text>
            <Text color="gray"> 3. Re-run this command</Text>
            <Box marginTop={1}>
              <Text color="yellow">Or use cloud AI:</Text>
            </Box>
            <Text color="white"> doc extract file.pdf --provider gemini</Text>
            <Text color="gray"> (requires GEMINI_API_KEY)</Text>
          </Box>
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

    case 'pulling-model':
      return (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Pulling model: {state.model} (this may take a while)...</Text>
        </Box>
      );

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
  }
}
