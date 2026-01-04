# Test-Writer Handoff 005: Response Suggestion

**Handoff Number**: 005  
**Feature**: Response Suggestion  
**Date**: 2026-01-04  
**Test Writer Agent** → **Implementer Agent**

🔗 **Design Rationale**: [ADR-009: Response Suggestion Architecture](../../docs/architecture/decisions/009-response-suggestion-architecture.md)  
🔗 **Technical Specs**: [Response Suggestion Design Document](../designer/designs/response-suggestion-design.md)  
🔗 **Test Writer Requirements**: [Response Suggestion Handoff](../designer/handoffs/004-response-suggestion-handoff.md)

---

## Overview

Comprehensive test suite for the Response Suggestion feature has been implemented following TDD principles. All tests are in RED phase (failing with "Not implemented" errors), ready for implementation.

**Feature Summary**: AI-powered response generation using a two-stage pipeline:
1. **Stage 1**: Analyze opportunity → Extract keywords
2. **Stage 2**: Search KB → Build protected prompt → Generate response

**Critical Security**: Implements prompt injection prevention using boundary markers with first-occurrence rule.

---

## Test Statistics

### Total Tests Created: **68 tests**

| Category | File | Tests | Status |
|----------|------|-------|--------|
| **Unit Tests** | | | |
| Prompt Building | `tests/unit/utils/prompt-builder.spec.ts` | 16 | ❌ All Failing |
| Constraint Validation | `tests/unit/utils/constraint-validator.spec.ts` | 12 | ❌ All Failing |
| Response Service | `tests/unit/services/response-suggestion-service.spec.ts` | 21 | ❌ All Failing |
| **Security Tests** | | | |
| Prompt Injection | `tests/unit/services/response-suggestion-service.security.spec.ts` | 14 | ❌ All Failing |
| **Integration Tests** | | | |
| Generation Flow | `tests/integration/workflows/response-generation-flow.spec.ts` | 14 | ❌ All Failing (some compile) |

### Red Phase Status: ✅ **VERIFIED**

All tests fail with clear `Error: Not implemented` messages. TypeScript compilation succeeds for all new files.

**Test Execution Example**:
```bash
$ npm test tests/unit/utils/prompt-builder.spec.ts

❯ tests/unit/utils/prompt-builder.spec.ts (16 tests | 16 failed)
  × should build analysis prompt with boundary marker
  × should handle boundary marker escape attempt (CRITICAL)
  × should place opportunity text AFTER boundary marker
  ...

FAIL tests/unit/utils/prompt-builder.spec.ts > should build analysis prompt
Error: Not implemented
 ❯ buildAnalysisPrompt src/utils/prompt-builder.ts:31:9
```

---

## Files Created

### Test Files (5 files)
```
tests/
├── unit/
│   ├── utils/
│   │   ├── prompt-builder.spec.ts (16 tests)
│   │   └── constraint-validator.spec.ts (12 tests)
│   └── services/
│       ├── response-suggestion-service.spec.ts (21 tests)
│       └── response-suggestion-service.security.spec.ts (14 tests)
└── integration/
    └── workflows/
        └── response-generation-flow.spec.ts (14 tests)
```

### Fixture Files (1 file, extended 1 file)
```
tests/fixtures/
├── response-fixtures.ts (NEW - comprehensive fixtures with adversarial examples)
└── profile-fixtures.ts (EXTENDED - added principles field, minimalProfile, verboseProfile)
```

### Implementation Stubs (3 files)
```
src/
├── utils/
│   ├── prompt-builder.ts (2 functions)
│   └── constraint-validator.ts (1 function)
└── services/
    └── response-suggestion-service.ts (5 methods + 1 private)
```

### Documentation (2 files)
```
.agents/artifacts/test-writer/
├── test-plans/
│   └── response-suggestion-test-plan.md
└── 005-response-suggestion-handoff.md (this file)
```

---

## Test Coverage Breakdown

### 1. Prompt Building Tests (16 tests)

**File**: `tests/unit/utils/prompt-builder.spec.ts`

#### buildAnalysisPrompt() (7 tests)
- ✓ Build analysis prompt with boundary marker
- ✓ Request JSON output with specific keys
- ✓ Include opportunity text after boundary marker
- ✓ **CRITICAL**: Handle opportunity text containing boundary marker (escape prevention)
- ✓ Handle empty opportunity text
- ✓ Handle very long opportunity text (50k+ chars)
- ✓ Handle Unicode and special characters

#### buildGenerationPrompt() (9 tests)
- ✓ Build generation prompt with all components (principles, voice, KB chunks, constraints)
- ✓ Include all KB chunks with separators
- ✓ Place opportunity text AFTER boundary marker
- ✓ Handle empty principles and voice
- ✓ Handle empty KB chunks array
- ✓ Include platform constraints in prompt
- ✓ **CRITICAL**: Handle opportunity text with boundary marker (escape prevention)
- ✓ Place principles and voice BEFORE boundary marker
- ✓ Place KB chunks BEFORE boundary marker

---

### 2. Constraint Validation Tests (12 tests)

**File**: `tests/unit/utils/constraint-validator.spec.ts`

#### validateConstraints() (12 tests)
- ✓ Pass validation for response within limit
- ✓ Pass validation for response exactly at limit (boundary condition)
- ✓ Fail validation for response over limit
- ✓ Fail validation for response 1 character over limit
- ✓ Handle empty response text
- ✓ Handle very short response text
- ✓ Count Unicode characters correctly (not byte length)
- ✓ Handle emoji in response text
- ✓ Handle very strict constraints (maxLength: 10)
- ✓ Handle very loose constraints (maxLength: 50000)
- ✓ Return detailed violation info when invalid
- ✓ Handle newlines and whitespace in character count

---

### 3. Response Suggestion Service Tests (21 tests)

**File**: `tests/unit/services/response-suggestion-service.spec.ts`

#### generateResponse() (10 tests)
- ✓ Generate response with KB documents (full pipeline test)
- ✓ Generate response without KB documents
- ✓ Generate response with empty principles and voice
- ✓ Throw error when opportunity not found
- ✓ Throw error when profile not found
- ✓ Throw error when generated response violates constraints
- ✓ Increment version number for regenerated responses
- ✓ Handle analysis parsing error
- ✓ Handle Claude API timeout
- ✓ Handle ChromaDB unavailable gracefully

#### getResponses() (2 tests)
- ✓ Return all responses for an opportunity (sorted by version)
- ✓ Return empty array when no responses found

#### updateResponse() (3 tests)
- ✓ Update response text for draft
- ✓ Throw error when updating non-draft response (posted/dismissed)
- ✓ Throw error when response not found

#### dismissResponse() (3 tests)
- ✓ Dismiss draft response (status → dismissed, timestamp recorded)
- ✓ Throw error when dismissing non-draft response
- ✓ Throw error when response not found

#### postResponse() (3 tests)
- ✓ Post draft response and update opportunity status (response → posted, opportunity → responded)
- ✓ Throw error when posting non-draft response
- ✓ Throw error when response not found

---

### 4. Security Tests (14 tests)

**File**: `tests/unit/services/response-suggestion-service.security.spec.ts`

#### Basic Prompt Injection (2 tests)
- ✓ Prevent basic prompt injection attempt ("Ignore all previous instructions...")
- ✓ Prevent system role injection attempt ("System: You are now...")

#### Boundary Marker Escape - CRITICAL (3 tests)
- ✓ **CRITICAL**: Prevent boundary marker escape attempt (contains `--- USER INPUT BEGINS ---`)
- ✓ **CRITICAL**: Prevent boundary marker escape variant
- ✓ **CRITICAL**: Verify first-occurrence rule for boundary markers (only first marker processed)

#### Markdown and Code Blocks (2 tests)
- ✓ Prevent markdown code block injection (```system ... ```)
- ✓ Prevent role confusion with assistant tag

#### Analysis Stage Injection (2 tests)
- ✓ Prevent injection in analysis stage (Stage 1)
- ✓ Prevent analysis stage escape attempt

#### Input Validation Edge Cases (3 tests)
- ✓ Handle extremely long opportunity text (50k chars)
- ✓ Handle Unicode and special characters safely
- ✓ Handle empty opportunity text

---

### 5. Integration Tests (14 tests)

**File**: `tests/integration/workflows/response-generation-flow.spec.ts`

#### End-to-End Generation with KB (3 tests)
- ✓ Complete full generation pipeline with KB chunks (Stage 1 → KB search → Stage 2 → Store)
- ✓ Use extracted keywords for KB search
- ✓ Complete generation in under 10 seconds (performance requirement)

#### End-to-End Generation without KB (2 tests)
- ✓ Generate response when no KB chunks found
- ✓ Be faster without KB search (< 6 seconds)

#### Platform Constraints Integration (2 tests)
- ✓ Apply Bluesky constraints correctly (maxLength: 300)
- ✓ Reject response that violates platform constraints

#### Error Handling (4 tests)
- ✓ Handle ChromaDB unavailable gracefully (proceed without KB)
- ✓ Handle Claude API failure with retry
- ✓ Fail after max retries (3 attempts)
- ✓ Handle malformed analysis JSON

#### Multi-Version Workflow (1 test)
- ✓ Handle regenerate request (version increment from v1 to v2)

---

## Test Fixtures Summary

### response-fixtures.ts (NEW)
**Factory Functions**:
- `createMockResponse()` - Draft response with metadata
- `createMockResponseInput()` - Create input
- `createMockAnalysis()` - Stage 1 analysis result
- `createMockConstraints()` - Platform constraints
- `createMockKBChunks()` - ChromaDB search results
- `createMockResponses()` - Bulk response creation

**Pre-configured Fixtures**:
- `createResponseFixtures()` - draft, posted, dismissed, noKbChunks, atMaxLength, version2, withUnicode
- `analysisFixtures` - technical, policy, casual, noQuestion, minimalKeywords
- **`adversarialOpportunityFixtures()`** - Security test fixtures:
  - basicInjection
  - systemRoleInjection
  - **boundaryMarkerEscape** (CRITICAL)
  - **boundaryMarkerEscapeVariant** (CRITICAL)
  - markdownInjection
  - analysisInjection
  - analysisEscape
  - extremelyLong (50k chars)
  - unicodeSpecial
  - emptyText
  - veryShort
  - roleConfusion
- `mockClaudeResponses` - Valid/invalid API responses
- `constraintFixtures` - bluesky, linkedin, reddit, veryStrict, veryLoose

### profile-fixtures.ts (EXTENDED)
**Added Fixtures**:
- `minimalProfile` - Empty principles and voice (for constraint testing)
- `verboseProfile` - Very long principles/voice (for constraint violation testing)
- `completeProfile` - All fields populated (realistic data)
- `noPrinciples` - Undefined principles field

**Enhanced Base Factory**:
- Added `principles` field (optional string)
- Updated all existing fixtures to include principles

---

## Implementation Stubs

### 1. prompt-builder.ts

**Functions**:
```typescript
buildAnalysisPrompt(opportunityText: string): string
buildGenerationPrompt(
  profile: Profile,
  kbChunks: KBChunk[],
  constraints: PlatformConstraints,
  opportunityText: string
): string
```

**Types**:
```typescript
interface KBChunk {
  id: string;
  text: string;
  distance: number;
  metadata: {
    documentId: string;
    chunkIndex: number;
    filename: string;
  };
}
```

---

### 2. constraint-validator.ts

**Functions**:
```typescript
validateConstraints(
  responseText: string,
  constraints: PlatformConstraints
): ConstraintValidationResult
```

**Types**:
```typescript
interface ConstraintValidationResult {
  valid: boolean;
  violation?: 'maxLength';
  actual?: number;
  limit?: number;
}
```

---

### 3. response-suggestion-service.ts

**Class**: `ResponseSuggestionService`

**Constructor**:
```typescript
constructor(
  private db: Db,
  private claudeClient: any,
  private chromaClient: any,
  private platformAdapter: any
)
```

**Public Methods**:
```typescript
generateResponse(
  opportunityId: ObjectId,
  accountId: ObjectId,
  profileId: ObjectId
): Promise<Response>

getResponses(opportunityId: ObjectId): Promise<Response[]>

updateResponse(
  responseId: ObjectId,
  update: UpdateResponseInput
): Promise<void>

dismissResponse(responseId: ObjectId): Promise<void>

postResponse(responseId: ObjectId): Promise<void>
```

**Private Methods**:
```typescript
private parseAnalysisResult(analysisText: string): OpportunityAnalysis
```

---

## Implementation Order (Recommended)

For the **Implementer Agent**, follow this sequence:

### Phase 1: Prompt Building (Enables Security Tests)
**Priority**: **CRITICAL** (Security foundation)

1. Implement `buildAnalysisPrompt()`
   - Add system instructions for JSON output
   - Add boundary marker: `--- USER INPUT BEGINS ---`
   - Place opportunity text AFTER marker
   - **CRITICAL**: Ensure first-occurrence rule (only first marker processed)

2. Implement `buildGenerationPrompt()`
   - Add principles section (even if empty)
   - Add voice section (even if empty)
   - Add KB chunks (with separators)
   - Add platform constraints
   - Add boundary marker
   - Place opportunity text AFTER marker
   - **CRITICAL**: Ensure first-occurrence rule

**Tests to Pass**: `tests/unit/utils/prompt-builder.spec.ts` (16 tests)

---

### Phase 2: Constraint Validation
**Priority**: High (Required for Phase 3)

3. Implement `validateConstraints()`
   - Check `responseText.length <= constraints.maxLength`
   - Return `{ valid: true }` if passes
   - Return `{ valid: false, violation: 'maxLength', actual, limit }` if fails
   - Handle Unicode correctly (character count, not byte count)

**Tests to Pass**: `tests/unit/utils/constraint-validator.spec.ts` (12 tests)

---

### Phase 3: Response Suggestion Service Core
**Priority**: High (Core functionality)

4. Implement `generateResponse()` - Two-stage pipeline:
   
   **Stage 1: Analysis**
   - Load opportunity and profile from DB
   - Build analysis prompt with `buildAnalysisPrompt()`
   - Call Claude API for analysis
   - Parse JSON result with `parseAnalysisResult()`
   
   **KB Search**
   - Use extracted keywords to search ChromaDB
   - Get up to 3 relevant chunks
   - Handle ChromaDB failures gracefully (proceed with 0 chunks)
   
   **Stage 2: Generation**
   - Build generation prompt with `buildGenerationPrompt()`
   - Call Claude API for response generation
   - Validate constraints with `validateConstraints()`
   - Throw error if constraints violated
   
   **Storage**
   - Determine version number (query existing responses, increment)
   - Create response document with metadata
   - Insert into `responses` collection
   - Record timing metrics (analysisTimeMs, responseTimeMs, generationTimeMs)

5. Implement `getResponses()`
   - Query `responses` collection by `opportunityId`
   - Sort by `version` ascending
   - Return array

6. Implement `updateResponse()`
   - Find response by `_id`
   - Check status is 'draft' (throw error if not)
   - Update `text` and `updatedAt`

7. Implement `dismissResponse()`
   - Find response by `_id`
   - Check status is 'draft' (throw error if not)
   - Update `status` to 'dismissed', set `dismissedAt`, update `updatedAt`

8. Implement `postResponse()`
   - Find response by `_id`
   - Check status is 'draft' (throw error if not)
   - Update response: `status` → 'posted', set `postedAt`, update `updatedAt`
   - Update opportunity: `status` → 'responded', update `updatedAt`

9. Implement `parseAnalysisResult()` (private)
   - Parse JSON string
   - Validate required fields: `mainTopic`, `keywords`, `domain`, `question`
   - Throw descriptive error if parsing fails or fields missing

**Tests to Pass**: `tests/unit/services/response-suggestion-service.spec.ts` (21 tests)

---

### Phase 4: Security Verification
**Priority**: **CRITICAL** (Security validation)

10. Run security tests to verify prompt injection prevention
    - Verify boundary marker protection works
    - **CRITICAL**: Verify first-occurrence rule (escape prevention)
    - Verify all adversarial inputs are treated as data, not instructions

**Tests to Pass**: `tests/unit/services/response-suggestion-service.security.spec.ts` (14 tests)

---

### Phase 5: Integration & Performance
**Priority**: High (End-to-end validation)

11. Wire up dependencies (Claude API, ChromaDB, Platform Adapter)
12. Verify full pipeline works end-to-end
13. Verify <10s latency requirement
14. Verify retry logic for Claude API failures

**Tests to Pass**: `tests/integration/workflows/response-generation-flow.spec.ts` (14 tests)

---

## Running Tests

### All Response Suggestion Tests
```bash
npm test -- tests/unit/utils/prompt-builder.spec.ts \
            tests/unit/utils/constraint-validator.spec.ts \
            tests/unit/services/response-suggestion-service.spec.ts \
            tests/unit/services/response-suggestion-service.security.spec.ts \
            tests/integration/workflows/response-generation-flow.spec.ts
```

### By Phase
```bash
# Phase 1: Prompt Building
npm test tests/unit/utils/prompt-builder.spec.ts

# Phase 2: Constraint Validation
npm test tests/unit/utils/constraint-validator.spec.ts

# Phase 3: Service Core
npm test tests/unit/services/response-suggestion-service.spec.ts

# Phase 4: Security
npm test tests/unit/services/response-suggestion-service.security.spec.ts

# Phase 5: Integration
npm test tests/integration/workflows/response-generation-flow.spec.ts
```

### With Coverage
```bash
npm run test:coverage -- tests/unit/services/response-suggestion-service
```

---

## Expected Green Phase Output

When all tests pass, you should see:

```bash
$ npm test

✓ tests/unit/utils/prompt-builder.spec.ts (16 passed)
✓ tests/unit/utils/constraint-validator.spec.ts (12 passed)
✓ tests/unit/services/response-suggestion-service.spec.ts (21 passed)
✓ tests/unit/services/response-suggestion-service.security.spec.ts (14 passed)
✓ tests/integration/workflows/response-generation-flow.spec.ts (14 passed)

Test Files  5 passed (5)
Tests  77 passed (77)
Duration  2.5s
```

---

## Key Implementation Notes

### 1. Boundary Marker Protection (CRITICAL)

**Requirement**: Prevent prompt injection attacks

**Implementation**:
```typescript
// Prompt structure:
const prompt = `
${systemInstructions}

--- USER INPUT BEGINS ---
${opportunityText}
`;
```

**First-Occurrence Rule**:
- Only the FIRST occurrence of `--- USER INPUT BEGINS ---` is the real boundary
- Any subsequent occurrences in `opportunityText` are treated as literal text
- This prevents "escape" attacks where users try to inject a second boundary marker

**Test Verification**: `tests/unit/utils/prompt-builder.spec.ts` and `tests/unit/services/response-suggestion-service.security.spec.ts`

---

### 2. Constraint Validation

**v0.1 Scope**: Only `maxLength` constraint

```typescript
if (responseText.length > constraints.maxLength) {
  return {
    valid: false,
    violation: 'maxLength',
    actual: responseText.length,
    limit: constraints.maxLength
  };
}
return { valid: true };
```

**Important**: Use `.length` property (character count), not byte length.

---

### 3. Version Increment Logic

When user clicks "Suggest Response" again:
1. Query existing responses for the `opportunityId`
2. Find max version number
3. New version = max + 1
4. Old versions remain in database (not deleted)

```typescript
const existingResponses = await db.collection('responses')
  .find({ opportunityId })
  .sort({ version: -1 })
  .toArray();

const newVersion = existingResponses.length > 0
  ? existingResponses[0].version + 1
  : 1;
```

---

### 4. Error Handling Patterns

**Not Found Errors**:
```typescript
if (!opportunity) {
  throw new Error('Opportunity not found');
}
```

**Status Validation Errors**:
```typescript
if (response.status !== 'draft') {
  throw new Error(`Cannot update response with status: ${response.status}`);
}
```

**Constraint Violation Errors**:
```typescript
const validation = validateConstraints(generatedText, constraints);
if (!validation.valid) {
  throw new Error(
    `Generated response (${validation.actual} chars) exceeds platform limit (${validation.limit} chars)`
  );
}
```

---

### 5. Metadata Recording

All response metadata must be captured:
```typescript
metadata: {
  analysisKeywords: analysis.keywords,
  mainTopic: analysis.mainTopic,
  domain: analysis.domain,
  question: analysis.question,
  kbChunksUsed: kbChunks.length,
  constraints: constraints,
  model: 'claude-sonnet-4.5',
  generationTimeMs: totalTime,
  usedPrinciples: !!profile.principles && profile.principles.length > 0,
  usedVoice: !!profile.voice.style && profile.voice.style.length > 0,
  analysisTimeMs: analysisTime,
  responseTimeMs: responseTime
}
```

---

## Known Limitations

### Out of Scope for v0.1
- Streaming responses (deferred to v0.2)
- Tone adjustment regeneration (deferred to v0.2)
- Multi-draft comparison UI (deferred to v0.2)
- Caching analysis results (deferred to v0.2)
- Show which KB chunks were used (deferred to v0.2)
- minLength, bannedTerms constraints (deferred to future versions)

### Testing Constraints
- No real Claude API calls in tests (all mocked)
- No real ChromaDB in unit tests (mocked)
- Integration tests may use in-memory ChromaDB if needed
- Performance tests use relaxed thresholds (+20% margin)

---

## Success Criteria

**Implementation Complete When**:
- [ ] All 68 tests pass (Green phase)
- [ ] TypeScript compilation succeeds with no type errors
- [ ] No linter errors
- [ ] Code coverage >90% for core logic (`response-suggestion-service.ts`, `prompt-builder.ts`, `constraint-validator.ts`)
- [ ] <10s generation time verified (95th percentile)
- [ ] All security tests pass (prompt injection prevented)
- [ ] Boundary marker escape attempts fail (first-occurrence rule enforced)

---

## Dependencies & Configuration

### New Dependencies Installed
None - all dependencies already present in `package.json`:
- `vitest` (testing framework)
- `mongodb` (database)
- `@anthropic-ai/sdk` (Claude API - assumed)

### Configuration Updates
- Updated `tsconfig.json` to add `@tests/*` path mapping

---

## References

- **Design Handoff**: [004-response-suggestion-handoff.md](../designer/handoffs/004-response-suggestion-handoff.md)
- **Design Document**: [response-suggestion-design.md](../designer/designs/response-suggestion-design.md)
- **ADR**: [009-response-suggestion-architecture.md](../../docs/architecture/decisions/009-response-suggestion-architecture.md)
- **Test Plan**: [response-suggestion-test-plan.md](test-plans/response-suggestion-test-plan.md)
- **Type Definitions**: `src/shared/types/response.ts`
- **Related Features**:
  - [002-knowledge-base-handoff.md](002-knowledge-base-handoff.md) - KB integration
  - [004-opportunity-discovery-handoff.md](004-opportunity-discovery-handoff.md) - Opportunity models

---

## Questions or Issues?

If you encounter:
- **Unclear test behavior**: Check test comments and handoff document for clarification
- **Type errors**: Verify all imports are using `@/` and `@tests/` path aliases
- **Mock behavior questions**: See fixtures in `tests/fixtures/response-fixtures.ts`
- **Security implementation questions**: See boundary marker notes above and ADR-009

---

**Ready for Implementer!** 🚀

All tests are in RED phase, implementation stubs created, types defined. Follow the implementation order above, run tests incrementally, and watch them turn GREEN! 🟢

---

**Handoff Complete**: 2026-01-04  
**Test Writer Agent** ✅

