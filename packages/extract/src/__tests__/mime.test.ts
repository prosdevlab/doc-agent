import { describe, expect, it } from 'vitest';
import { getMimeType } from '../mime';

describe('getMimeType', () => {
  it('should return correct MIME type for PDF', () => {
    expect(getMimeType('/path/to/file.pdf')).toBe('application/pdf');
    expect(getMimeType('file.PDF')).toBe('application/pdf');
  });

  it('should return correct MIME type for PNG', () => {
    expect(getMimeType('/path/to/image.png')).toBe('image/png');
    expect(getMimeType('IMAGE.PNG')).toBe('image/png');
  });

  it('should return correct MIME type for JPEG', () => {
    expect(getMimeType('photo.jpg')).toBe('image/jpeg');
    expect(getMimeType('photo.jpeg')).toBe('image/jpeg');
    expect(getMimeType('PHOTO.JPG')).toBe('image/jpeg');
  });

  it('should return correct MIME type for GIF', () => {
    expect(getMimeType('animation.gif')).toBe('image/gif');
  });

  it('should return correct MIME type for WebP', () => {
    expect(getMimeType('image.webp')).toBe('image/webp');
  });

  it('should default to application/pdf for unknown extensions', () => {
    expect(getMimeType('file.txt')).toBe('application/pdf');
    expect(getMimeType('file.doc')).toBe('application/pdf');
    expect(getMimeType('file')).toBe('application/pdf');
  });

  it('should handle paths with multiple dots', () => {
    expect(getMimeType('/path/to/my.file.name.pdf')).toBe('application/pdf');
    expect(getMimeType('image.backup.png')).toBe('image/png');
  });
});

