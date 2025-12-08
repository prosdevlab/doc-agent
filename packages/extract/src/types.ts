/**
 * Streaming types for extraction progress feedback
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type StreamChunk =
  | { type: 'prompt'; content: string }
  | { type: 'response'; content: string }
  | { type: 'log'; level: LogLevel; message: string; data?: Record<string, unknown> };

export type StreamCallback = (chunk: StreamChunk) => void;

export interface ExtractOptions {
  onStream?: StreamCallback;
}

/**
 * OCR progress callback for multi-page processing
 */
export type OcrProgressCallback = (
  page: number,
  totalPages: number,
  progress: number,
  status: string
) => void;

