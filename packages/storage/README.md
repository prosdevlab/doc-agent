# @doc-agent/storage

SQLite persistence layer for extracted documents using Drizzle ORM.

## Use cases

- Store extracted document data locally
- Query documents by ID or list all
- Track document processing status (pending, indexed, failed)

## Exports

- `DocumentRepository` — Main repository class
- `storage` — Singleton instance
- `createDb(connectionString?)` — Database factory
- `getDbPath()` — Default database location
- `documents` — Drizzle schema table

## Schema

Documents table stores:
- `id`, `path`, `hash`, `status`, `data` (JSON), `createdAt`

## Storage location

Default: `~/.local/share/doc-agent/doc-agent.db` (via `env-paths`)

## Depends on

- `@doc-agent/core` — DocumentData type

## Gotchas

- Migrations run lazily on first DB access
- Uses better-sqlite3 (synchronous, embedded)

