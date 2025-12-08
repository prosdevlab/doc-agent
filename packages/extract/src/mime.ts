import { extname } from 'node:path';

/**
 * MIME type mappings for supported file extensions
 */
const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * Detect MIME type from file extension
 * Defaults to 'application/pdf' for unknown extensions
 */
export function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/pdf';
}
