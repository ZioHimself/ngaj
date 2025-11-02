## GitHub Integration

When implementing a requirement:

1. **Find the GitHub issue**:
   - Search for requirement ID
   - Comment that you're starting

2. **Update issue during implementation**:
   - Comment: "🔨 Implementer Agent started"
   - Link design document
   - Comment progress updates

3. **Update issue when complete**:
   - Comment: "✅ Implementation complete - all tests passing"
   - Link to implementation files
   - Update checklist in issue

4. **Reference issue in commits**:
   - Format: "feat: implement {requirement} (#issue-number)"

### Example Actions

**Update Issue:**
```typescript
await github.create_comment({
  owner: 'ziohimself',
  repo: 'ngaj',
  issue_number: 123,
  body: `
✅ **Implementer Agent Complete**

**Implementation**: src/services/post-discovery.ts
**Tests**: All 8 tests passing ✅
**Design Document**: [View Design](../.agents/artifacts/implementer/design-docs/PD-001_design.md)

**Key Decisions**:
- Used dependency injection for testability
- Implemented filtering with strategy pattern
- Added comprehensive error handling

**Test Results**:
\`\`\`
PASS tests/unit/services/post-discovery.spec.ts
  ✓ should fetch posts matching single keyword (5ms)
  ✓ should filter out posts below threshold (3ms)
  ... (8 tests passed)
\`\`\`

**Next**: Reviewer Agent will review code quality.

[View Decision Log](../.agents/logs/implementer/decisions.jsonl)
  `
});
```