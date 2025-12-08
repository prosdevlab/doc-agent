# Roadmap

## Phase 1: Foundation 🏗️ ✅
- [x] Project setup with `pnpm` workspaces.
- [x] TypeScript configuration with strict ESM support (`NodeNext`).
- [x] Core package architecture (`core`, `extract`, `vector-store`, `cli`).
- [x] Basic Gemini extraction logic.
- [x] MCP Server shell.

## Phase 2: Core Capabilities 🚀 (In Progress)

### Ingestion Pipeline ✅ (Epic #1)
- [x] SQLite persistence layer with Drizzle ORM.
- [x] Ollama extraction strategy (privacy-first default).
- [x] Auto-install Ollama via Homebrew.
- [x] Auto-pull models with progress bar.
- [x] OCR preprocessing with Tesseract.js for accuracy.
- [x] Zod validation for AI responses.

### Enhanced Extraction ✅
- [x] **Multi-modal Support**: PDFs and images (PNG, JPEG, WebP).
- [x] **Provider Expansion**:
    - [x] Ollama (Local LLM) - default
    - [x] Gemini (Cloud)
    - [ ] OpenAI

### Vector Search Integration (Next)
- [ ] Implement `VectorStore` using **LanceDB**.
- [ ] Create `index` command to ingest documents.
- [ ] Create `search` command for semantic queries.
- [ ] Expose search via MCP tool `search_documents`.

## Phase 3: Developer Experience & Polish 💅 (Partial)
- [x] Ink-based CLI with rich interactive output.
- [x] Progress bars and streaming output.
- [x] Comprehensive test coverage (~75%).
- [ ] End-to-End tests with real PDFs.
- [ ] Documentation for setting up local development.

## Phase 4: Future 🔮
- [ ] Recursive document chunking for large files.
- [ ] Watch mode for auto-indexing folder changes.
- [ ] Additional local models (Deepseek, etc.).
