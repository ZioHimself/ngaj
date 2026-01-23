# First-Launch Wizard - Test-Writer Handoff

**Handoff Number**: 007  
**Feature**: First-Launch Setup Wizard  
**Date**: 2026-01-23  
**Status**: Red Phase Complete

---

## Test Statistics

| Category | Count | Status |
|----------|-------|--------|
| Unit Tests (Validation) | 17 | Red |
| Unit Tests (Transformation) | 7 | Red |
| Unit Tests (Service) | 14 | Red |
| Integration Tests | 8 | Red |
| **Total** | **46** | **All Failing** |

---

## Files Created

### Test Files

| File | Description |
|------|-------------|
| `tests/unit/wizard/wizard-validation.spec.ts` | Input validation tests |
| `tests/unit/wizard/schedule-transformation.spec.ts` | Preset → cron tests |
| `tests/unit/services/wizard-service.spec.ts` | WizardService tests |
| `tests/integration/wizard/wizard-flow.spec.ts` | Complete flow tests |

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
# Run all wizard tests
npm test -- --grep "Wizard"

# Run validation tests only
npm test -- tests/unit/wizard/wizard-validation.spec.ts

# Run service tests only
npm test -- tests/unit/services/wizard-service.spec.ts

# Run integration tests only
npm test -- tests/integration/wizard/wizard-flow.spec.ts

# Run with coverage
npm test -- --coverage
```

---

## Expected Output (Green Phase)

When implementation is complete:

```
✓ tests/unit/wizard/wizard-validation.spec.ts (17 tests)
✓ tests/unit/wizard/schedule-transformation.spec.ts (7 tests)
✓ tests/unit/services/wizard-service.spec.ts (14 tests)
✓ tests/integration/wizard/wizard-flow.spec.ts (8 tests)

Test Suites: 4 passed, 4 total
Tests:       46 passed, 46 total
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

- **No E2E tests**: UI not implemented yet
- **Single account only**: v0.1 constraint
- **No skip option**: Wizard is mandatory

---

## Success Criteria

For Green Phase completion:

- [ ] All 46 tests pass
- [ ] No linter errors
- [ ] TypeScript compiles without errors
- [ ] Test coverage meets thresholds

---

## References

- **Design Handoff**: [007-first-launch-wizard-handoff.md](../designer/handoffs/007-first-launch-wizard-handoff.md)
- **Design Document**: [first-launch-wizard-design.md](../designer/designs/first-launch-wizard-design.md)
- **ADR**: [ADR-012](../../../docs/architecture/decisions/012-first-launch-wizard.md)
- **Type Definitions**: `packages/shared/src/types/wizard.ts`
