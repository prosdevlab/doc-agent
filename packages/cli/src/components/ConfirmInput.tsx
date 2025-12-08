import { Box, Text, useInput } from 'ink';

interface ConfirmInputInteractiveProps {
  message: string;
  onConfirm: (confirmed: boolean) => void;
  defaultValue: boolean;
}

function ConfirmInputInteractive({
  message,
  onConfirm,
  defaultValue,
}: ConfirmInputInteractiveProps) {
  useInput((input, key) => {
    if (input.toLowerCase() === 'y' || (key.return && defaultValue)) {
      onConfirm(true);
    } else if (input.toLowerCase() === 'n' || (key.return && !defaultValue)) {
      onConfirm(false);
    }
  });

  return (
    <Box>
      <Text>{message} </Text>
      <Text color="gray">{defaultValue ? '[Y/n]' : '[y/N]'}</Text>
    </Box>
  );
}

interface ConfirmInputProps {
  message: string;
  onConfirm: (confirmed: boolean) => void;
  defaultValue?: boolean;
  /** Whether stdin supports raw mode (interactive input) */
  isInteractive: boolean;
}

export function ConfirmInput({
  message,
  onConfirm,
  defaultValue = true,
  isInteractive,
}: ConfirmInputProps) {
  // Non-interactive: just show message, caller handles auto-confirm
  if (!isInteractive) {
    return (
      <Box>
        <Text>{message} </Text>
        <Text color="gray">(auto: {defaultValue ? 'yes' : 'no'})</Text>
      </Box>
    );
  }

  // Interactive mode with useInput
  return (
    <ConfirmInputInteractive message={message} onConfirm={onConfirm} defaultValue={defaultValue} />
  );
}
