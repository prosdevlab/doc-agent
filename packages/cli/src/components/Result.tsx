import type { DocumentData } from '@doc-agent/core';
import { Box, Text } from 'ink';

interface ResultProps {
  data: DocumentData;
  showJson?: boolean;
}

export function Result({ data, showJson = true }: ResultProps) {
  if (showJson) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="gray">─────────────────────────────────────</Text>
        <Text>{JSON.stringify(data, null, 2)}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">─────────────────────────────────────</Text>
      <Box>
        <Text color="gray">Type: </Text>
        <Text>{data.type}</Text>
      </Box>
      {data.vendor && (
        <Box>
          <Text color="gray">Vendor: </Text>
          <Text>{data.vendor}</Text>
        </Box>
      )}
      {data.amount !== undefined && (
        <Box>
          <Text color="gray">Amount: </Text>
          <Text color="green">${data.amount.toFixed(2)}</Text>
        </Box>
      )}
      {data.date && (
        <Box>
          <Text color="gray">Date: </Text>
          <Text>{data.date}</Text>
        </Box>
      )}
      {data.items && data.items.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="gray">Items:</Text>
          {data.items.map((item) => (
            <Box key={item.description} marginLeft={2}>
              <Text>
                • {item.description}
                {item.total !== undefined && <Text color="green"> ${item.total.toFixed(2)}</Text>}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
