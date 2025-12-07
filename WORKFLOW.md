# Development Workflow

Standard workflow for implementing features in doc-agent.

## The Drill™

### 1. Ticket Creation (Required)

Before writing any code, ensure a ticket exists for the work.

-   **Small Changes**: A simple Issue is sufficient.
-   **Large Features**: Create an **Epic** and break it down into **Implementation Tasks**.
-   **No Ticket?**: Create one using the templates below.

#### Epic Ticket Template
```markdown
# Epic: [Name]

## 🎯 Overview
High-level goal and key insights. "Why are we doing this?"

## 🏗️ Architecture
Core components and user flow.

## 📋 Sub-Issues
Breakdown of work into implementation tasks.
- Task 1: Foundation
- Task 2: Feature
- Task 3: Integration

*(Note: Use `scripts/gh-issue-add-subs.sh` to link child tasks to the Epic)*

## ✅ Success Criteria
- [ ] Checklist of deliverables
```

#### Implementation Ticket Template
```markdown
## Title: [Task/Feature] Name

**Context**
Why is this specific piece needed?

**Architecture Decisions**
- Package: e.g., `packages/storage`
- Tech: e.g., `better-sqlite3`
- Patterns: e.g., Repository Pattern, Lazy Init

**Requirements**
- [ ] Requirement 1
- [ ] Requirement 2

**References**
- Epic: #1
```

### 2. Find Next Work (Dogfooding! 🐕🍽️)

```bash
# Update main branch
git checkout main
git pull origin main

# Use GitHub Context to find what to work on next
# (Coming soon: doc-agent issue search)
```

### 3. Start New Feature

```bash
# Create feature branch (use feat/, fix/, docs/, etc.)
git checkout -b feat/feature-name

# Update TODOs (mark as in_progress)
# Done via todo_write tool
```

### 4. Planning Phase

```bash
# Read the issue requirements
# Break down the work into specific tasks
# Suggest implementation order
```

**Implementation Checklist:**
- [ ] Define types/interfaces
- [ ] Implement core functionality
- [ ] Write comprehensive tests
- [ ] Add usage examples
- [ ] Create README if new module
- [ ] Update related documentation

### 5. Implementation Phase

```bash
# Design interfaces first (in comments or types)
# Implement with test-driven development
# Document with examples as you go
```

### 6. Quality Checks

```bash
# Build all packages
pnpm build

# Run all tests
pnpm test

# Check specific package coverage
npx vitest run packages/<package>/src/<module> --coverage

# Lint and format
pnpm lint
pnpm format

# Type check
pnpm typecheck
```

**Quality Standards:**
- ✅ All tests passing
- ✅ 85%+ statement coverage (aim for 90%+)
- ✅ 100% function coverage
- ✅ No linter errors
- ✅ No TypeScript errors
- ✅ Documentation with examples

### 7. Commit & PR

```bash
# Stage all changes
git add -A

# Commit with conventional commit format
git commit -m "feat(<scope>): <description>

<detailed description>

Features:
- Feature 1
- Feature 2

Testing:
- X tests, all passing
- Y% coverage

<additional sections>

Issue: #<issue-number>"

# Push to remote
git push -u origin feat/feature-name

# Create PR with comprehensive description
gh pr create \
  --title "feat(<scope>): <title>" \
  --body "<detailed PR description>" \
  --base main
```

## Commit Message Format

### Structure

```
<type>(<scope>): <short description>

<detailed description>

<body sections>

Issue: #<number>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `chore`: Maintenance tasks

### Scopes
- `cli`: Command-line interface
- `core`: Core functionality
- `extract`: Extraction logic
- `storage`: Database & Persistence
- `vector`: Vector storage
- `mcp`: MCP Server integration

### Body Sections

**Always include:**
- **Implementation**: What was built
- **Features**: Key features added
- **Testing**: Test count, coverage
- **Issue**: Reference to GitHub issue

**Optional but recommended:**
- **Performance**: Performance metrics
- **Documentation**: What was documented
- **Architecture**: Design decisions
- **Breaking Changes**: API changes
- **Known Limitations**: What doesn't work yet

## Testing Standards

### Coverage Goals
- **Statement Coverage**: 85%+ (aim for 90%+)
- **Branch Coverage**: 60%+ (aim for 80%+)
- **Function Coverage**: 100%
- **Line Coverage**: 85%+

### What to Test

**Must Test:**
- ✅ Happy paths (normal usage)
- ✅ Edge cases (empty, null, boundaries)
- ✅ Error handling
- ✅ Public API methods
- ✅ Integration points

**Don't Need to Test:**
- ❌ Type definitions (TypeScript handles this)
- ❌ External library behavior
- ❌ Private implementation details (test through public API)
