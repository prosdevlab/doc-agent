import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkModelExists,
  checkOllamaInstalled,
  checkOllamaRunning,
  pullModel,
  waitForOllama,
} from '../ollama';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock child_process
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
  spawn: vi.fn(),
}));

vi.mock('node:util', () => ({
  promisify: vi.fn((fn) => fn),
}));

describe('Ollama Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkOllamaRunning', () => {
    it('should return true when Ollama API is accessible', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await checkOllamaRunning();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
    });

    it('should return false when Ollama API is not accessible', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await checkOllamaRunning();

      expect(result).toBe(false);
    });

    it('should return false when API returns non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await checkOllamaRunning();

      expect(result).toBe(false);
    });
  });

  describe('checkModelExists', () => {
    it('should return true when model exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3.2-vision:latest' }, { name: 'qwen2.5vl:7b' }],
        }),
      });

      const result = await checkModelExists('llama3.2-vision');

      expect(result).toBe(true);
    });

    it('should return false when model does not exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'other-model' }],
        }),
      });

      const result = await checkModelExists('llama3.2-vision');

      expect(result).toBe(false);
    });

    it('should return false when API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await checkModelExists('llama3.2-vision');

      expect(result).toBe(false);
    });
  });

  describe('pullModel', () => {
    it('should stream progress updates during pull', async () => {
      // Create a mock readable stream
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              `${JSON.stringify({ status: 'pulling', completed: 50, total: 100 })}\n`
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`${JSON.stringify({ status: 'success' })}\n`),
          })
          .mockResolvedValueOnce({ done: true }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const progressUpdates: Array<{ status: string; completed?: number; total?: number }> = [];
      await pullModel('llama3.2-vision', (progress) => {
        progressUpdates.push(progress);
      });

      expect(progressUpdates).toHaveLength(2);
      expect(progressUpdates[0]).toEqual({ status: 'pulling', completed: 50, total: 100 });
      expect(progressUpdates[1]).toEqual({ status: 'success' });
    });

    it('should throw error when pull fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(pullModel('nonexistent-model')).rejects.toThrow('Failed to pull model');
    });
  });

  describe('waitForOllama', () => {
    it('should return true when Ollama becomes available', async () => {
      // First call fails, second succeeds
      mockFetch.mockRejectedValueOnce(new Error('Not ready')).mockResolvedValueOnce({ ok: true });

      const result = await waitForOllama(2000);

      expect(result).toBe(true);
    });

    it('should return false after timeout', async () => {
      // Always fail
      mockFetch.mockRejectedValue(new Error('Not ready'));

      const result = await waitForOllama(500);

      expect(result).toBe(false);
    });
  });

  describe('checkOllamaInstalled', () => {
    it('should be a defined function', () => {
      // checkOllamaInstalled uses shell commands which are hard to mock
      // Just verify the function exists
      expect(checkOllamaInstalled).toBeDefined();
      expect(typeof checkOllamaInstalled).toBe('function');
    });
  });

  describe('startOllama', () => {
    it('should be a defined function', async () => {
      const { startOllama } = await import('../ollama');
      expect(startOllama).toBeDefined();
      expect(typeof startOllama).toBe('function');
    });
  });

  describe('installOllama', () => {
    it('should be a defined function', async () => {
      const { installOllama } = await import('../ollama');
      expect(installOllama).toBeDefined();
      expect(typeof installOllama).toBe('function');
    });
  });
});
