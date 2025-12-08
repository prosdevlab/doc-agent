import { resolve } from 'node:path';
import type { Config, DocumentData } from '@doc-agent/core';
import { extractDocument, type StreamChunk } from '@doc-agent/extract';
import { storage } from '@doc-agent/storage';
import kero from '@lytics/kero';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import {
  checkModelExists,
  checkOllamaInstalled,
  checkOllamaRunning,
  installOllama,
  pullModel,
  startOllama,
  waitForOllama,
  type PullProgress,
} from '../services/ollama';

const logger = kero.createLogger({
  level: (process.env.LOG_LEVEL as 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal') || 'info',
});

export interface ExtractOptions {
  provider: 'gemini' | 'openai' | 'ollama';
  model: string;
  dryRun: boolean;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/**
 * Ensure Ollama is ready (installed, running, model pulled)
 */
async function ensureOllamaReady(model: string): Promise<boolean> {
  const spinner = ora();

  // Check if Ollama is installed
  spinner.start('Checking Ollama installation...');
  const isInstalled = await checkOllamaInstalled();

  if (!isInstalled) {
    spinner.stop();
    logger.info('Ollama not installed');

    const { install } = await prompts({
      type: 'confirm',
      name: 'install',
      message: 'Ollama is not installed. Install via Homebrew?',
      initial: true,
    });

    if (!install) {
      console.log(chalk.yellow('Please install Ollama manually: https://ollama.com/download'));
      return false;
    }

    spinner.start('Installing Ollama via Homebrew...');
    try {
      await installOllama((msg) => {
        spinner.text = msg;
      });
      spinner.succeed('Ollama installed');
      logger.info('Ollama installed successfully');
    } catch (error) {
      spinner.fail('Failed to install Ollama');
      logger.error({ error: String(error) }, 'Ollama installation failed');
      console.error(chalk.red(String(error)));
      return false;
    }
  } else {
    spinner.succeed('Ollama installed');
  }

  // Check if Ollama is running
  spinner.start('Checking Ollama server...');
  let isRunning = await checkOllamaRunning();

  if (!isRunning) {
    spinner.stop();
    logger.info('Ollama server not running');

    const { start } = await prompts({
      type: 'confirm',
      name: 'start',
      message: 'Ollama server is not running. Start it?',
      initial: true,
    });

    if (!start) {
      console.log(chalk.yellow('Please start Ollama: ollama serve'));
      return false;
    }

    spinner.start('Starting Ollama server...');
    startOllama();

    isRunning = await waitForOllama(15000);
    if (!isRunning) {
      spinner.fail('Failed to start Ollama server');
      logger.error('Ollama server failed to start');
      return false;
    }
    spinner.succeed('Ollama server started');
    logger.info('Ollama server started');
  } else {
    spinner.succeed('Ollama server running');
  }

  // Check if model exists
  spinner.start(`Checking model: ${model}...`);
  const modelExists = await checkModelExists(model);

  if (!modelExists) {
    spinner.text = `Pulling model: ${model}...`;
    logger.info({ model }, 'Pulling model');

    try {
      await pullModel(model, (progress: PullProgress) => {
        if (progress.total && progress.completed) {
          const pct = Math.round((progress.completed / progress.total) * 100);
          spinner.text = `Pulling ${model}: ${pct}% (${formatBytes(progress.completed)}/${formatBytes(progress.total)})`;
        } else if (progress.status) {
          spinner.text = `${model}: ${progress.status}`;
        }
      });
      spinner.succeed(`Model ready: ${model}`);
      logger.info({ model }, 'Model pulled successfully');
    } catch (error) {
      spinner.fail(`Failed to pull model: ${model}`);
      logger.error({ model, error: String(error) }, 'Model pull failed');
      return false;
    }
  } else {
    spinner.succeed(`Model ready: ${model}`);
  }

  return true;
}

/**
 * Run document extraction
 */
export async function runExtract(file: string, options: ExtractOptions): Promise<void> {
  const { provider, model, dryRun } = options;
  const absolutePath = resolve(file);

  logger.info({ file: absolutePath, provider, model, dryRun }, 'Starting extraction');

  // For Ollama, ensure everything is ready
  if (provider === 'ollama') {
    const ready = await ensureOllamaReady(model);
    if (!ready) {
      process.exitCode = 1;
      return;
    }
  }

  // Build config
  const config: Config = {
    aiProvider: provider,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: provider === 'gemini' ? model : undefined,
    openaiApiKey: process.env.OPENAI_API_KEY,
    ollamaModel: provider === 'ollama' ? model : undefined,
  };

  // Run extraction
  const spinner = ora('Extracting document data...').start();
  let lastPrompt = '';
  let responseBuffer = '';

  try {
    const result = await extractDocument(absolutePath, config, {
      onStream: (chunk: StreamChunk) => {
        if (!chunk) return;
        
        if (chunk.type === 'log') {
          // Log via kero - use simple string logging to avoid issues
          const msg = `${chunk.message}${chunk.data ? ' ' + JSON.stringify(chunk.data) : ''}`;
          if (chunk.level === 'error') {
            logger.error(msg);
          } else if (chunk.level === 'warn') {
            logger.warn(msg);
          } else if (chunk.level === 'debug') {
            logger.debug(msg);
          } else {
            logger.info(msg);
          }
          
          // Update spinner for info logs
          if (chunk.level === 'info') {
            spinner.text = chunk.message;
          }
        } else if (chunk.type === 'prompt') {
          lastPrompt = chunk.content;
          // Show OCR progress in spinner
          if (chunk.content.includes('OCR')) {
            spinner.text = chunk.content.split('\n')[0];
          }
          // Log full prompt at debug level (only for system/user prompts, not OCR progress)
          if (chunk.content.includes('System:') || chunk.content.includes('User:')) {
            logger.debug(`Prompt to model:\n${chunk.content}`);
          }
        } else if (chunk.type === 'response') {
          responseBuffer += chunk.content;
          // Show that we're receiving response
          spinner.text = `Receiving response... (${responseBuffer.length} chars)`;
        }
      },
    });

    spinner.succeed('Extraction complete');
    logger.info({ type: result.type, itemCount: result.items?.length ?? 0 }, 'Extraction successful');

    // Save to database (unless dry run)
    if (!dryRun) {
      const saveSpinner = ora('Saving to database...').start();
      try {
        await storage.saveDocument(result, absolutePath);
        saveSpinner.succeed(`Saved: ${result.filename} (ID: ${result.id})`);
        logger.info({ id: result.id, filename: result.filename }, 'Document saved');
      } catch (error) {
        saveSpinner.fail('Failed to save');
        logger.error({ error: String(error) }, 'Save failed');
        throw error;
      }
    } else {
      console.log(chalk.gray('(dry run - not saved to database)'));
    }

    // Print result
    console.log(chalk.gray('─'.repeat(40)));
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    spinner.fail('Extraction failed');
    logger.error({ error: String(error) }, 'Extraction failed');
    
    // Show the prompt for debugging if available
    if (lastPrompt) {
      console.log(chalk.gray('\n─── Last Prompt ───'));
      console.log(chalk.gray(lastPrompt.slice(-500))); // Last 500 chars
    }
    
    console.error(chalk.red(String(error)));
    process.exitCode = 1;
  }
}

