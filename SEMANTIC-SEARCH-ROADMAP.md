# Semantic Search Roadmap

Technical roadmap for implementing production-grade semantic search and RAG capabilities in `doc-agent`.

---

## Architecture

### Vector Store: Provider Pattern

Support multiple vector store backends via a common interface. The vector store is decoupled from chunk storage—it only knows about IDs and embeddings.

```typescript
interface VectorStoreItem {
  id: string;                           // maps to Chunk.id
  embedding: number[];
  metadata?: Record<string, unknown>;   // for filtering
}

interface VectorStoreResult {
  id: string;
  score: number;
}

interface VectorStore {
  name: string;
  insert(items: VectorStoreItem[]): Promise<void>;
  search(
    queryEmbedding: number[],
    topK: number,
    filters?: Record<string, unknown>
  ): Promise<VectorStoreResult[]>;
  delete(ids: string[]): Promise<void>;
}
```

Implementations:
- `CustomVectorStore` — brute-force → HNSW
- `LanceDBVectorStore` — baseline comparison

The search orchestrator hydrates results by joining `VectorStoreResult.id` against the `chunks` table.

### Chunking Strategies

| Strategy | Flag | Implementation | Best For |
|----------|------|----------------|----------|
| **Line** | `--chunk line` | Split on `\n`, group empty lines | Receipts, invoices |
| **Sentence** | `--chunk sentence` | NLP tokenizer | Natural text |
| **Semantic** | `--chunk semantic` | LLM-assisted boundary detection | Contracts, reports |

Auto-routing by document type:
- Receipts/invoices → `line`
- Bank statements → `line` or `sentence`
- Contracts/reports → `semantic`

### Embedding Providers

```typescript
interface EmbeddingProvider {
  name: string;
  dims: number;
  embed(texts: string[]): Promise<number[][]>;
}
```

| Provider | Models | Notes |
|----------|--------|-------|
| **Ollama** (default) | `nomic-embed-text`, `mxbai-embed-large` | Local, no API key |
| **OpenAI** | `text-embedding-3-small` | High quality |
| **Gemini** | `text-embedding-005`, `text-multilingual-embedding-002` | Multilingual support |
| **Transformers.js** | Local ONNX | Zero external deps |

### LLM Providers

```typescript
interface LLMProvider {
  name: string;
  generate(prompt: string, options?: { system?: string }): Promise<string>;
}
```

| Provider | Models | Notes |
|----------|--------|-------|
| **Ollama** (default) | `llama3.2`, `mistral` | Local |
| **OpenAI** | `gpt-4o-mini` | High quality |
| **Gemini** | `gemini-1.5-flash` | Fast |

### Storage Model

```sql
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id),
  content TEXT NOT NULL,
  metadata JSON,
  chunk_index INTEGER NOT NULL
);
```

**Embedding storage:**
- **Phase 1:** SQLite BLOB (brute-force search)
- **Phase 2+:** Vector store's native format (HNSW memory-mapped files)

### Hybrid Search

FTS5 contentless index alongside vector search:

```sql
CREATE VIRTUAL TABLE chunks_fts USING fts5(
  content,
  content='chunks',
  content_rowid='id'
);
```

Both FTS5 and vector search return `chunk.id`, enabling fusion:

```typescript
interface HybridSearchResult {
  chunk: Chunk;
  vectorScore?: number;
  keywordScore?: number;
  combinedScore: number;
  ranks: {
    vectorRank?: number;
    keywordRank?: number;
  };
}
```

Search modes:
- `--mode vector` — Cosine similarity only
- `--mode keyword` — BM25 only
- `--mode hybrid` — RRF fusion

### Reranking

```typescript
interface Reranker {
  rerank(query: string, candidates: ScoredChunk[]): Promise<ScoredChunk[]>;
}
```

Reranker receives scored results to preserve retrieval context for debugging and score blending.

### RAG Pipeline

```typescript
interface RAGResponse {
  answer: string;
  chunks: RAGChunk[];
  debug?: {
    vectorResults: ScoredChunk[];
    keywordResults: ScoredChunk[];
    rerankedResults: ScoredChunk[];
    stats: {
      vectorLatencyMs: number;
      keywordLatencyMs?: number;
      rerankLatencyMs?: number;
      totalLatencyMs: number;
    };
  };
}
```

Exposed via:
1. CLI: `doc search "query" --rag`
2. MCP: `search_documents` tool
3. HTTP: `POST /rag` (optional)

### Evaluation

```typescript
interface EvalQuery {
  id: string;
  query: string;
  relevantChunkIds: string[];
  category?: string;
}

interface EvalDataset {
  name: string;
  chunks: Chunk[];
  queries: EvalQuery[];
}

interface EvalResult {
  recallAtK: Record<number, number>;
  precisionAtK: Record<number, number>;
  mrr: number;
  byCategory?: Record<string, EvalResult>;
}
```

---

## Phase 1: Vector Search Core

### Scope

- Chunking module (`line`, `sentence`)
- Embedding provider abstraction + Ollama implementation
- Custom vector store with brute-force cosine similarity
- `chunks` table in SQLite
- CLI: `doc ingest` and `doc search`
- Evaluation harness

### File Structure

```
packages/vector-store/src/
├── chunking/
│   ├── types.ts
│   ├── line.ts
│   └── sentence.ts
├── embeddings/
│   ├── types.ts
│   └── ollama.ts
├── stores/
│   ├── types.ts
│   └── custom.ts
├── eval/
│   ├── types.ts
│   ├── dataset.ts
│   └── metrics.ts
├── search.ts
└── index.ts
```

### Deliverables

- [ ] `Chunk` and `ChunkingStrategy` types
- [ ] Line chunker
- [ ] Sentence chunker
- [ ] `EmbeddingProvider` interface
- [ ] Ollama embedding provider
- [ ] `VectorStore` interface
- [ ] Brute-force cosine similarity
- [ ] `chunks` schema migration
- [ ] Search orchestrator
- [ ] `doc ingest <file>` command
- [ ] `doc search <query>` command
- [ ] Evaluation dataset
- [ ] `doc eval` command

### Benchmarks

- Chunk size vs recall@k
- Embedding latency by provider

---

## Phase 2: Hybrid Search

### Scope

- FTS5 integration for keyword search
- BM25 scoring
- Reciprocal Rank Fusion (RRF)
- HNSW index
- Metadata filtering

### File Structure Additions

```
packages/vector-store/src/
├── ranking/
│   ├── bm25.ts
│   ├── rrf.ts
│   └── hybrid.ts
├── stores/
│   └── hnsw.ts
```

### Deliverables

- [ ] FTS5 virtual table + sync triggers
- [ ] `bm25Search()` function
- [ ] `rrfFusion()` function
- [ ] `HybridSearchResult` type
- [ ] `hybridSearch()` orchestrator
- [ ] `--mode vector | keyword | hybrid` flag
- [ ] HNSW vector store
- [ ] `--filter` metadata filtering

### Benchmarks

- Vector vs keyword vs hybrid recall
- HNSW accuracy vs brute-force
- HNSW latency vs `ef` parameter
- Custom vs LanceDB comparison

---

## Phase 3: RAG & Evaluation

### Scope

- LLM provider abstraction
- Reranking
- RAG engine with citations
- MCP tool integration
- Provider comparison

### File Structure Additions

```
packages/vector-store/src/
├── llm/
│   ├── types.ts
│   └── ollama.ts
├── rerank/
│   ├── types.ts
│   └── ollama.ts
├── rag/
│   ├── types.ts
│   ├── engine.ts
│   └── prompts.ts
```

### Deliverables

- [ ] `LLMProvider` interface
- [ ] Ollama LLM provider
- [ ] `Reranker` interface
- [ ] Ollama reranker
- [ ] `runRAG()` engine
- [ ] RAG prompt templates
- [ ] `doc search --rag` command
- [ ] MCP `search_documents` tool
- [ ] Provider comparison report

### Benchmarks

- Reranking impact on precision
- Context window size vs answer quality
- Embedding provider comparison (recall, latency)

---

## Future

- [ ] HTTP server (`POST /rag`)
- [ ] Search debugging UI
- [ ] OpenAI / Gemini providers
- [ ] Transformers.js embeddings
- [ ] Semantic chunking
- [ ] Index persistence
- [ ] Embeddings versioning
- [ ] Query caching
- [ ] Multi-modal search

---

## Types Reference

```typescript
// ─────────────────────────────────────────────────────────────
// Chunking
// ─────────────────────────────────────────────────────────────

interface Chunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  metadata: {
    page?: number;
    section?: string;
    source: string;
    [key: string]: unknown;
  };
}

type ChunkingStrategy = 'line' | 'sentence' | 'semantic';

interface Chunker {
  strategy: ChunkingStrategy;
  chunk(text: string, documentId: string, metadata?: Record<string, unknown>): Chunk[];
}

// ─────────────────────────────────────────────────────────────
// Embeddings
// ─────────────────────────────────────────────────────────────

interface EmbeddingProvider {
  name: string;
  dims: number;
  embed(texts: string[]): Promise<number[][]>;
}

// ─────────────────────────────────────────────────────────────
// Vector Store
// ─────────────────────────────────────────────────────────────

interface VectorStoreItem {
  id: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

interface VectorStoreResult {
  id: string;
  score: number;
}

interface VectorStore {
  name: string;
  insert(items: VectorStoreItem[]): Promise<void>;
  search(
    queryEmbedding: number[],
    topK: number,
    filters?: Record<string, unknown>
  ): Promise<VectorStoreResult[]>;
  delete(ids: string[]): Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// LLM
// ─────────────────────────────────────────────────────────────

interface LLMProvider {
  name: string;
  generate(prompt: string, options?: { system?: string }): Promise<string>;
}

// ─────────────────────────────────────────────────────────────
// Ranking
// ─────────────────────────────────────────────────────────────

interface ScoredChunk {
  chunk: Chunk;
  vectorScore?: number;
  keywordScore?: number;
  combinedScore: number;
}

interface HybridSearchResult extends ScoredChunk {
  ranks: {
    vectorRank?: number;
    keywordRank?: number;
  };
}

interface Reranker {
  rerank(query: string, candidates: ScoredChunk[]): Promise<ScoredChunk[]>;
}

// ─────────────────────────────────────────────────────────────
// RAG
// ─────────────────────────────────────────────────────────────

interface RAGRequest {
  query: string;
  topK?: number;
  mode?: 'vector' | 'keyword' | 'hybrid';
  filters?: Record<string, unknown>;
  rerank?: boolean;
}

interface RAGChunk {
  id: string;
  content: string;
  score: number;
  source: {
    documentId: string;
    filename: string;
    page?: number;
  };
}

interface RAGResponse {
  answer: string;
  chunks: RAGChunk[];
  debug?: {
    vectorResults: ScoredChunk[];
    keywordResults: ScoredChunk[];
    rerankedResults: ScoredChunk[];
    stats: {
      vectorLatencyMs: number;
      keywordLatencyMs?: number;
      rerankLatencyMs?: number;
      totalLatencyMs: number;
    };
  };
}

// ─────────────────────────────────────────────────────────────
// Evaluation
// ─────────────────────────────────────────────────────────────

interface EvalQuery {
  id: string;
  query: string;
  relevantChunkIds: string[];
  category?: string;
}

interface EvalDataset {
  name: string;
  description?: string;
  chunks: Chunk[];
  queries: EvalQuery[];
}

interface EvalResult {
  recallAtK: Record<number, number>;
  precisionAtK: Record<number, number>;
  mrr: number;
  byCategory?: Record<string, EvalResult>;
}
```

---

## CLI Reference

```bash
# Ingestion
doc ingest <file>
doc ingest <file> --chunk line|sentence|semantic
doc ingest <file> --embed-provider ollama|openai|gemini|transformers
doc ingest <file> --embed-model <model-name>

# Search
doc search <query>
doc search <query> --mode vector|keyword|hybrid
doc search <query> --vector-store custom|lancedb
doc search <query> --filter "key:value"
doc search <query> --rag
doc search <query> --rerank
doc search <query> --top-k 10
doc search <query> --json

# Evaluation
doc eval --dataset <path>
doc eval --compare ollama,openai,gemini

# Servers
doc mcp
doc serve --port 3000
```

---

## References

- [HNSW Paper](https://arxiv.org/abs/1603.09320) — Hierarchical Navigable Small World graphs
- [BM25 Explained](https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables)
- [RRF Paper](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf) — Reciprocal Rank Fusion
- [RAG Paper](https://arxiv.org/abs/2005.11401) — Retrieval-Augmented Generation
