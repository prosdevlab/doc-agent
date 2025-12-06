import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DocumentData, Config } from '@doc-agent/core';
import { readFileSync } from 'node:fs';

export async function extractDocument(
  filePath: string,
  config: Config
): Promise<DocumentData> {
  const fileBuffer = readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');
  
  if (config.aiProvider === 'gemini') {
    return extractWithGemini(filePath, base64, config);
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
        mimeType: 'application/pdf'
      }
    }
  ]);
  
  const text = result.response.text();
  const extracted = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
  
  return {
    id: crypto.randomUUID(),
    filename: filePath.split('/').pop() || 'unknown',
    extractedAt: new Date(),
    ...extracted
  };
}
