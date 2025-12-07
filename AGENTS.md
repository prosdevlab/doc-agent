# AGENTS.md

This is the developer documentation for the **doc-agent** project.

**CRITICAL**: When starting any new task, feature, or fix, you MUST follow **The Drill™** outlined in [WORKFLOW.md](./WORKFLOW.md).

## Project Overview

**doc-agent** is a document extraction and semantic search CLI with MCP (Model Context Protocol) integration. It allows extracting structured data from PDFs and images (e.g., invoices, receipts, bank statements) using Vision AI and performing semantic search over indexed documents.

**Tech Stack:**

-   **Runtime**: Node.js >= 22 (LTS)
-   **Package Manager**: pnpm (using workspaces)
-   **Language**: TypeScript
-   **Build System**: Turborepo
-   **Linter/Formatter**: Biome
-   **Testing**: Vitest
-   **AI Providers**: Google Gemini (primary), OpenAI, Ollama
-   **Vector Database**: LanceDB (via `vectordb` package)
-   **CLI Framework**: Commander.js

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

The CLI is the main entry point (`packages/cli`).

-   **Run CLI**: `pnpm --filter @doc-agent/cli dev ...` (or just `pnpm dev` from root)
-   **Command Structure**:
    -   `doc extract <file>`: Extract data from a document.
    -   `doc mcp`: Start the MCP server.
    -   `doc search <query>`: (Coming soon) Search indexed documents.

### Working on Core Logic

-   **Extraction**: Modify `packages/extract`. This handles communication with AI providers (Gemini, etc.) to parse documents.
-   **Storage**: Modify `packages/vector-store`. This manages the local vector database (LanceDB) for semantic search.
-   **Types**: Update `packages/core` for shared interfaces (e.g., `DocumentData`, `Config`).

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

## Adding New Features

1.  **New AI Provider**: Update `packages/extract/src/index.ts` to implement the provider logic.
2.  **New CLI Command**: Add the command to `packages/cli/src/cli.ts`.
3.  **New Shared Type**: Add to `packages/core/src/index.ts`.

## Release

Release is handled via GitHub Actions and Changesets.

1.  Run `pnpm changeset` to generate a version bump.
2.  Commit the changeset.
3.  On merge to main, a release PR is created/updated.
