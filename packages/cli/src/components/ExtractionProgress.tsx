import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { useEffect, useState } from 'react';

export type ExtractionState =
  | { status: 'idle' }
  | { status: 'extracting'; startTime: number }
  | { status: 'saving' }
  | { status: 'complete'; id: string; filename: string }
  | { status: 'error'; message: string };

interface ExtractionProgressProps {
  state: ExtractionState;
  dryRun?: boolean;
}

export function ExtractionProgress({ state, dryRun }: ExtractionProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (state.status !== 'extracting') {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - state.startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [state]);

  switch (state.status) {
    case 'idle':
      return null;

    case 'extracting':
      return (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Extracting document data...</Text>
          {elapsed > 10 && <Text color="gray"> ({elapsed}s - Local AI can take a moment)</Text>}
        </Box>
      );

    case 'saving':
      return (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Saving to database...</Text>
        </Box>
      );

    case 'complete':
      return (
        <Box>
          <Text color="green">✓</Text>
          {dryRun ? (
            <Text> Extraction complete (dry run)</Text>
          ) : (
            <Text>
              {' '}
              Saved: {state.filename} (ID: {state.id})
            </Text>
          )}
        </Box>
      );

    case 'error':
      return (
        <Box>
          <Text color="red">✗</Text>
          <Text> Extraction failed: {state.message}</Text>
        </Box>
      );
  }
}
