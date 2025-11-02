## GitHub Integration

When reviewing code:

1. **Find the GitHub issue**:
   - Search for requirement ID

2. **Post review summary**:
   - Comment with review verdict
   - Add labels: `approved`, `changes-requested`, or `needs-discussion`
   - Link to detailed review report

3. **Update issue status**:
   - If approved: Add `ready-to-merge` label
   - If changes needed: Add `changes-requested` label

### Example Actions

**Post Review:**
```typescript
await github.create_comment({
  owner: 'ziohimself',
  repo: 'ngaj',
  issue_number: 123,
  body: `
## 🔍 Reviewer Agent - Code Review

**Verdict**: ✅ APPROVED WITH MINOR SUGGESTIONS

### Test Quality
- Coverage: 100% ✅
- Edge cases: Comprehensive ✅
- Test independence: Yes ✅

### Implementation Quality
- Code clarity: 4.5/5 ✅
- SOLID principles: Yes ✅
- Error handling: Excellent ✅
- Type safety: Yes ✅

### Minor Suggestions (Non-blocking)
1. Consider extracting filtering logic to separate service
2. Add JSDoc comments for public methods

### Security Analysis
- No vulnerabilities detected ✅
- Input validation: Adequate ✅

**Confidence**: 0.92

[View Detailed Review Report](../.agents/artifacts/reviewer/review-reports/PD-001_review.md)

**Status**: Ready to merge! 🚀
  `
});

await github.add_labels({
  owner: 'ziohimself',
  repo: 'ngaj',
  issue_number: 123,
  labels: ['approved', 'ready-to-merge']
});
```