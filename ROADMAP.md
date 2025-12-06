# Roadmap

## Phase 1: Foundation 🏗️ (Completed)
- [x] Project setup with `pnpm` workspaces.
- [x] TypeScript configuration with strict ESM support (`NodeNext`).
- [x] Core package architecture (`core`, `extract`, `vector-store`, `cli`).
- [x] Basic Gemini extraction logic.
- [x] MCP Server shell.

## Phase 2: Core Capabilities 🚀 (Next Steps)
### Vector Search Integration
- [ ] Implement `VectorStore` using **LanceDB**.
- [ ] Create `index` command to ingest documents.
- [ ] Create `search` command for semantic queries.
- [ ] Expose search via MCP tool `search_documents`.

### Enhanced Extraction
- [ ] **Multi-modal Support**: Add logic to handle Images (Receipts, etc) in addition to PDFs.
- [ ] **Provider Expansion**: Implement valid providers for:
    - [ ] OpenAI
    - [ ] Ollama (Local LLM)

## Phase 3: Developer Experience & Polish 💅
- [ ] End-to-End tests with real PDFs.
- [ ] Better CLI output (progress bars, tables).
- [ ] Documentation for setting up local development.

## Phase 4: Future 🔮
- [ ] Recursive document chunking for large files.
- [ ] Watch mode for auto-indexing folder changes.
