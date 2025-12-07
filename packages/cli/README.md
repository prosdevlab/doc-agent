# @doc-agent/cli

Command-line interface and MCP server for document extraction.

## Use cases

- Extract data from documents via terminal
- Integrate with Claude Desktop or Cursor via MCP
- Batch process directories of documents (planned)

## Commands

| Command | Description |
|---------|-------------|
| `doc extract <file>` | Extract structured data from PDF/image |
| `doc mcp` | Start MCP server for AI assistant integration |
| `doc search <query>` | Search indexed documents (planned) |
| `doc index <dir>` | Batch index directory (planned) |

## Options

```
extract:
  -p, --provider <provider>  AI provider: gemini, openai, ollama (default: ollama)
  -m, --model <model>        Model name (default: llama3.2-vision)
```

## Environment variables

| Variable | Required for |
|----------|--------------|
| `GEMINI_API_KEY` | `--provider gemini` |
| `OPENAI_API_KEY` | `--provider openai` |

## MCP tools

When running `doc mcp`, exposes:
- `extract_document` — Extract data from a file path
- `search_documents` — Search indexed documents (planned)

## Depends on

- `@doc-agent/core` — Types
- `@doc-agent/extract` — Extraction logic
- `@doc-agent/vector-store` — Search (planned)

