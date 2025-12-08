import type { Config, DocumentData } from '@doc-agent/core';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Extract document data using Google Gemini Vision API
 */
export async function extractWithGemini(
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

