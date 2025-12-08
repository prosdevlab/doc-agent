/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OllamaProvider, type OllamaService } from '../../contexts';
import { useOllama } from '../useOllama';

// Create mock service
const createMockOllamaService = (overrides: Partial<OllamaService> = {}): OllamaService => ({
  checkOllamaInstalled: vi.fn().mockResolvedValue(true),
  checkOllamaRunning: vi.fn().mockResolvedValue(true),
  installOllama: vi.fn().mockResolvedValue(undefined),
  startOllama: vi.fn(),
  waitForOllama: vi.fn().mockResolvedValue(true),
  checkModelExists: vi.fn().mockResolvedValue(true),
  pullModel: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

// Wrapper component for providing context
const createWrapper = (service: OllamaService) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(OllamaProvider, { service }, children);
  };
};

describe('useOllama', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip Ollama check for non-Ollama providers', async () => {
    const mockService = createMockOllamaService();

    const { result } = renderHook(
      () =>
        useOllama({
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          isInteractive: false,
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    expect(result.current.isReady).toBe(true);
    expect(mockService.checkOllamaRunning).not.toHaveBeenCalled();
  });

  it('should check if Ollama is running for Ollama provider', async () => {
    const mockService = createMockOllamaService();

    const { result } = renderHook(
      () =>
        useOllama({
          provider: 'ollama',
          model: 'llama3.2-vision',
          isInteractive: false,
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    expect(mockService.checkOllamaRunning).toHaveBeenCalled();
    expect(mockService.checkModelExists).toHaveBeenCalledWith('llama3.2-vision');
  });

  it('should prompt for install when Ollama is not installed', async () => {
    const mockService = createMockOllamaService({
      checkOllamaRunning: vi.fn().mockResolvedValue(false),
      checkOllamaInstalled: vi.fn().mockResolvedValue(false),
    });

    const { result } = renderHook(
      () =>
        useOllama({
          provider: 'ollama',
          model: 'llama3.2-vision',
          isInteractive: true, // Interactive mode - will prompt
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('prompt-install');
    });

    expect(result.current.isReady).toBe(false);
  });

  it('should prompt to start when Ollama is installed but not running', async () => {
    const mockService = createMockOllamaService({
      checkOllamaRunning: vi.fn().mockResolvedValue(false),
      checkOllamaInstalled: vi.fn().mockResolvedValue(true),
    });

    const { result } = renderHook(
      () =>
        useOllama({
          provider: 'ollama',
          model: 'llama3.2-vision',
          isInteractive: true,
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('prompt-start');
    });
  });

  it('should pull model when it does not exist', async () => {
    const mockService = createMockOllamaService({
      checkModelExists: vi.fn().mockResolvedValue(false),
    });

    const { result } = renderHook(
      () =>
        useOllama({
          provider: 'ollama',
          model: 'new-model',
          isInteractive: false,
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    expect(mockService.pullModel).toHaveBeenCalledWith('new-model', expect.any(Function));
  });

  it('should handle install confirmation decline', async () => {
    const mockService = createMockOllamaService({
      checkOllamaRunning: vi.fn().mockResolvedValue(false),
      checkOllamaInstalled: vi.fn().mockResolvedValue(false),
    });

    const { result } = renderHook(
      () =>
        useOllama({
          provider: 'ollama',
          model: 'llama3.2-vision',
          isInteractive: true,
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('prompt-install');
    });

    // Decline installation
    await result.current.handleInstallConfirm(false);

    await waitFor(() => {
      expect(result.current.state.status).toBe('cancelled');
    });
  });

  it('should handle start confirmation and proceed to model check', async () => {
    const mockService = createMockOllamaService({
      checkOllamaRunning: vi.fn().mockResolvedValue(false),
      checkOllamaInstalled: vi.fn().mockResolvedValue(true),
    });

    const { result } = renderHook(
      () =>
        useOllama({
          provider: 'ollama',
          model: 'llama3.2-vision',
          isInteractive: true,
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('prompt-start');
    });

    // Accept start
    await result.current.handleStartConfirm(true);

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    expect(mockService.startOllama).toHaveBeenCalled();
    expect(mockService.waitForOllama).toHaveBeenCalled();
  });

  it('should handle start confirmation decline', async () => {
    const mockService = createMockOllamaService({
      checkOllamaRunning: vi.fn().mockResolvedValue(false),
      checkOllamaInstalled: vi.fn().mockResolvedValue(true),
    });

    const { result } = renderHook(
      () =>
        useOllama({
          provider: 'ollama',
          model: 'llama3.2-vision',
          isInteractive: true,
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('prompt-start');
    });

    // Decline start
    await result.current.handleStartConfirm(false);

    await waitFor(() => {
      expect(result.current.state.status).toBe('cancelled');
    });
  });

  it('should show error when Ollama fails to start', async () => {
    const mockService = createMockOllamaService({
      checkOllamaRunning: vi.fn().mockResolvedValue(false),
      checkOllamaInstalled: vi.fn().mockResolvedValue(true),
      waitForOllama: vi.fn().mockResolvedValue(false), // Fails to start
    });

    const { result } = renderHook(
      () =>
        useOllama({
          provider: 'ollama',
          model: 'llama3.2-vision',
          isInteractive: true,
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('prompt-start');
    });

    await result.current.handleStartConfirm(true);

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    expect(result.current.state).toEqual({
      status: 'error',
      message: 'Ollama failed to start within 10 seconds',
    });
  });

  it('should auto-confirm install in non-interactive mode', async () => {
    const mockService = createMockOllamaService({
      checkOllamaRunning: vi.fn().mockResolvedValue(false),
      checkOllamaInstalled: vi.fn().mockResolvedValue(false),
    });

    renderHook(
      () =>
        useOllama({
          provider: 'ollama',
          model: 'llama3.2-vision',
          isInteractive: false, // Non-interactive
        }),
      { wrapper: createWrapper(mockService) }
    );

    // Should auto-confirm and proceed to install
    await waitFor(
      () => {
        expect(mockService.installOllama).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });

  it('should auto-confirm start in non-interactive mode', async () => {
    const mockService = createMockOllamaService({
      checkOllamaRunning: vi.fn().mockResolvedValue(false),
      checkOllamaInstalled: vi.fn().mockResolvedValue(true),
    });

    renderHook(
      () =>
        useOllama({
          provider: 'ollama',
          model: 'llama3.2-vision',
          isInteractive: false, // Non-interactive
        }),
      { wrapper: createWrapper(mockService) }
    );

    // Should auto-confirm and proceed to start
    await waitFor(
      () => {
        expect(mockService.startOllama).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });
});
