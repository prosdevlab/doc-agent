import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { Config, DocumentData } from '@doc-agent/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { pdf } from 'pdf-to-img';
import Tesseract from 'tesseract.js';
import { z } from 'zod';

// Zod schema for DocumentData validation (lenient to handle model variations)
// Use coerce to handle strings like "22.40" -> 22.40
const LineItemSchema = z
  .object({
    description: z.string(),
    quantity: z.coerce.number().optional(),
    unitPrice: z.coerce.number().optional(),
    total: z.coerce.number().optional(),
    price: z.coerce.number().optional(), // Some models output "price" instead of "total"
  })
  .transform((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total ?? item.price, // Normalize price -> total
  }));

const DocumentDataSchema = z.object({
  // Default to 'other' if type is missing or invalid
  type: z.enum(['invoice', 'receipt', 'bank_statement', 'other']).default('other').catch('other'),
  vendor: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  amount: z.coerce
    .number()
    .nullish()
    .transform((v) => v ?? undefined),
  date: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  items: z
    .array(LineItemSchema)
    .nullish()
    .transform((v) => v ?? undefined),
  rawText: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
});

// Helper to detect MIME type from file extension
export function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'application/pdf';
}

// Convert PDF to PNG images (all pages) for vision models that don't support PDF
// Returns array of base64 images, or null if conversion fails
async function pdfToImages(filePath: string): Promise<Buffer[] | null> {
  try {
    const document = await pdf(filePath, { scale: 2 });
    const pages: Buffer[] = [];

    for await (const page of document) {
      pages.push(Buffer.from(page));
    }

    return pages.length > 0 ? pages : null;
  } catch {
    // Invalid PDF or other error
    return null;
  }
}

// OCR all images in parallel using tesseract.js
// Returns concatenated text with page markers
async function ocrImages(images: Buffer[]): Promise<string> {
  if (images.length === 0) return '';

  try {
    // Process all pages in parallel
    const results = await Promise.all(
      images.map(async (image, index) => {
        try {
          const result = await Tesseract.recognize(image, 'eng', {
            logger: () => {}, // Silent
          });
          return { page: index + 1, text: result.data.text };
        } catch {
          return { page: index + 1, text: '' };
        }
      })
    );

    // Concatenate with page markers
    return results
      .filter((r) => r.text.trim())
      .map((r) => `--- Page ${r.page} ---\n${r.text.trim()}`)
      .join('\n\n');
  } catch {
    return '';
  }
}

export type StreamChunk =
  | { type: 'prompt'; content: string }
  | { type: 'response'; content: string };

export type StreamCallback = (chunk: StreamChunk) => void;

export interface ExtractOptions {
  onStream?: StreamCallback;
}

export async function extractDocument(
  filePath: string,
  config: Config,
  options?: ExtractOptions
): Promise<DocumentData> {
  const fileBuffer = readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');

  if (config.aiProvider === 'gemini') {
    return extractWithGemini(filePath, base64, config);
  }

  if (config.aiProvider === 'ollama') {
    return extractWithOllama(filePath, base64, config, 0, options?.onStream);
  }

  throw new Error(`Provider ${config.aiProvider} not yet implemented`);
}

async function extractWithGemini(
  filePath: string,
  base64: string,
  config: Config
): Promise<DocumentData> {
  if (!config.geminiApiKey) {
    throw new Error('Gemini API key required. Set GEMINI_API_KEY env variable.');
  }

  const genai = new GoogleGenerativeAI(config.geminiApiKey);
  const modelName = config.geminiModel || 'gemini-2.5-flash';
  const model = genai.getGenerativeModel({ model: modelName });

  const prompt = `Extract structured data from this document as JSON:
{
  "type": "invoice" | "receipt" | "bank_statement",
  "vendor": "company name",
  "amount": total_amount_number,
  "date": "YYYY-MM-DD",
  "items": [{"description": "...", "total": number}]
}

Only respond with valid JSON, no markdown formatting.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64,
        mimeType: 'application/pdf',
      },
    },
  ]);

  const text = result.response.text();
  const extracted = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, ''));

  return {
    id: crypto.randomUUID(),
    filename: filePath.split('/').pop() || 'unknown',
    extractedAt: new Date(),
    ...extracted,
  };
}

async function extractWithOllama(
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

  if (mimeType === 'application/pdf') {
    const pages = await pdfToImages(filePath);
    if (pages && pages.length > 0) {
      // Use first page for vision model
      imageBase64 = pages[0].toString('base64');

      // OCR all pages in parallel for text reference
      if (onStream) {
        onStream({ type: 'prompt', content: `Running OCR on ${pages.length} page(s)...` });
      }
      ocrText = await ocrImages(pages);
    }
  } else {
    // For images, OCR the single image
    const imageBuffer = Buffer.from(base64, 'base64');
    ocrText = await ocrImages([imageBuffer]);
  }

  const systemPrompt = `Extract receipt/invoice data as JSON.

Schema:
{"type":"receipt"|"invoice"|"bank_statement"|"other","vendor":"string","amount":number,"date":"YYYY-MM-DD","items":[{"description":"string","total":number}]}

Rules:
- amount = final total paid
- items = only purchased items (not tax/fees/service charges)
- date in YYYY-MM-DD format
- Use the OCR text below as the primary source for text and numbers
- The image is for layout context only`;

  // Include OCR text in the user prompt if available
  const userPrompt = ocrText
    ? `OCR Text (use this for accurate text/numbers):\n${ocrText}\n\nExtract structured data from this document.`
    : `Extract structured data from this ${mimeType.includes('image') ? 'image' : 'document'}.`;

  try {
    const shouldStream = !!onStream;

    // Emit full prompts so user can see what we're asking
    if (onStream) {
      onStream({
        type: 'prompt',
        content: `System:\n${systemPrompt}\n\nUser:\n${userPrompt}`,
      });
    }

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
          throw new Error(`Failed to parse JSON response: ${fullResponse}`);
        }
      } else {
        throw new Error(`Failed to parse JSON response: ${fullResponse}`);
      }
    }

    // Validate with Zod
    const validated = DocumentDataSchema.parse(parsed);

    // Build complete DocumentData object
    return {
      id: crypto.randomUUID(),
      filename: filePath.split('/').pop() || 'unknown',
      extractedAt: new Date(),
      ...validated,
    };
  } catch (error) {
    // Retry once on validation failure (without streaming for retry)
    if (retryCount === 0 && error instanceof z.ZodError) {
      return extractWithOllama(filePath, base64, config, 1, undefined);
    }
    throw error;
  }
}
