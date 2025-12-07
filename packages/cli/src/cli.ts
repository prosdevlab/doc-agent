#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { ExtractApp } from './components/ExtractApp';

const program = new Command();

program
  .name('doc')
  .alias('doc-agent')
  .description('Document extraction and semantic search CLI')
  .version('0.1.0');

program
  .command('extract <file>')
  .description('Extract structured data from a document')
  .option('-p, --provider <provider>', 'AI provider (gemini|openai|ollama)', 'ollama')
  .option(
    '-m, --model <model>',
    'Model to use (default: llama3.2-vision for ollama)',
    'llama3.2-vision'
  )
  .option('-d, --dry-run', 'Print JSON only, do not save to database', false)
  .action(async (file: string, options) => {
    const { waitUntilExit } = render(
      React.createElement(ExtractApp, {
        file,
        provider: options.provider,
        model: options.model,
        dryRun: options.dryRun,
        onComplete: () => {
          // Normal exit
        },
        onError: () => {
          process.exitCode = 1;
        },
      })
    );

    await waitUntilExit();
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
