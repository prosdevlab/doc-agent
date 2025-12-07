# doc-agent

Document extraction and semantic search CLI with MCP integration. Extract structured data from invoices, receipts, and bank statements using Vision AI.

## Features

- 🔍 **Document Extraction**: Extract structured data from PDFs and images using Gemini Vision
- 🔎 **Semantic Search**: Natural language search over indexed documents (coming soon)
- 🤖 **MCP Integration**: Use via Claude Desktop or any MCP-compatible assistant
- 🔒 **Privacy-First**: Runs locally, data stays on your machine
- ⚡ **BYOK**: Bring your own API keys (Gemini, OpenAI, or local Ollama)

## Quick Start

### Installation

```bash
npm install -g doc-agent
```

### Usage

**Extract document data:**
```bash
doc extract invoice.pdf
```

**With Ollama (local, privacy-first):**
```bash
# Ensure Ollama is running
doc extract invoice.pdf --provider ollama
```

**With Gemini (cloud):**
```bash
export GEMINI_API_KEY=your_key_here
doc extract invoice.pdf --provider gemini
```

**Start MCP server:**
```bash
doc mcp
```

### Claude Desktop Integration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "doc-agent": {
      "command": "npx",
      "args": ["-y", "doc-agent", "mcp"],
      "env": {
        "GEMINI_API_KEY": "your_key_here"
      }
    }
  }
}
```

Then in Claude Desktop:
> "Extract data from ~/Downloads/invoice.pdf"

## Development

```bash
# Clone and install dependencies
git clone https://github.com/yourusername/doc-agent
cd doc-agent
pnpm install

# Build the project
pnpm -r build

# Run CLI locally
pnpm dev extract examples/invoice.pdf

# Start MCP server
pnpm mcp
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the project plan.

## License

MIT