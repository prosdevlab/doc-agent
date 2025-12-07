import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { Config, DocumentData } from '@doc-agent/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Zod schema for DocumentData validation
const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  total: z.number().optional(),
});

const DocumentDataSchema = z.object({
  type: z.enum(['invoice', 'receipt', 'bank_statement', 'other']),
  vendor: z.string().optional(),
  amount: z.number().optional(),
  date: z.string().optional(),
  items: z.array(LineItemSchema).optional(),
  rawText: z.string().optional(),
});

// Helper to detect MIME type from file extension
function getMimeType(filePath: string): string {
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

export async function extractDocument(filePath: string, config: Config): Promise<DocumentData> {
  const fileBuffer = readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');

  if (config.aiProvider === 'gemini') {
    return extractWithGemini(filePath, base64, config);
  }

  if (config.aiProvider === 'ollama') {
    return extractWithOllama(filePath, base64, config);
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
  const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
  retryCount = 0
): Promise<DocumentData> {
  const model = config.ollamaModel || 'llama3.2-vision';
  const mimeType = getMimeType(filePath);

  const systemPrompt = `You are a document extraction assistant. Extract structured data from invoices, receipts, and bank statements.

CRITICAL: You must respond with ONLY valid JSON, no markdown, no code blocks, no explanations. Just the raw JSON object.

Expected JSON format:
{
  "type": "invoice" | "receipt" | "bank_statement" | "other",
  "vendor": "company or vendor name if available",
  "amount": total_amount_as_number_if_available,
  "date": "YYYY-MM-DD format if available",
  "items": [{"description": "item description", "quantity": number, "unitPrice": number, "total": number}]
}

All fields except "type" are optional. Only include fields you can confidently extract.`;

  const userPrompt = `Extract structured data from this ${mimeType.includes('image') ? 'image' : 'PDF'} document. Return only valid JSON.`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: userPrompt,
        system: systemPrompt,
        images: [base64],
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as { response: string };
    let parsed: unknown;

    try {
      // Clean up response (remove markdown code blocks if present)
      const cleaned = data.response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (_parseError) {
      throw new Error(`Failed to parse JSON response: ${data.response}`);
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
    // Retry once on validation failure
    if (retryCount === 0 && error instanceof z.ZodError) {
      return extractWithOllama(filePath, base64, config, 1);
    }
    throw error;
  }
}
