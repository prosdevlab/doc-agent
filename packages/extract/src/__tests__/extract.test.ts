import type { Config } from '@doc-agent/core';
import { describe, expect, it } from 'vitest';
import { extractDocument } from '../index';

describe('extractDocument', () => {
  it('should throw error for unsupported provider', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-unsupported.pdf');
    fs.writeFileSync(testFile, Buffer.from('test pdf content'));

    const config: Config = {
      aiProvider: 'openai' as 'gemini' | 'openai' | 'ollama',
    };

    await expect(extractDocument(testFile, config)).rejects.toThrow('not yet implemented');

    fs.unlinkSync(testFile);
  });
});
