/**
 * @doc-agent/extract
 *
 * Document extraction module for PDFs and images using Vision AI.
 * Supports Ollama (local) and Gemini (cloud) providers.
 */

// Main extraction function
export { extractDocument } from './extract';

// Types
export type { ExtractOptions, LogLevel, OcrProgressCallback, StreamCallback, StreamChunk } from './types';

// Utilities (for testing/advanced usage)
export { getMimeType } from './mime';
export { ocrImages } from './ocr';
export { pdfToImages } from './pdf';
export { DocumentDataSchema, LineItemSchema } from './schemas';

// Providers (for direct access if needed)
export { extractWithGemini, extractWithOllama } from './providers';
