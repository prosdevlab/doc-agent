import { Box, Text } from 'ink';

interface StreamingOutputProps {
  content: string;
  maxLines?: number;
}

export function StreamingOutput({ content, maxLines = 10 }: StreamingOutputProps) {
  if (!content) return null;

  // Show last N lines of content to keep it readable
  const lines = content.split('\n');
  const displayLines = lines.slice(-maxLines);
  const truncated = lines.length > maxLines;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">─── Response ───</Text>
      {truncated && <Text color="gray">...</Text>}
      <Text>{displayLines.join('\n')}</Text>
    </Box>
  );
}
