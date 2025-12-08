# doc-agent

Document extraction and semantic search CLI with MCP integration. Extract structured data from invoices, receipts, and bank statements using Vision AI.

## Features

- 🔍 **Document Extraction**: Extract structured data from PDFs and images using Vision AI
- 🦙 **Ollama-First**: Privacy-first default using local `llama3.2-vision` model
- 🔧 **Zero Setup**: Auto-installs Ollama via Homebrew if needed, auto-pulls models
- 📄 **Multi-Format**: Supports PDFs and images (PNG, JPEG, WebP)
- 🔬 **OCR-Enhanced**: Uses Tesseract.js for accurate text extraction from receipts
- 💾 **Local Storage**: All data persists to local SQLite database
- 🔎 **Semantic Search**: Natural language search over indexed documents (coming soon)
- 🤖 **MCP Integration**: Use via Claude Desktop or any MCP-compatible assistant
- 🔒 **Privacy-First**: Data stays on your machine (unless you opt for cloud AI)

## Quick Start

### Installation

```bash
npm install -g doc-agent
```

### Usage

**Extract document data (uses Ollama by default):**
```bash
doc extract invoice.pdf
```

> 💡 Don't have Ollama? No problem! The CLI will offer to install it for you via Homebrew.

**With Gemini (cloud, higher accuracy):**
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
git clone https://github.com/prosdevlab/doc-agent
cd doc-agent
pnpm install

# Build the project
pnpm build

# Run CLI locally
pnpm dev extract examples/invoice.pdf

# Run tests
pnpm test

# Start MCP server
pnpm mcp
```

### Architecture

The CLI is built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs) for rich interactive output:

```
packages/
├── cli/           # Ink-based CLI with services, hooks, and components
├── core/          # Shared types and interfaces
├── extract/       # Document extraction (Gemini, Ollama) + OCR
├── storage/       # SQLite persistence (Drizzle ORM)
└── vector-store/  # Vector database for semantic search
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the project plan.

## License

MIT