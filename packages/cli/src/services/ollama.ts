import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export type ProgressCallback = (message: string) => void;
export type PullProgressCallback = (progress: PullProgress) => void;

/**
 * Check if Ollama CLI is installed
 */
export async function checkOllamaInstalled(): Promise<boolean> {
  try {
    await execAsync('which ollama');
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Ollama server is running
 */
export async function checkOllamaRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Install Ollama (macOS via Homebrew, Linux via official script)
 */
export async function installOllama(onProgress?: ProgressCallback): Promise<void> {
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS: Use Homebrew if available
    try {
      await execAsync('which brew');
    } catch {
      throw new Error(
        'Please install Ollama manually: https://ollama.com/download\n' +
          'Or install Homebrew first: https://brew.sh'
      );
    }

    // Stream brew install output for progress
    return new Promise((resolve, reject) => {
      const child = spawn('brew', ['install', 'ollama'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let lastLine = '';

      const handleOutput = (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          lastLine = line.trim();
          if (line.includes('Downloading')) {
            onProgress?.('Downloading Ollama...');
          } else if (line.includes('Pouring')) {
            onProgress?.('Installing Ollama...');
          } else if (line.includes('Caveats')) {
            onProgress?.('Finalizing...');
          }
        }
      };

      child.stdout?.on('data', handleOutput);
      child.stderr?.on('data', handleOutput);

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Installation failed: ${lastLine}`));
        }
      });

      child.on('error', reject);
    });
  } else if (platform === 'linux') {
    onProgress?.('Downloading installer...');
    try {
      await execAsync('curl -fsSL https://ollama.com/install.sh | sh');
    } catch {
      throw new Error(
        'Installation failed (may need sudo).\n' +
          'Try: curl -fsSL https://ollama.com/install.sh | sudo sh'
      );
    }
  } else {
    throw new Error(
      `Automatic install not supported on ${platform}. Visit https://ollama.com/download`
    );
  }
}

/**
 * Start Ollama server in background
 */
export function startOllama(): void {
  const child = spawn('ollama', ['serve'], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

/**
 * Wait for Ollama server to be ready
 */
export async function waitForOllama(maxWaitMs = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await checkOllamaRunning()) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/**
 * Check if a model exists locally
 */
export async function checkModelExists(model: string): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) return false;
    const data = (await response.json()) as { models: { name: string }[] };
    return data.models.some((m) => m.name.includes(model));
  } catch {
    return false;
  }
}

/**
 * Pull a model from Ollama registry with progress updates
 */
export async function pullModel(model: string, onProgress?: PullProgressCallback): Promise<void> {
  const response = await fetch('http://localhost:11434/api/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: model }),
  });

  if (!response.ok) {
    throw new Error(`Failed to pull model: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n').filter(Boolean)) {
      try {
        const progress = JSON.parse(line) as PullProgress;
        onProgress?.(progress);

        if (progress.status === 'success') {
          return;
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
}
