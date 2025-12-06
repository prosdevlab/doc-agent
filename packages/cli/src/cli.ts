#!/usr/bin/env node
import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { extractDocument } from '@doc-agent/extract';
import type { Config } from '@doc-agent/core';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const program = new Command();

program
  .name('doc')
  .alias('doc-agent')
  .description('Document extraction and semantic search CLI')
  .version('0.1.0');

async function ensureOllamaModel(model: string) {
  const spinner = ora(`Checking for Ollama model: ${model}...`).start();
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      throw new Error('Ollama is not running. Please start Ollama first.');
    }
    const data = await response.json() as { models: { name: string }[] };
    const modelExists = data.models.some(m => m.name.includes(model));

    if (!modelExists) {
      spinner.text = `Pulling Ollama model: ${model} (this may take a while)...`;
      // Use exec to pull so we can potentially see output or just wait
      // Using the API to pull would be better for progress, but for now CLI is robust
      await execAsync(`ollama pull ${model}`);
      spinner.succeed(`Model ${model} ready.`);
    } else {
      spinner.succeed(`Model ${model} found.`);
    }
  } catch (error) {
    spinner.fail('Failed to check/pull Ollama model.');
    throw error;
  }
}

program
  .command('extract <file>')
  .description('Extract structured data from a document')
  .option('-p, --provider <provider>', 'AI provider (gemini|openai|ollama)', 'ollama')
  .option('-m, --model <model>', 'Model to use (default: llama3.2-vision for ollama)', 'llama3.2-vision')
  .action(async (file: string, options) => {
    try {
      if (options.provider === 'ollama') {
        await ensureOllamaModel(options.model);
      }

      const spinner = ora('Extracting document data...').start();
      
      const config: Config = {
        aiProvider: options.provider,
        geminiApiKey: process.env.GEMINI_API_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY,
        ollamaModel: options.model
      };
      
      const result = await extractDocument(file, config);
      
      spinner.succeed(chalk.green('Extraction complete!'));
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      // Only fail the spinner if it's running (ensureOllamaModel might have failed already)
      if (ora().isSpinning) {
         // This check is tricky because ora() creates a new instance. 
         // We'll just log the error.
      }
      console.error(chalk.red('\nExtraction failed:'));
      console.error((error as Error).message);
      process.exit(1);
    }
  });

program
  .command('search <query>')
  .description('Search indexed documents')
  .action(async (query: string) => {
    console.log(chalk.yellow('Search not yet implemented'));
    console.log('Query:', query);
  });

program
  .command('index <directory>')
  .description('Index all documents in a directory')
  .action(async (directory: string) => {
    console.log(chalk.yellow('Batch indexing not yet implemented'));
    console.log('Directory:', directory);
  });

program
   .command('mcp')
  .description('Start MCP server')
  .action(async () => {
    const { startMCPServer } = await import('./mcp/server.js');
    await startMCPServer();
  });

program.parse();
