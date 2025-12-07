import { describe, expect, it } from 'vitest';
import { getMimeType } from '../index';

describe('getMimeType', () => {
  it('should detect PDF MIME type', () => {
    expect(getMimeType('invoice.pdf')).toBe('application/pdf');
    expect(getMimeType('/path/to/document.PDF')).toBe('application/pdf');
  });

  it('should detect PNG MIME type', () => {
    expect(getMimeType('receipt.png')).toBe('image/png');
    expect(getMimeType('image.PNG')).toBe('image/png');
  });

  it('should detect JPEG MIME type', () => {
    expect(getMimeType('photo.jpg')).toBe('image/jpeg');
    expect(getMimeType('image.JPG')).toBe('image/jpeg');
    expect(getMimeType('photo.jpeg')).toBe('image/jpeg');
    expect(getMimeType('image.JPEG')).toBe('image/jpeg');
  });

  it('should detect GIF MIME type', () => {
    expect(getMimeType('animation.gif')).toBe('image/gif');
  });

  it('should detect WebP MIME type', () => {
    expect(getMimeType('image.webp')).toBe('image/webp');
  });

  it('should default to PDF for unknown extensions', () => {
    expect(getMimeType('document.txt')).toBe('application/pdf');
    expect(getMimeType('file.unknown')).toBe('application/pdf');
    expect(getMimeType('noextension')).toBe('application/pdf');
  });
});
