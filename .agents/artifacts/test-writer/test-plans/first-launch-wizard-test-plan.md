# First-Launch Wizard - Test Plan

**Handoff Number**: 007  
**Feature**: First-Launch Setup Wizard  
**Date**: 2026-01-24  
**Status**: Red Phase (Tests Written, Implementation Pending)

---

## References

- **Design Handoff**: [007-first-launch-wizard-handoff.md](../../designer/handoffs/007-first-launch-wizard-handoff.md)
- **Design Document**: [first-launch-wizard-design.md](../../designer/designs/first-launch-wizard-design.md)
- **ADR**: [ADR-012: First-Launch Setup Wizard](../../../../docs/architecture/decisions/012-first-launch-wizard.md)
- **Type Definitions**: `packages/shared/src/types/wizard.ts`

---

## 1. Test Coverage Summary

| Category | Tests | Priority |
|----------|-------|----------|
| Wizard Validation | 12 | Critical |
| Schedule Transformation | 5 | Critical |
| Wizard Service | 14 | Critical |
| Integration (Wizard Flow) | 8 | Critical |
| E2E (Wizard UI) | 36 | Critical |
| **Total** | **75** | |

---

## 2. Test Categories

### 2.1 Unit Tests

#### Wizard Validation (`tests/unit/wizard/wizard-validation.spec.ts`)

| Test | Description |
|------|-------------|
| validateWizardProfileInput - valid | Accepts valid profile input |
| validateWizardProfileInput - missing name | Rejects empty name |
| validateWizardProfileInput - name too short | Rejects name < 3 chars |
| validateWizardProfileInput - name too long | Rejects name > 100 chars |
| validateWizardProfileInput - voice too short | Rejects voice < 10 chars |
| validateWizardProfileInput - voice too long | Rejects voice > 500 chars |
| validateWizardProfileInput - principles too short | Rejects principles < 10 chars |
| validateWizardProfileInput - principles too long | Rejects principles > 500 chars |
| validateWizardProfileInput - too many interests | Rejects > 20 interests |
| validateWizardProfileInput - interest too long | Rejects interest > 30 chars |
| validateTestConnectionInput - valid | Accepts valid connection input |
| validateTestConnectionInput - invalid platform | Rejects non-bluesky platform |

#### Schedule Transformation (`tests/unit/wizard/schedule-transformation.spec.ts`)

| Test | Description |
|------|-------------|
| presetToCron - 15min | Maps '15min' to '*/15 * * * *' |
| presetToCron - 30min | Maps '30min' to '*/30 * * * *' |
| presetToCron - 1hr | Maps '1hr' to '0 * * * *' |
| presetToCron - 2hr | Maps '2hr' to '0 */2 * * *' |
| presetToCron - 4hr | Maps '4hr' to '0 */4 * * *' |

#### Wizard Service (`tests/unit/services/wizard-service.spec.ts`)

| Test | Description |
|------|-------------|
| createProfileFromWizard - creates profile | Transforms wizard input to profile |
| createProfileFromWizard - sets defaults | Applies default tone and empty arrays |
| createProfileFromWizard - validates input | Throws on invalid input |
| testConnection - success | Returns success with handle |
| testConnection - failure | Returns failure with error message |
| testConnection - missing credentials | Returns failure when .env empty |
| createAccountFromWizard - creates account | Creates account linked to profile |
| createAccountFromWizard - reads handle from env | Uses BLUESKY_HANDLE from .env |
| setDiscoverySchedule - applies preset | Updates account with cron schedules |
| setDiscoverySchedule - enables both schedules | Sets replies and search enabled |
| hasProfile - returns true | Detects existing profile |
| hasProfile - returns false | Detects no profile |
| getExistingWizardData - returns profile | Returns existing profile for pre-population |
| getExistingWizardData - returns null | Returns null when no profile |

### 2.2 Integration Tests

#### Wizard Flow (`tests/integration/wizard/wizard-flow.spec.ts`)

| Test | Description |
|------|-------------|
| Complete wizard flow | Profile → Account → Schedule → Success |
| Step 1 creates profile | Profile persists in database |
| Step 2 tests connection | Connection test calls Bluesky API |
| Step 2 creates account | Account linked to profile |
| Step 3 sets schedules | Both schedules configured correctly |
| Back navigation preserves data | Profile data persists on back |
| Browser refresh pre-populates | Existing data loads into form |
| Duplicate profile name rejected | 409 Conflict on duplicate |

### 2.3 E2E Tests (Playwright)

#### Wizard Activation (`tests/e2e/features/first-launch-wizard.spec.ts`)

| Test | Description |
|------|-------------|
| Redirect to /login when not authenticated | Unauthenticated users see login |
| Redirect to /setup when no profile | Authenticated users without profile go to wizard |
| Redirect to /opportunities when profile exists | Users with profile go to dashboard |
| /setup redirects to /opportunities if profile exists | Wizard not shown after completion |
| Stay on /setup when no profile exists | Wizard stays visible until complete |

#### Step 1: Profile Creation (`tests/e2e/features/first-launch-wizard.spec.ts`)

| Test | Description |
|------|-------------|
| Display Step 1 form with all fields | All inputs visible |
| Validation error when name is empty | "Profile name is required" |
| Validation error when name too short | "at least 3 characters" |
| Validation error when name exceeds max | "not exceed 100 characters" |
| Validation error when voice too short | "at least 10 characters" |
| Validation error when principles too short | "at least 10 characters" |
| Validation error when too many interests | "Maximum 20 interests" |
| Advance to Step 2 with valid data | Form submits successfully |
| Allow empty interests | Optional field works |

#### Step 2: Connect Bluesky (`tests/e2e/features/first-launch-wizard.spec.ts`)

| Test | Description |
|------|-------------|
| Display Step 2 with connection test button | UI elements visible |
| Show success message after connection test | "Connected successfully" shown |
| Show error after failed connection | "Connection failed" shown |
| Require consent checkbox before proceeding | "You must agree" error |
| Advance to Step 3 after connection and consent | Proceeds to discovery |
| Navigate back to Step 1 | Back button works |
| Preserve profile data when navigating back | Data pre-populated |

#### Step 3: Configure Discovery (`tests/e2e/features/first-launch-wizard.spec.ts`)

| Test | Description |
|------|-------------|
| Display schedule options | All presets visible |
| 1 hour selected by default | Default selection shown |
| Allow selecting different presets | Selection changes |
| Navigate back to Step 2 | Back button works |
| Redirect to /opportunities after finish | Completion flow |

#### Complete Flow & Error Handling (`tests/e2e/features/first-launch-wizard.spec.ts`)

| Test | Description |
|------|-------------|
| Complete full wizard from start to finish | Happy path E2E |
| Persist data across back navigation | State preserved |
| Display error when profile creation fails | 500 error handled |
| Display error when profile name exists | 409 conflict handled |
| Display error when account creation fails | Error shown |
| Display network error when connection fails | Network error handled |
| Display error when schedule update fails | Error shown |

---

## 3. Mock Strategy

### Mocked Dependencies

| Dependency | Mock Type | Reason |
|------------|-----------|--------|
| MongoDB | In-memory mock | Fast, isolated tests |
| Bluesky API | Vitest mock | Avoid real API calls |
| Environment variables | vi.stubEnv | Control credentials |
| ProfileService | Spy/Partial mock | Integration tests |
| AccountService | Spy/Partial mock | Integration tests |

### Mock Data

- `createMockWizardProfileInput()` - Valid wizard profile input
- `createMockTestConnectionResult()` - Connection test results
- `createMockWizardAccountInput()` - Valid wizard account input
- `createMockWizardDiscoveryInput()` - Schedule preset input
- `invalidWizardInputs` - Invalid data for validation tests

---

## 4. Test Organization

```
tests/
├── fixtures/
│   └── wizard-fixtures.ts                    # Wizard-specific fixtures
├── unit/
│   ├── wizard/
│   │   ├── wizard-validation.spec.ts         # Input validation tests
│   │   └── schedule-transformation.spec.ts   # Cron preset tests
│   └── services/
│       └── wizard-service.spec.ts            # Wizard service tests
├── integration/
│   └── wizard/
│       └── wizard-flow.spec.ts               # Complete flow tests
└── e2e/
    └── features/
        └── first-launch-wizard.spec.ts       # Full UI E2E tests (Playwright)
```

---

## 5. Test Priorities

### Critical (Must Pass)

1. Wizard validation rules (all fields)
2. Schedule preset → cron transformation
3. Profile creation from wizard input
4. Connection test success/failure
5. Account creation with profile link
6. Discovery schedule configuration

### Important (Should Pass)

7. Back navigation data persistence
8. Browser refresh data pre-population
9. Duplicate profile name detection
10. Error message clarity

### Nice-to-Have

11. Test timing/performance
12. Edge cases in interest parsing

---

## 6. Implementation Stubs Required

### WizardService (`packages/backend/src/services/wizard-service.ts`)

```typescript
export class WizardService {
  async hasProfile(): Promise<boolean>;
  async getExistingWizardData(): Promise<WizardProfileInput | null>;
  async createProfileFromWizard(input: WizardProfileInput): Promise<Profile>;
  async testConnection(input: TestConnectionInput): Promise<TestConnectionResult>;
  async createAccountFromWizard(input: WizardAccountInput): Promise<Account>;
  async setDiscoverySchedule(accountId: string, input: WizardDiscoveryInput): Promise<Account>;
}
```

### Validation Functions (`packages/backend/src/utils/wizard-validation.ts`)

```typescript
export function validateWizardProfileInput(input: WizardProfileInput): ValidationResult;
export function validateTestConnectionInput(input: TestConnectionInput): ValidationResult;
export function presetToCron(preset: DiscoverySchedulePreset): string;
```

---

## 7. Known Limitations

- **Multi-account not tested**: v0.1 supports single account only
- **Skip wizard not tested**: No skip option in v0.1
- **E2E tests use mocked APIs**: Real backend not required for E2E

---

## 8. Success Criteria

- [ ] All 75 tests fail with clear "Not implemented" errors
- [ ] No TypeScript compilation errors
- [ ] No linter errors in test code
- [ ] Stubs have correct method signatures
- [ ] Test names clearly describe expected behavior
- [ ] Fixtures cover all validation edge cases
- [ ] E2E tests verify full user workflow
