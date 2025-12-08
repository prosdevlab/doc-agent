/**
 * @vitest-environment jsdom
 */
import type { DocumentData } from '@doc-agent/core';
import { renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtractionProvider, type ExtractionService } from '../../contexts';
import { useExtraction } from '../useExtraction';

// Create mock extraction service
const createMockExtractionService = (
  overrides: Partial<ExtractionService> = {}
): ExtractionService => ({
  extractDocument: vi.fn().mockResolvedValue({
    id: 'test-id',
    filename: 'test.pdf',
    extractedAt: new Date(),
    type: 'receipt',
    vendor: 'Test Vendor',
    amount: 100,
  } as DocumentData),
  saveDocument: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

// Wrapper component for providing context
const createWrapper = (service: ExtractionService) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(ExtractionProvider, { service }, children);
  };
};

describe('useExtraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in idle state', () => {
    const mockService = createMockExtractionService();

    const { result } = renderHook(
      () =>
        useExtraction({
          file: '/path/to/test.pdf',
          provider: 'ollama',
          model: 'llama3.2-vision',
          dryRun: false,
          shouldStart: false, // Don't start extraction
          onComplete: vi.fn(),
          onError: vi.fn(),
        }),
      { wrapper: createWrapper(mockService) }
    );

    expect(result.current.state.status).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('should extract and save when shouldStart is true', async () => {
    const mockService = createMockExtractionService();
    const onComplete = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(
      () =>
        useExtraction({
          file: '/path/to/test.pdf',
          provider: 'ollama',
          model: 'llama3.2-vision',
          dryRun: false,
          shouldStart: true,
          onComplete,
          onError,
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('complete');
    });

    expect(mockService.extractDocument).toHaveBeenCalled();
    expect(mockService.saveDocument).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(result.current.result).not.toBeNull();
    expect(result.current.result?.id).toBe('test-id');
  });

  it('should skip saving in dry run mode', async () => {
    const mockService = createMockExtractionService();
    const onComplete = vi.fn();

    const { result } = renderHook(
      () =>
        useExtraction({
          file: '/path/to/test.pdf',
          provider: 'ollama',
          model: 'llama3.2-vision',
          dryRun: true, // Dry run - skip save
          shouldStart: true,
          onComplete,
          onError: vi.fn(),
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('complete');
    });

    expect(mockService.extractDocument).toHaveBeenCalled();
    expect(mockService.saveDocument).not.toHaveBeenCalled(); // Should not save
    expect(onComplete).toHaveBeenCalled();
  });

  it('should handle extraction errors', async () => {
    const mockService = createMockExtractionService({
      extractDocument: vi.fn().mockRejectedValue(new Error('Extraction failed')),
    });
    const onError = vi.fn();

    const { result } = renderHook(
      () =>
        useExtraction({
          file: '/path/to/test.pdf',
          provider: 'ollama',
          model: 'llama3.2-vision',
          dryRun: false,
          shouldStart: true,
          onComplete: vi.fn(),
          onError,
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    expect(result.current.state).toEqual({
      status: 'error',
      message: 'Extraction failed',
    });
    expect(onError).toHaveBeenCalled();
  });

  it('should handle save errors', async () => {
    const mockService = createMockExtractionService({
      saveDocument: vi.fn().mockRejectedValue(new Error('Save failed')),
    });
    const onError = vi.fn();

    const { result } = renderHook(
      () =>
        useExtraction({
          file: '/path/to/test.pdf',
          provider: 'ollama',
          model: 'llama3.2-vision',
          dryRun: false,
          shouldStart: true,
          onComplete: vi.fn(),
          onError,
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    expect(result.current.state).toEqual({
      status: 'error',
      message: 'Save failed',
    });
    expect(onError).toHaveBeenCalled();
  });

  it('should pass correct config for gemini provider', async () => {
    const mockService = createMockExtractionService();

    renderHook(
      () =>
        useExtraction({
          file: '/path/to/test.pdf',
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          dryRun: true,
          shouldStart: true,
          onComplete: vi.fn(),
          onError: vi.fn(),
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(mockService.extractDocument).toHaveBeenCalled();
    });

    const callArgs = (mockService.extractDocument as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].aiProvider).toBe('gemini');
    expect(callArgs[1].geminiModel).toBe('gemini-2.5-flash');
  });

  it('should handle streaming callbacks', async () => {
    const mockExtract = vi.fn().mockImplementation(async (_file, _config, options) => {
      // Simulate streaming
      options?.onStream?.({ type: 'prompt', content: 'System prompt...' });
      options?.onStream?.({ type: 'response', content: '{"type": "receipt"}' });

      return {
        id: 'test-id',
        filename: 'test.pdf',
        extractedAt: new Date(),
        type: 'receipt',
      } as DocumentData;
    });

    const mockService = createMockExtractionService({
      extractDocument: mockExtract,
    });

    const { result } = renderHook(
      () =>
        useExtraction({
          file: '/path/to/test.pdf',
          provider: 'ollama',
          model: 'llama3.2-vision',
          dryRun: true,
          shouldStart: true,
          onComplete: vi.fn(),
          onError: vi.fn(),
        }),
      { wrapper: createWrapper(mockService) }
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('complete');
    });

    // Streaming content should be captured
    expect(result.current.promptContent).toBe('System prompt...');
    // Response content may be throttled, just check it was called
    expect(mockExtract).toHaveBeenCalled();
  });
});
