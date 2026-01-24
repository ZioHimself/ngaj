# First-Launch Wizard - Test-Writer Handoff

**Handoff Number**: 007  
**Feature**: First-Launch Setup Wizard  
**Date**: 2026-01-24  
**Status**: Red Phase Complete (E2E Added)

---

## Test Statistics

| Category | Count | Status |
|----------|-------|--------|
| Unit Tests (Validation) | 17 | Red |
| Unit Tests (Transformation) | 7 | Red |
| Unit Tests (Service) | 14 | Red |
| Integration Tests | 8 | Red |
| E2E Tests (Playwright) | 36 | Red |
| **Total** | **82** | **All Failing** |

---

## Files Created

### Test Files

| File | Description |
|------|-------------|
| `tests/unit/wizard/wizard-validation.spec.ts` | Input validation tests |
| `tests/unit/wizard/schedule-transformation.spec.ts` | Preset → cron tests |
| `tests/unit/services/wizard-service.spec.ts` | WizardService tests |
| `tests/integration/wizard/wizard-flow.spec.ts` | Complete flow tests |
| `tests/e2e/features/first-launch-wizard.spec.ts` | Full UI E2E tests |

### Fixtures

| File | Description |
|------|-------------|
| `tests/fixtures/wizard-fixtures.ts` | Wizard-specific test data |

### Implementation Stubs

| File | Description |
|------|-------------|
| `packages/backend/src/services/wizard-service.ts` | WizardService stub |
| `packages/backend/src/utils/wizard-validation.ts` | Validation functions stub |

### Documentation

| File | Description |
|------|-------------|
| `.agents/artifacts/test-writer/test-plans/first-launch-wizard-test-plan.md` | Test plan |

---

## Test Coverage Breakdown

### Wizard Validation Tests (17 tests)

**Valid Inputs:**
- Accept valid profile with all fields
- Accept minimal valid (minimum lengths)
- Accept maximal valid (maximum lengths)
- Accept empty interests (optional)
- Accept maximum tag length

**Name Validation:**
- Reject empty name
- Reject name < 3 chars
- Reject name > 100 chars

**Voice Validation:**
- Reject voice < 10 chars
- Reject voice > 500 chars

**Principles Validation:**
- Reject principles < 10 chars
- Reject principles > 500 chars

**Interests Validation:**
- Reject > 20 interests
- Reject interest > 30 chars

**Connection Validation:**
- Accept bluesky platform
- Reject invalid platform
- Reject empty platform

### Schedule Transformation Tests (7 tests)

- Map '15min' → `*/15 * * * *`
- Map '30min' → `*/30 * * * *`
- Map '1hr' → `0 * * * *`
- Map '2hr' → `0 */2 * * *`
- Map '4hr' → `0 */4 * * *`
- Parameterized test for all presets
- Throw on invalid preset

### WizardService Tests (14 tests)

**hasProfile():**
- Return true when profile exists
- Return false when no profile

**getExistingWizardData():**
- Return profile data when exists
- Return null when no profile

**createProfileFromWizard():**
- Create with wizard input
- Transform voice with defaults
- Transform interests to discovery
- Set isActive to true
- Throw on invalid input
- Throw on duplicate name

**testConnection():**
- Return success with handle
- Return failure with error
- Return failure when missing credentials
- Return handle from env vars

**createAccountFromWizard():**
- Create linked to profile
- Read handle from env
- Initialize empty schedules
- Throw when profile not found

**setDiscoverySchedule():**
- Update with preset
- Set both schedules to same cron
- Enable both schedules
- Throw when account not found
- Handle all preset options

### Integration Tests (8 tests)

- Complete wizard: Profile → Account → Schedule
- Step 1 persists profile
- Step 2 tests connection
- Step 2 creates account linked to profile
- Step 3 configures schedules
- Back navigation preserves data
- Browser refresh pre-populates form
- Handle duplicate profile name (409)

### E2E Tests (27 tests) - Playwright

**Wizard Activation (5 tests):**
- Redirect to /login when not authenticated
- Redirect to /setup when authenticated but no profile
- Redirect to /opportunities when profile exists
- /setup redirects to /opportunities if profile exists
- Stay on /setup when no profile exists

**Step 1: Profile Creation (9 tests):**
- Display Step 1 form with all fields
- Validation error when name is empty
- Validation error when name too short
- Validation error when name exceeds maximum
- Validation error when voice too short
- Validation error when principles too short
- Validation error when too many interests
- Advance to Step 2 with valid data
- Allow empty interests (optional field)

**Step 2: Connect Bluesky (7 tests):**
- Display Step 2 with connection test button
- Show success message after connection test
- Show error after failed connection test
- Require consent checkbox before proceeding
- Advance to Step 3 after connection and consent
- Navigate back to Step 1
- Preserve profile data when navigating back

**Step 3: Configure Discovery (5 tests):**
- Display schedule options
- 1 hour selected by default
- Allow selecting different presets
- Navigate back to Step 2
- Redirect to /opportunities after finish

**Complete Flow (2 tests):**
- Complete full wizard from start to finish
- Persist data across back navigation

**Error Handling (6 tests):**
- Display error when profile creation fails
- Display error when profile name exists (409)
- Display error when account creation fails
- Display network error when connection fails
- Display error when schedule update fails

**Progress Indicator (3 tests):**
- Show step 1 indicator on profile page
- Show step 2 indicator on account page
- Show step 3 indicator on discovery page

---

## Test Fixtures

### Profile Inputs

```typescript
createMockWizardProfileInput(overrides?)
wizardProfileInputFixtures.valid
wizardProfileInputFixtures.minimalValid
wizardProfileInputFixtures.maximalValid
invalidWizardProfileInputs.*
```

### Connection Results

```typescript
createMockTestConnectionResult(overrides?)
connectionTestResults.success
connectionTestResults.invalidCredentials
connectionTestResults.networkError
connectionTestResults.missingCredentials
```

### Schedule Presets

```typescript
schedulePresets: ['15min', '30min', '1hr', '2hr', '4hr']
expectedCronExpressions: { '15min': '*/15 * * * *', ... }
```

### Environment Variables

```typescript
mockEnvVariables.valid
mockEnvVariables.missingHandle
mockEnvVariables.missingPassword
mockEnvVariables.bothMissing
```

---

## Implementation Order

Recommended sequence for Implementer:

1. **Validation utilities** (`wizard-validation.ts`)
   - `validateWizardProfileInput()` - Field length checks
   - `validateTestConnectionInput()` - Platform validation
   - `presetToCron()` - Simple map lookup

2. **WizardService basics** (`wizard-service.ts`)
   - `hasProfile()` - Count documents
   - `getExistingWizardData()` - Find one + transform

3. **Profile creation**
   - `createProfileFromWizard()` - Validate + transform + insert

4. **Connection testing**
   - `testConnection()` - Check env vars + call Bluesky API

5. **Account creation**
   - `createAccountFromWizard()` - Read env + insert

6. **Schedule configuration**
   - `setDiscoverySchedule()` - Transform preset + update

---

## Running Tests

```bash
# Run all wizard unit/integration tests
npm test -- --grep "Wizard"

# Run validation tests only
npm test -- tests/unit/wizard/wizard-validation.spec.ts

# Run service tests only
npm test -- tests/unit/services/wizard-service.spec.ts

# Run integration tests only
npm test -- tests/integration/wizard/wizard-flow.spec.ts

# Run with coverage
npm test -- --coverage

# Run E2E tests (Playwright)
npx playwright test tests/e2e/features/first-launch-wizard.spec.ts

# Run E2E tests with UI
npx playwright test tests/e2e/features/first-launch-wizard.spec.ts --ui

# Run E2E tests in headed mode
npx playwright test tests/e2e/features/first-launch-wizard.spec.ts --headed
```

---

## Expected Output (Green Phase)

When implementation is complete:

**Unit/Integration Tests (Vitest):**
```
✓ tests/unit/wizard/wizard-validation.spec.ts (17 tests)
✓ tests/unit/wizard/schedule-transformation.spec.ts (7 tests)
✓ tests/unit/services/wizard-service.spec.ts (14 tests)
✓ tests/integration/wizard/wizard-flow.spec.ts (8 tests)

Test Suites: 4 passed, 4 total
Tests:       46 passed, 46 total
```

**E2E Tests (Playwright):**
```
Running 27 tests using 1 worker

✓ [chromium] › tests/e2e/features/first-launch-wizard.spec.ts:XX:XX
  ✓ Wizard Activation › should redirect to /login when not authenticated
  ✓ Wizard Activation › should redirect to /setup when authenticated but no profile
  ... (25 more tests)

27 passed
```

---

## Key Implementation Notes

### Validation Rules

| Field | Min | Max | Required |
|-------|-----|-----|----------|
| name | 3 | 100 | Yes |
| voice | 10 | 500 | Yes |
| principles | 10 | 500 | Yes |
| interests | 0 | 20 tags | No |
| interest (each) | - | 30 | - |

### Profile Transformation

```typescript
// Wizard input
{ name, voice, principles, interests }

// Transforms to
{
  name,
  principles,
  voice: {
    tone: 'professional-friendly',  // Default
    style: voice,                   // From input
    examples: [],                   // Default
  },
  discovery: {
    interests,                      // From input
    keywords: [],                   // Default
    communities: [],                // Default
  },
  isActive: true,
}
```

### Environment Variables

- `BLUESKY_HANDLE` - Used for account handle
- `BLUESKY_APP_PASSWORD` - Used for connection test

---

## Known Limitations

- **Single account only**: v0.1 constraint
- **No skip option**: Wizard is mandatory
- **E2E tests use mocked APIs**: Real backend not required for E2E tests

---

## Success Criteria

For Green Phase completion:

- [ ] All 46 unit/integration tests pass
- [ ] All 36 E2E tests pass
- [ ] No linter errors
- [ ] TypeScript compiles without errors
- [ ] Test coverage meets thresholds

---

## References

- **Design Handoff**: [007-first-launch-wizard-handoff.md](../designer/handoffs/007-first-launch-wizard-handoff.md)
- **Design Document**: [first-launch-wizard-design.md](../designer/designs/first-launch-wizard-design.md)
- **ADR**: [ADR-012](../../../docs/architecture/decisions/012-first-launch-wizard.md)
- **Type Definitions**: `packages/shared/src/types/wizard.ts`
