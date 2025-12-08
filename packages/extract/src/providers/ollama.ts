import type { Config, DocumentData } from '@doc-agent/core';
import { z } from 'zod';
import { getMimeType } from '../mime';
import { ocrImages } from '../ocr';
import { pdfToImages } from '../pdf';
import { DocumentDataSchema } from '../schemas';
import type { LogLevel, OcrProgressCallback, StreamCallback } from '../types';

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
 * Extract document data using Ollama local vision model
 */
export async function extractWithOllama(
  filePath: string,
  base64: string,
  config: Config,
  retryCount = 0,
  onStream?: StreamCallback
): Promise<DocumentData> {
  const model = config.ollamaModel || 'llama3.2-vision';
  const mimeType = getMimeType(filePath);

  // Ollama vision models don't support PDF - convert to images first
  let imageBase64 = base64;
  let ocrText = '';

  // Track OCR progress per page (for parallel processing)
  const ocrProgress = new Map<number, number>();
  const formatOcrProgress = (totalPages: number): string => {
    const pages = Array.from(ocrProgress.entries())
      .sort(([a], [b]) => a - b)
      .map(([page, pct]) => `p${page}:${pct}%`)
      .join(' ');
    return `OCR (${ocrProgress.size}/${totalPages}): ${pages}`;
  };

  const ocrProgressCallback: OcrProgressCallback | undefined = onStream
    ? (page, totalPages, progress, _status) => {
        const pct = Math.round(progress * 100);
        ocrProgress.set(page, pct);
        onStream({ type: 'prompt', content: formatOcrProgress(totalPages) });
      }
    : undefined;

  if (mimeType === 'application/pdf') {
    emitLog(onStream, 'info', `Converting PDF to images`, { filePath });
    const pages = await pdfToImages(filePath, onStream);
    if (pages && pages.length > 0) {
      // Use first page for vision model
      imageBase64 = pages[0].toString('base64');
      emitLog(onStream, 'debug', `PDF converted`, {
        pageCount: pages.length,
        firstPageSize: `${Math.round(pages[0].length / 1024)}KB`,
      });

      // OCR all pages in parallel for text reference
      emitLog(onStream, 'info', `Running OCR on ${pages.length} page(s)`, {
        pageCount: pages.length,
      });
      if (onStream) {
        onStream({ type: 'prompt', content: `Running OCR on ${pages.length} page(s)...` });
      }
      ocrText = await ocrImages(pages, ocrProgressCallback, onStream);
    }
  } else {
    // For images, OCR the single image
    const imageBuffer = Buffer.from(base64, 'base64');
    ocrText = await ocrImages([imageBuffer], ocrProgressCallback, onStream);
  }

  const systemPrompt = `Extract document data as JSON.

Schema:
{"type":"receipt"|"invoice"|"bank_statement"|"other","vendor":"string","amount":number,"date":"YYYY-MM-DD","items":[{"description":"string","total":number}]}

Classification:
- receipt = purchase from store/restaurant (has items, subtotal, tax, total)
- invoice = bill for services/goods (has invoice number, amount due)
- bank_statement = bank account transactions (has account number, balance)
- other = none of the above

Amount rules by type:
- receipt: subtotal + tax (IGNORE payment lines like "Credit", "Cash", "Card")
- invoice: "Amount Due" or "Total Due" or "Balance Due"
- bank_statement: ending balance (can be positive or negative)
- other: the main total amount shown

General rules:
- items = line items (products, services, transactions)
- date in YYYY-MM-DD format
- Use the OCR text below as the primary source for text and numbers
- The image is for layout context only`;

  // Include OCR text in the user prompt if available
  const userPrompt = ocrText
    ? `OCR Text (use this for accurate text/numbers):\n${ocrText}\n\nExtract structured data from this document.`
    : `Extract structured data from this ${mimeType.includes('image') ? 'image' : 'document'}.`;

  try {
    const shouldStream = !!onStream;

    emitLog(onStream, 'info', `Starting extraction with ollama`, {
      filePath,
      provider: 'ollama',
    });

    // Log OCR text preview for debugging
    if (ocrText) {
      emitLog(onStream, 'debug', `OCR text preview (first 200 chars)`, {
        preview: ocrText.slice(0, 200).replace(/\n/g, ' '),
        totalLength: ocrText.length,
      });
    }

    // Emit full prompts so user can see what we're asking
    if (onStream) {
      onStream({
        type: 'prompt',
        content: `System:\n${systemPrompt}\n\nUser:\n${userPrompt}`,
      });
    }

    emitLog(onStream, 'debug', `Sending request to Ollama`, {
      model,
      promptLength: userPrompt.length,
      hasImage: true,
    });

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: userPrompt,
        system: systemPrompt,
        images: [imageBase64],
        stream: shouldStream,
        format: 'json', // Force valid JSON output
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      emitLog(onStream, 'error', `Ollama API error: ${response.status}`, {
        status: response.status,
        error: errorText,
      });
      throw new Error(`Ollama API error: ${response.status} ${errorText}`);
    }

    let fullResponse = '';

    if (shouldStream && response.body) {
      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Ollama streams newline-delimited JSON
        for (const line of chunk.split('\n').filter(Boolean)) {
          try {
            const json = JSON.parse(line) as { response?: string; done?: boolean };
            if (json.response) {
              fullResponse += json.response;
              onStream({ type: 'response', content: json.response });
            }
          } catch {
            // Ignore parse errors for partial lines
          }
        }
      }
    } else {
      // Non-streaming response
      const data = (await response.json()) as { response: string };
      fullResponse = data.response;
    }

    let parsed: unknown;

    emitLog(onStream, 'debug', `Model response received`, {
      responseLength: fullResponse.length,
      preview: fullResponse.slice(0, 100),
    });

    try {
      // With format: 'json', Ollama should return valid JSON directly
      parsed = JSON.parse(fullResponse.trim());
    } catch (_parseError) {
      // Fallback: try to extract JSON from response
      const jsonStart = fullResponse.indexOf('{');
      const jsonEnd = fullResponse.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        try {
          parsed = JSON.parse(fullResponse.slice(jsonStart, jsonEnd + 1));
        } catch {
          emitLog(onStream, 'error', `JSON parse failed`, { response: fullResponse });
          throw new Error(`Failed to parse JSON response: ${fullResponse}`);
        }
      } else {
        emitLog(onStream, 'error', `No JSON found in response`, { response: fullResponse });
        throw new Error(`Failed to parse JSON response: ${fullResponse}`);
      }
    }

    emitLog(onStream, 'debug', `Raw parsed JSON`, {
      type: (parsed as Record<string, unknown>).type,
      vendor: (parsed as Record<string, unknown>).vendor,
      amount: (parsed as Record<string, unknown>).amount,
      itemCount: Array.isArray((parsed as Record<string, unknown>).items)
        ? ((parsed as Record<string, unknown>).items as unknown[]).length
        : 0,
    });

    // Validate with Zod
    const validated = DocumentDataSchema.parse(parsed);

    // Build complete DocumentData object
    const result = {
      id: crypto.randomUUID(),
      filename: filePath.split('/').pop() || 'unknown',
      extractedAt: new Date(),
      ...validated,
    };

    emitLog(onStream, 'info', `Extraction successful: ${result.type}`, {
      filePath,
      type: result.type,
      itemCount: result.items?.length ?? 0,
    });

    return result;
  } catch (error) {
    // Retry once on validation failure (without streaming for retry)
    if (retryCount === 0 && error instanceof z.ZodError) {
      emitLog(onStream, 'warn', 'Validation failed, retrying extraction', {
        filePath,
        errors: error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      });
      return extractWithOllama(filePath, base64, config, 1, undefined);
    }
    emitLog(onStream, 'error', 'Extraction failed', { filePath, error: String(error) });
    throw error;
  }
}
