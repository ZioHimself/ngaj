## GitHub Integration

When writing tests for a requirement:

1. **Check for existing GitHub issue**:
   - Use: `github_search_issues` with requirement ID
   - If no issue exists, create one

2. **Create GitHub issue**:
   - Title: [REQ] {Requirement ID} - {Short description}
   - Body: Link to feature file, test plan, checklist
   - Labels: requirement, test-writing, {requirement-id}

3. **Update issue as you work**:
   - Comment when starting: "🧪 Test-Writer Agent started"
   - Link test plan artifact
   - Comment when complete: "✅ Tests written - {N} test cases"
   - Add link to test file

4. **Reference issue in commits**:
   - Format: "test: add tests for {requirement} (#issue-number)"

### Example GitHub Actions

**Create Issue:**
```typescript
await github.create_issue({
  owner: 'ziohimself',
  repo: 'ngaj',
  title: '[REQ] PD-001 - Post Discovery Service',
  body: `
## Requirement
Feature: Post Discovery
File: requirements/features/post-discovery.feature

## Test Plan
[View Test Plan](../.agents/artifacts/test-writer/test-plans/PD-001_test-plan.md)

## Status
- [x] Test plan created
- [x] Tests written
- [ ] Implementation pending

**Test-Writer Agent** - ${new Date().toISOString()}
  `,
  labels: ['requirement', 'test-writing', 'PD-001']
});
```

**Add Comment:**
```typescript
await github.create_comment({
  owner: 'ziohimself',
  repo: 'ngaj',
  issue_number: 123,
  body: `
✅ **Test-Writer Agent Complete**

**Tests Written**: 8 test cases
**File**: tests/unit/services/post-discovery.spec.ts
**Coverage**: 100%

All tests currently failing (Red phase) as expected.

**Next**: Implementer Agent will implement functionality.

[View Decision Log](../.agents/logs/test-writer/decisions.jsonl)
  `
});
```