# @doc-agent/extract

Extract structured data from invoices, receipts, and bank statements using Vision AI.

## Use cases

- Parse PDF or image documents into structured JSON
- Extract vendor, amount, date, line items from financial documents
- Local privacy-first extraction without cloud APIs (Ollama)

## Exports

- `extractDocument(path, config)` — Main extraction function
- `getMimeType(path)` — Detect MIME type from file extension

## Providers

| Provider | Requires | Best for |
|----------|----------|----------|
| `gemini` | `GEMINI_API_KEY` env var | Accuracy, speed |
| `ollama` | Local Ollama + `llama3.2-vision` | Privacy, offline |

## Depends on

- `@doc-agent/core` — DocumentData, Config types

## Used by

- `@doc-agent/cli` — extract command, MCP server

## Gotchas

- Ollama retries once on Zod validation failure (LLM output can be inconsistent)
- PDF support requires vision-capable model

