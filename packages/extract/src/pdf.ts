import { pdf } from 'pdf-to-img';
import type { LogLevel, StreamCallback } from './types';

/**
 * Helper to emit log via stream callback
 */
function emitLog(
  onStream: StreamCallback | undefined,
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): void {
  onStream?.({ type: 'log', level, message, data });
}

/**
 * Convert PDF to PNG images (all pages) for vision models that don't support PDF
 * @returns Array of image buffers, or null if conversion fails
 */
export async function pdfToImages(
  filePath: string,
  onStream?: StreamCallback
): Promise<Buffer[] | null> {
  try {
    // Higher scale = better OCR quality (3 is good balance of quality vs size)
    const document = await pdf(filePath, { scale: 3 });
    const pages: Buffer[] = [];

    for await (const page of document) {
      pages.push(Buffer.from(page));
    }

    emitLog(onStream, 'debug', `PDF converted: ${pages.length} pages`, {
      filePath,
      pageCount: pages.length,
    });
    return pages.length > 0 ? pages : null;
  } catch (error) {
    emitLog(onStream, 'error', 'PDF conversion failed', {
      filePath,
      error: String(error),
    });
    return null;
  }
}
