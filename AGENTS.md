# AGENTS.md

This is the developer documentation for the **doc-agent** project.

**CRITICAL**: When starting any new task, feature, or fix, you MUST follow **The Drill™** outlined in [WORKFLOW.md](./WORKFLOW.md).

## Project Overview

**doc-agent** is a document extraction and semantic search CLI with MCP (Model Context Protocol) integration. It allows extracting structured data from PDFs and images (e.g., invoices, receipts, bank statements) using Vision AI and performing semantic search over indexed documents.

**Tech Stack:**

-   **Runtime**: Node.js >= 22 (LTS)
-   **Package Manager**: pnpm (using workspaces)
-   **Language**: TypeScript
-   **Build System**: Turborepo + tsup
-   **Linter/Formatter**: Biome
-   **Testing**: Vitest + ink-testing-library
-   **AI Providers**: Ollama (default, local), Google Gemini (cloud)
-   **Database**: SQLite via better-sqlite3 + Drizzle ORM
-   **Vector Database**: LanceDB (via `vectordb` package)
-   **CLI Framework**: Ink (React for CLIs) + Commander.js
-   **OCR**: Tesseract.js (WASM-based, fully local)

## Repository Structure

The project is organized as a monorepo using pnpm workspaces:

```
packages/
├── cli/           # CLI entry point and MCP server
├── core/          # Shared types and interfaces
├── extract/       # Document extraction (Gemini, Ollama)
├── storage/       # SQLite persistence (Drizzle ORM)
└── vector-store/  # Vector database for semantic search
```

## Setup Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run CLI locally during development
pnpm dev extract examples/invoice.pdf

# Run MCP server locally
pnpm mcp
```

## Development Workflow

See [WORKFLOW.md](./WORKFLOW.md) for the complete development process, including:
1. Finding work
2. Planning
3. Implementation
4. Quality Checks
5. Committing & PRs

### Working on the CLI

The CLI is the main entry point (`packages/cli`), built with **Ink** (React for CLIs).

-   **Run CLI**: `pnpm --filter @doc-agent/cli dev ...` (or just `pnpm dev` from root)
-   **Command Structure**:
    -   `doc extract <file>`: Extract data from a document.
    -   `doc mcp`: Start the MCP server.
    -   `doc search <query>`: (Coming soon) Search indexed documents.

**CLI Architecture** (testable by design):
```
packages/cli/src/
├── cli.ts              # Commander.js entry point
├── components/         # Ink React components (UI)
│   ├── ExtractApp.tsx  # Main extraction flow
│   ├── OllamaStatus.tsx
│   └── StreamingOutput.tsx
├── hooks/              # React hooks (stateful logic)
│   ├── useOllama.ts
│   └── useExtraction.ts
├── services/           # Pure functions (external interactions)
│   └── ollama.ts       # Ollama install/start/pull
├── contexts/           # React contexts (dependency injection)
│   ├── OllamaContext.tsx
│   └── ExtractionContext.tsx
└── mcp/                # MCP server
```

### Working on Core Logic

-   **Extraction** (`packages/extract`): Handles AI provider communication and document parsing.
    -   Supports Ollama (local) and Gemini (cloud).
    -   PDF-to-image conversion via `pdf-to-img`.
    -   OCR preprocessing via `tesseract.js` for improved accuracy.
    -   Zod schema validation for AI responses.
-   **Storage** (`packages/storage`): SQLite persistence via Drizzle ORM.
    -   Stores extracted document metadata and JSON data.
    -   Auto-migrates schema on startup.
-   **Vector Store** (`packages/vector-store`): LanceDB for semantic search (coming soon).
-   **Types** (`packages/core`): Shared interfaces (`DocumentData`, `Config`).

### Build Process

Dependencies must be built in order (handled by Turbo):

1.  `@doc-agent/core` (No internal deps)
2.  `@doc-agent/extract` & `@doc-agent/vector-store` (Depend on `core`)
3.  `@doc-agent/cli` (Depends on all above)

**Critical**: Always run `pnpm build` before running the CLI if you've changed shared packages, as the CLI consumes the built output of dependencies.

## Testing

Tests are run using Vitest from the root:

```bash
pnpm test
```

## MCP Integration

The project exposes an MCP server (`packages/cli/src/mcp/server.ts`) that allows AI assistants (like Claude Desktop) to interact with the tool.

**Tools Exposed:**
-   `extract_document`: Extracts data from a file path.
-   `search_documents`: Searches the local index.

## Code Style

-   **Linting/Formatting**: Run `pnpm lint` and `pnpm format` (using Biome).
-   **Commits**: Follow Conventional Commits (e.g., `feat(cli): add new command`).

## Security & Privacy

This is a **privacy-first** tool. All data stays local. When implementing features that touch user data, follow these principles:

### PII Considerations

Before storing or logging any data, ask:
1. **Does this contain PII?** (usernames, paths, emails, IPs)
2. **Is storage necessary?** Can we derive what we need without storing raw PII?
3. **What's the blast radius?** If this data leaks, what's exposed?

**Preferred patterns:**
| Instead of | Use |
|------------|-----|
| `/Users/john/docs/invoice.pdf` | Hash of path + filename only |
| Full error stack with paths | Sanitized error messages |
| Logging request bodies | Logging request metadata only |

### Data Locality

- All extracted document data stays in local SQLite
- No telemetry, no cloud sync, no external API calls (except AI providers)
- User controls their data completely

### AI Provider Data

When sending data to AI providers:
- Gemini/OpenAI: Data leaves machine (user accepts this by providing API key)
- Ollama: Data stays local (default, privacy-first option)

Document these trade-offs clearly in user-facing docs.

## Adding New Features

1.  **New AI Provider**: Update `packages/extract/src/index.ts` to implement the provider logic.
2.  **New CLI Command**: Add the command to `packages/cli/src/cli.ts`.
3.  **New Shared Type**: Add to `packages/core/src/index.ts`.

## Release

Release is handled via GitHub Actions and Changesets.

1.  Run `pnpm changeset` to generate a version bump.
2.  Commit the changeset.
3.  On merge to main, a release PR is created/updated.
