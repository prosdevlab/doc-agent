# CLAUDE.md

## Agent Instructions

This repository follows a strict workflow for all development tasks. 

**CRITICAL**: When starting any new task, feature, or fix, you MUST follow **The Drill™** outlined in [WORKFLOW.md](./WORKFLOW.md).

### Quick Reference

- **Commands**:
  - `pnpm install` - Install deps
  - `pnpm build` - Build all packages
  - `pnpm test` - Run all tests
  - `pnpm lint` - Lint all code
  - `pnpm format` - Format all code
  - `pnpm dev extract <file>` - Run CLI extract command in dev mode

- **Architecture**:
  - See [AGENTS.md](./AGENTS.md) for detailed architectural overview.
  - Monorepo with `packages/core`, `packages/extract`, `packages/vector-store`, `packages/cli`.

- **Workflow**:
  1. **Find Work**: Check issues.
  2. **Start**: Create branch `feat/name`.
  3. **Plan**: Analyze requirements.
  4. **Implement**: TDD + Docs.
  5. **Check**: Build -> Test -> Lint.
  6. **Commit**: Conventional Commits.

Refer to [WORKFLOW.md](./WORKFLOW.md) for the complete guide.

