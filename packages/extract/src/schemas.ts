import { z } from 'zod';

/**
 * Zod schema for line items in a document (receipts, invoices)
 * Handles model variations in field names
 */
// Helper to coerce number and filter out NaN
const safeNumber = z.coerce
  .number()
  .optional()
  .transform((v) => (v !== undefined && !Number.isNaN(v) ? v : undefined));

export const LineItemSchema = z
  .object({
    // Description variants
    description: z.string().optional(),
    name: z.string().optional(), // Some models use "name"
    item: z.string().optional(), // Some models use "item"
    // Quantity
    quantity: safeNumber,
    qty: safeNumber, // Some models use "qty"
    // Price variants
    unitPrice: safeNumber,
    unit_price: safeNumber,
    price: safeNumber,
    total: safeNumber,
    amount: safeNumber,
  })
  .transform((item) => ({
    description: item.description || item.name || item.item || 'Unknown item',
    quantity: item.quantity ?? item.qty,
    unitPrice: item.unitPrice ?? item.unit_price,
    total: item.total ?? item.price ?? item.amount,
  }));

/**
 * Zod schema for extracted document data
 * Lenient to handle model variations (null vs undefined, missing fields)
 */
/**
 * Try to normalize a date string to ISO format (YYYY-MM-DD)
 * Returns undefined if parsing fails
 */
function normalizeDate(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined;

  // Try to parse common formats
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    // Valid date - format as YYYY-MM-DD
    return parsed.toISOString().split('T')[0];
  }

  // Try MM/DD/YY format (common in US receipts)
  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const normalized = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!Number.isNaN(normalized.getTime())) {
      return normalized.toISOString().split('T')[0];
    }
  }

  return undefined;
}

export const DocumentDataSchema = z
  .object({
    // Default to 'other' if type is missing or invalid
    type: z.enum(['invoice', 'receipt', 'bank_statement', 'other']).default('other').catch('other'),
    // Vendor variants - models use different field names
    vendor: z.string().nullish(),
    store_name: z.string().nullish(), // Some models use "store_name"
    merchant: z.string().nullish(), // Some models use "merchant"
    business_name: z.string().nullish(), // Some models use "business_name"
    // Amount variants
    amount: z.coerce.number().nullish(),
    total: z.coerce.number().nullish(), // Some models use "total" at root level
    total_amount: z.coerce.number().nullish(), // Some models use "total_amount"
    // Date
    date: z.string().nullish(),
    // Items
    items: z.array(LineItemSchema).nullish(),
    rawText: z.string().nullish(),
  })
  .transform((doc) => {
    const rawDate = doc.date ?? undefined;
    return {
      type: doc.type,
      vendor: doc.vendor ?? doc.store_name ?? doc.merchant ?? doc.business_name ?? undefined,
      amount: doc.amount ?? doc.total ?? doc.total_amount ?? undefined,
      date: normalizeDate(rawDate), // Normalized ISO date
      dateRaw: rawDate, // Original from document
      items: doc.items ?? undefined,
      rawText: doc.rawText ?? undefined,
    };
  });

export type ValidatedDocumentData = z.infer<typeof DocumentDataSchema>;
