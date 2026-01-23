# Agent Brevity Guidelines

## Core Principle

**Keep everything short, concise, and focused → Use references instead of duplication → Respect each document's distinct purpose**

---

## 1. Textual Artifacts

### Rules

- **Single purpose**: Each document answers ONE question (WHY, HOW, or TEST WHAT)
- **No duplication**: Reference other documents instead of copying content
- **Direct language**: State facts, avoid filler words and unnecessary context
- **Structured format**: Use headings, bullets, and tables over prose

### Document Responsibilities

| Document | Purpose | Contains | References |
|----------|---------|----------|------------|
| ADR | WHY | Decision rationale, alternatives considered | Design doc, requirements |
| Design Doc | HOW | Technical specification, data models, APIs | ADR for rationale |
| Handoff | TEST WHAT | Test scenarios, acceptance criteria | Design doc for implementation details |

### Anti-Patterns

- ❌ Repeating requirement text verbatim in design docs
- ❌ Explaining "why" in implementation documents (belongs in ADR)
- ❌ Duplicating API specs across multiple documents
- ❌ Long introductions before actual content

### Good Pattern

```markdown
## Data Model

See [ADR-005](../decisions/005-user-schema.md) for rationale.

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| email | string | unique, required |
```

---

## 2. Code

### Lean Principles

- **YAGNI**: Don't implement features until needed
- **Single Responsibility**: One function/class = one purpose
- **Minimal Abstraction**: Add abstractions only when duplication exists
- **Self-Documenting**: Clear names over comments explaining unclear code
- **No Dead Code**: Remove unused imports, functions, variables

### Rules

- Prefer small, focused functions (< 20 lines typical)
- Avoid premature optimization
- Comments explain "why", not "what"
- Use existing utilities before writing new ones

### Anti-Patterns

- ❌ "Future-proofing" with unused parameters or generic interfaces
- ❌ Wrapper functions that just call another function
- ❌ Comments restating what code does: `// increment counter` → `counter++`
- ❌ Multiple return paths that could be simplified

---

## 3. GitHub Issue Tracking

### Rules

- **Title**: Action + target (e.g., "Add password hashing to auth service")
- **Body**: 1-3 sentences max, link to artifacts for details
- **Labels**: Use instead of verbose descriptions
- **Acceptance criteria**: Short checklist, not paragraphs

### Template

```markdown
## Summary
[1-2 sentences describing the issue]

## Details
See: [design doc](link) | [ADR](link) | [test plan](link)

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2
```

### Anti-Patterns

- ❌ Copying entire design docs into issues
- ❌ Long background sections
- ❌ Embedding code samples that exist elsewhere
- ❌ Discussion/context that belongs in comments

---

## Integration with Agent Workflows

All agents apply brevity when:
- Creating design documents, ADRs, handoffs
- Writing implementation code
- Creating or updating GitHub issues
- Generating test plans and review reports

**When in doubt → Reference, don't repeat**

---

*Brevity respects the reader's time and keeps the codebase maintainable.*
