import { Box, Text } from 'ink';

interface ErrorDisplayProps {
  title: string;
  message: string;
  suggestions?: string[];
}

export function ErrorDisplay({ title, message, suggestions }: ErrorDisplayProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color="red" bold>
          ✗ {title}
        </Text>
      </Box>
      <Box marginLeft={2}>
        <Text color="gray">{message}</Text>
      </Box>
      {suggestions && suggestions.length > 0 && (
        <Box flexDirection="column" marginTop={1} marginLeft={2}>
          <Text color="yellow">Suggestions:</Text>
          {suggestions.map((suggestion) => (
            <Text key={suggestion} color="gray">
              • {suggestion}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}
