import { describe, expect, it } from 'vitest';
import { DocumentDataSchema, LineItemSchema } from '../schemas';

describe('LineItemSchema', () => {
  it('should parse valid line item', () => {
    const result = LineItemSchema.parse({
      description: 'Coffee',
      quantity: 2,
      unitPrice: 3.50,
      total: 7.00,
    });

    expect(result).toEqual({
      description: 'Coffee',
      quantity: 2,
      unitPrice: 3.50,
      total: 7.00,
    });
  });

  it('should coerce string numbers to numbers', () => {
    const result = LineItemSchema.parse({
      description: 'Item',
      quantity: '2',
      unitPrice: '3.50',
      total: '7.00',
    });

    expect(result.quantity).toBe(2);
    expect(result.unitPrice).toBe(3.50);
    expect(result.total).toBe(7.00);
  });

  it('should normalize price to total', () => {
    const result = LineItemSchema.parse({
      description: 'Item',
      price: 9.99, // Some models output "price" instead of "total"
    });

    expect(result.total).toBe(9.99);
  });

  it('should prefer total over price when both present', () => {
    const result = LineItemSchema.parse({
      description: 'Item',
      total: 10.00,
      price: 5.00,
    });

    expect(result.total).toBe(10.00);
  });

  it('should handle missing optional fields', () => {
    const result = LineItemSchema.parse({
      description: 'Simple item',
    });

    expect(result).toEqual({
      description: 'Simple item',
      quantity: undefined,
      unitPrice: undefined,
      total: undefined,
    });
  });
});

describe('DocumentDataSchema', () => {
  it('should parse valid document data', () => {
    const result = DocumentDataSchema.parse({
      type: 'receipt',
      vendor: 'Coffee Shop',
      amount: 15.99,
      date: '2024-01-15',
      items: [{ description: 'Latte', total: 5.99 }],
    });

    expect(result.type).toBe('receipt');
    expect(result.vendor).toBe('Coffee Shop');
    expect(result.amount).toBe(15.99);
  });

  it('should default type to other when missing', () => {
    const result = DocumentDataSchema.parse({
      vendor: 'Some Place',
    });

    expect(result.type).toBe('other');
  });

  it('should catch invalid type and default to other', () => {
    const result = DocumentDataSchema.parse({
      type: 'invalid_type',
      vendor: 'Place',
    });

    expect(result.type).toBe('other');
  });

  it('should transform null to undefined', () => {
    const result = DocumentDataSchema.parse({
      type: 'invoice',
      vendor: null,
      amount: null,
      date: null,
      items: null,
    });

    expect(result.vendor).toBeUndefined();
    expect(result.amount).toBeUndefined();
    expect(result.date).toBeUndefined();
    expect(result.items).toBeUndefined();
  });

  it('should coerce string amounts to numbers', () => {
    const result = DocumentDataSchema.parse({
      type: 'receipt',
      amount: '99.99',
    });

    expect(result.amount).toBe(99.99);
  });

  it('should parse all valid document types', () => {
    const types = ['invoice', 'receipt', 'bank_statement', 'other'] as const;

    for (const type of types) {
      const result = DocumentDataSchema.parse({ type });
      expect(result.type).toBe(type);
    }
  });
});

