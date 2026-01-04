# Test Plan: Response Suggestion Feature

**Handoff Number**: 005  
**Feature**: Response Suggestion  
**Based on**: [Handoff Document](../designer/handoffs/004-response-suggestion-handoff.md)  
**Design Rationale**: [ADR-009](../../../docs/architecture/decisions/009-response-suggestion-architecture.md)

---

## Overview

This test plan covers comprehensive testing for the Response Suggestion feature, which generates AI-powered draft responses using a two-stage pipeline:
1. **Stage 1**: Analyze opportunity → Extract keywords
2. **Stage 2**: Search KB → Build prompt → Generate response

**Critical Requirements**:
- Platform constraint enforcement (maxLength)
- Prompt injection prevention (boundary marker protection)
- Complete generation in <10 seconds
- Store all drafts (including dismissed)

---

## Test Coverage Summary

### Unit Tests (Priority 1)
**Location**: `tests/unit/services/response-suggestion-service.spec.ts`, `tests/unit/utils/prompt-builder.spec.ts`, `tests/unit/utils/constraint-validator.spec.ts`

**Coverage**:
- Prompt building with boundary markers (7 tests)
- Constraint validation (5 tests)
- Analysis parsing (4 tests)
- Response service methods (12 tests)

**Total**: ~28 unit tests

### Integration Tests (Priority 2)
**Location**: `tests/integration/workflows/response-generation-flow.spec.ts`

**Coverage**:
- End-to-end generation with KB documents (3 tests)
- Generation without KB documents (2 tests)
- Platform constraints integration (2 tests)
- KB search integration (3 tests)
- Error handling (4 tests)

**Total**: ~14 integration tests

### Security Tests (Priority 3)
**Location**: `tests/unit/services/response-suggestion-service.security.spec.ts`

**Coverage**:
- Basic prompt injection attempts (2 tests)
- Advanced injection with role confusion (2 tests)
- Boundary marker escape attempts (3 tests - CRITICAL)
- Markdown/code block injection (2 tests)
- Stage 1 analysis injection (2 tests)
- Input validation edge cases (3 tests)

**Total**: ~14 security tests

### Performance Tests (Priority 4)
**Location**: `tests/integration/workflows/response-generation-performance.spec.ts`

**Coverage**:
- Generation latency (<10s requirement) (2 tests)
- Concurrent request handling (1 test)
- Retry logic (2 tests)

**Total**: ~5 performance tests

### Data Persistence Tests (Priority 5)
**Location**: `tests/integration/database/response-storage.spec.ts`

**Coverage**:
- Draft response storage (3 tests)
- Status updates (posted, dismissed) (2 tests)
- Multi-version storage (2 tests)

**Total**: ~7 persistence tests

---

## Grand Total: ~68 tests

---

## Test Organization

```
tests/
├── unit/
│   ├── services/
│   │   ├── response-suggestion-service.spec.ts (main unit tests)
│   │   └── response-suggestion-service.security.spec.ts (security tests)
│   └── utils/
│       ├── prompt-builder.spec.ts
│       └── constraint-validator.spec.ts
├── integration/
│   ├── workflows/
│   │   ├── response-generation-flow.spec.ts
│   │   └── response-generation-performance.spec.ts
│   └── database/
│       └── response-storage.spec.ts
└── fixtures/
    └── response-fixtures.ts (NEW)
```

---

## Mock Strategy

### Claude API Mock
**Why**: Avoid API costs and enable controlled testing
**What**: Mock both Stage 1 (analysis) and Stage 2 (generation) responses
**How**: Vitest's `vi.fn()` to mock Claude client methods

**Mock Behaviors**:
- Success: Return valid JSON for analysis, valid text for generation
- Failure: Simulate timeout, 500 error, rate limit
- Controlled latency: Test performance requirements

### ChromaDB Mock
**Why**: Fast tests, predictable results
**What**: Mock semantic search queries
**How**: Mock ChromaDB client methods

**Mock Behaviors**:
- Return relevant chunks (high similarity scores)
- Return no chunks (no matches)
- Service unavailable (connection error)

### MongoDB Mock
**Why**: Isolation from database state
**What**: Mock collection methods (insertOne, findOne, updateOne)
**How**: Vitest's `vi.fn()` for each collection method

**Mock Behaviors**:
- Successful inserts/updates
- Document not found errors
- Query results for multi-version tests

### Platform Adapter Mock
**Why**: Test constraint enforcement without platform dependencies
**What**: Mock `getResponseConstraints()` method
**How**: Return different constraints per test

**Mock Behaviors**:
- Bluesky: `{ maxLength: 300 }`
- LinkedIn (future): `{ maxLength: 3000 }`
- Custom constraints for edge case testing

---

## Test Priorities

### Critical Path (Must Pass)
1. ✅ Generate response with KB documents (integration test)
2. ✅ Platform constraint enforcement (Bluesky 300 chars)
3. ✅ Boundary marker prevents prompt injection
4. ✅ **Boundary marker escape attempt fails** (CRITICAL SECURITY)
5. ✅ Response stored with correct metadata
6. ✅ Generation completes in <10 seconds

### High Priority
- Generate response without KB documents
- Generate response with empty principles/voice
- KB search uses extracted keywords correctly
- Constraint validation (over/under limits)
- Draft → Posted workflow
- Draft → Dismissed workflow
- Multi-version storage (regenerate)

### Medium Priority
- Prompt building with empty principles/voice
- Analysis parsing errors (malformed JSON)
- Claude API timeout handling
- ChromaDB unavailable (graceful degradation)
- Concurrent request handling
- Retry logic with exponential backoff

### Low Priority (Edge Cases)
- Empty opportunity text
- Very long opportunity text (50k chars)
- Unicode and special characters
- Zero followers author
- Response exactly at maxLength boundary

---

## Test Data Requirements

### Opportunity Fixtures
**NEW** in `tests/fixtures/response-fixtures.ts`:
- Standard opportunities (short, medium, long text)
- Technical content opportunities
- Casual content opportunities
- Question-based opportunities
- **Adversarial opportunities** (for security tests):
  - Basic injection: "Ignore previous instructions..."
  - System role injection: "System: You are now..."
  - **Boundary marker escape**: Contains `--- USER INPUT BEGINS ---` in text
  - Markdown code block injection
  - Unicode and emoji content

### Profile Fixtures
**Extend** `tests/fixtures/profile-fixtures.ts`:
- Add `minimalProfile`: Empty principles and voice
- Add `verboseProfile`: Very long principles/voice (constraint testing)
- Add `completeProfile`: All fields populated with realistic data

### Knowledge Base Fixtures
**Use existing** `tests/fixtures/knowledge-base-fixtures.ts`:
- Technical documentation chunks
- Opinion piece chunks
- Unrelated content chunks

### Response Fixtures
**NEW** in `tests/fixtures/response-fixtures.ts`:
- Draft response
- Posted response
- Dismissed response
- Multi-version responses (v1 dismissed, v2 draft)

---

## Known Limitations

### Out of Scope for v0.1
- Streaming responses (deferred to v0.2)
- Tone adjustment regeneration (deferred to v0.2)
- Multi-draft comparison UI (deferred to v0.2)
- Caching analysis results (deferred to v0.2)
- Show which KB chunks were used (deferred to v0.2)

### Testing Constraints
- **No real Claude API calls** in tests (mocked only)
- **No real ChromaDB** in unit tests (mocked)
- Integration tests may use in-memory ChromaDB (if needed)
- Performance tests use relaxed thresholds (+20% margin)

### Deferred Tests
- End-to-end Playwright tests (UI workflow) - deferred until frontend implemented
- Load testing (10+ concurrent requests) - deferred to v0.2
- Stress testing (large KB with 1000+ chunks) - deferred to v0.2

---

## Test Execution

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only
npm test tests/unit/services/response-suggestion-service.spec.ts

# Security tests only
npm test tests/unit/services/response-suggestion-service.security.spec.ts

# Integration tests only
npm test tests/integration/workflows/response-generation-flow.spec.ts

# Performance tests only
npm test tests/integration/workflows/response-generation-performance.spec.ts
```

### Run with Coverage
```bash
npm run test:coverage
```

### Expected Coverage
- **Target**: >90% line coverage for core logic
- **Files**:
  - `src/services/response-suggestion-service.ts`
  - `src/utils/prompt-builder.ts`
  - `src/utils/constraint-validator.ts`

---

## Red Phase Verification

After implementing tests, verify:
1. ✅ All tests fail with "Not implemented" errors
2. ✅ No false positives (tests passing prematurely)
3. ✅ Clear error messages indicating missing implementation
4. ✅ TypeScript compilation succeeds (stubs have correct signatures)
5. ✅ No linter errors in test code

**Verification Command**:
```bash
npm test 2>&1 | grep -E "(FAIL|Error: Not implemented)"
```

---

## Implementation Order for Implementer

**Recommended sequence** (based on test dependencies):

1. **Phase 1: Core Types and Stubs**
   - Create `Response` type (already exists in `src/shared/types/response.ts`)
   - Create `ResponseSuggestionService` stub with method signatures
   - Create utility stubs (`prompt-builder.ts`, `constraint-validator.ts`)

2. **Phase 2: Prompt Building** (Enables Security Tests)
   - Implement `buildAnalysisPrompt()` with boundary marker
   - Implement `buildGenerationPrompt()` with boundary marker
   - **CRITICAL**: Ensure first-occurrence rule for boundary marker
   - Unit tests pass: `prompt-builder.spec.ts`

3. **Phase 3: Constraint Validation**
   - Implement `validateConstraints()` function
   - Unit tests pass: `constraint-validator.spec.ts`

4. **Phase 4: Analysis Parsing**
   - Implement `parseAnalysisResult()` function
   - Handle JSON parsing errors gracefully
   - Unit tests pass: (analysis parsing section)

5. **Phase 5: Response Suggestion Service**
   - Implement `generateResponse()` method (Stage 1 + Stage 2)
   - Implement `getResponses()`, `updateResponse()`, `dismissResponse()`, `postResponse()`
   - Unit tests pass: `response-suggestion-service.spec.ts`

6. **Phase 6: Integration**
   - Wire up MongoDB, ChromaDB, Claude API, Platform Adapter
   - Integration tests pass: `response-generation-flow.spec.ts`

7. **Phase 7: Security Verification**
   - Run all security tests
   - **CRITICAL**: Verify boundary marker escape attempts fail
   - Security tests pass: `response-suggestion-service.security.spec.ts`

8. **Phase 8: Performance & Persistence**
   - Verify <10s latency requirement
   - Verify concurrent request handling
   - Performance tests pass: `response-generation-performance.spec.ts`
   - Persistence tests pass: `response-storage.spec.ts`

---

## Success Criteria

✅ **Test Suite Complete When**:
- [ ] All ~68 tests implemented
- [ ] All tests fail in Red phase (no false positives)
- [ ] Test code passes linter checks
- [ ] TypeScript compilation succeeds
- [ ] Test plan document created
- [ ] Fixtures created (with adversarial examples)
- [ ] Implementation stubs created
- [ ] Handoff document created (005)

✅ **Implementation Complete When** (for Implementer):
- [ ] All tests pass (Green phase)
- [ ] >90% code coverage
- [ ] <10s generation time verified
- [ ] Security tests pass (prompt injection prevented)
- [ ] No linter errors
- [ ] No type errors

---

## References

- **Design Handoff**: [004-response-suggestion-handoff.md](../designer/handoffs/004-response-suggestion-handoff.md)
- **Design Document**: [response-suggestion-design.md](../designer/designs/response-suggestion-design.md)
- **ADR**: [009-response-suggestion-architecture.md](../../../docs/architecture/decisions/009-response-suggestion-architecture.md)
- **Type Definitions**: `src/shared/types/response.ts`
- **Related Features**:
  - Knowledge Base: [002-knowledge-base-handoff.md](002-knowledge-base-handoff.md)
  - Opportunity Discovery: [004-opportunity-discovery-handoff.md](004-opportunity-discovery-handoff.md)

---

**Ready for Test Implementation!** 🎯

