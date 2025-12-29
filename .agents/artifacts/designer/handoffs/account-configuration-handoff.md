# Account Configuration - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-006: Profile and Account Separation](../../../../docs/architecture/decisions/006-profile-account-separation.md) - Why we chose this architecture  
🔗 **Technical Specs**: [Design Document](../designs/account-configuration-design.md) - Complete data models, API contracts, and implementation details

**Date**: 2025-12-29  
**Designer**: Designer Agent  
**Feature**: Account Configuration (Profiles & Accounts)

---

## Overview

This feature implements MongoDB schema and REST API for managing:
- **Profiles**: Cross-platform personas (voice, discovery preferences)
- **Accounts**: Platform-specific connections (platform, handle, scheduling)
- **Relationship**: 1 Profile → Many Accounts

**What to Test**: CRUD operations for profiles and accounts, relationship constraints, validation rules, and business logic.

## Entities to Test

### 1. Profile

**What it represents**: Cross-platform persona with voice and discovery preferences

**Key behaviors to test**:
- CRUD operations (create, read, update, soft delete)
- Name uniqueness constraint
- Validation rules (name length, voice fields, examples array size)
- Cannot delete if linked accounts exist

**Complete Schema**: See [Design Doc - Profile Entity](../designs/account-configuration-design.md#entity-profile)  
**API Endpoints**: See [Design Doc - Profile Endpoints](../designs/account-configuration-design.md#endpoint-get-apiprofiles)  
**Validation Rules**: See [Design Doc - Profile Validation](../designs/account-configuration-design.md#entity-profile) (Validation Rules section)

### 2. Account

**What it represents**: Platform-specific connection linked to a profile

**Key behaviors to test**:
- CRUD operations (create, read, update, hard delete)
- (platform, handle) uniqueness constraint
- Foreign key validation (profileId must exist)
- Cron expression validation
- Immutable fields (profileId, platform cannot change after creation)

**Complete Schema**: See [Design Doc - Account Entity](../designs/account-configuration-design.md#entity-account)  
**API Endpoints**: See [Design Doc - Account Endpoints](../designs/account-configuration-design.md#endpoint-get-apiaccounts)  
**Validation Rules**: See [Design Doc - Account Validation](../designs/account-configuration-design.md#entity-account) (Validation Rules section)

## Test Scenarios by API Endpoint

> 📋 **Complete API specifications**: See [Design Doc - API Contracts](../designs/account-configuration-design.md#api-contracts) for full request/response schemas and error formats.

### Profile Endpoints

| Endpoint | Test Scenarios | Priority |
|----------|----------------|----------|
| `GET /api/profiles` | Empty array, list all, filter by active, database error | Medium |
| `GET /api/profiles/:id` | Found (200), not found (404), invalid ID (400) | High |
| `POST /api/profiles` | Create success (201), all validation errors (400), duplicate name (409) | **Critical** |
| `PUT /api/profiles/:id` | Update success (200), partial update, validation errors, not found (404) | High |
| `DELETE /api/profiles/:id` | Soft delete success (204), has accounts (409), not found (404) | **Critical** |

**Validation Test Cases for POST/PUT**:
- ✅ Missing required fields (name, voice.tone, voice.style, voice.examples)
- ✅ Field length constraints (name: 3-100, tone: max 50, style: max 500)
- ✅ Examples array size (must be 3-5 items)
- ✅ Duplicate name (409 Conflict)
- ✅ Invalid field types

**API Details**: [Design Doc - Profile Endpoints Section](../designs/account-configuration-design.md#endpoint-get-apiprofiles)

---

### Account Endpoints

| Endpoint | Test Scenarios | Priority |
|----------|----------------|----------|
| `GET /api/accounts` | Empty array, list all, filter by profileId, filter by status | Medium |
| `GET /api/accounts/:id` | Found (200), with populated profile, not found (404), invalid ID (400) | High |
| `POST /api/accounts` | Create success (201), all validation errors (400), duplicate (409), profileId not found (404) | **Critical** |
| `PUT /api/accounts/:id` | Update success (200), cannot update immutable fields (400), validation errors | High |
| `DELETE /api/accounts/:id` | Hard delete success (204), not found (404) | High |

**Validation Test Cases for POST/PUT**:
- ✅ Missing required fields (profileId, platform, handle)
- ✅ Invalid platform enum value (400)
- ✅ Invalid cron expression (400)
- ✅ ProfileId does not exist (404)
- ✅ Duplicate (platform, handle) combination (409)
- ✅ Cannot update profileId or platform (immutable fields) (400)

**API Details**: [Design Doc - Account Endpoints Section](../designs/account-configuration-design.md#endpoint-get-apiaccounts)

## Business Logic to Test

> 📋 **Complete service interfaces**: See [Design Doc - Service Interfaces](../designs/account-configuration-design.md#service-interfaces-internal) for full method signatures and implementation notes.

### ProfileService Methods

| Method | Test Scenarios | Priority |
|--------|----------------|----------|
| `validateProfileName()` | Available name (true), existing name (false), case sensitivity | Medium |
| `canDelete()` | No accounts (can delete), has accounts (cannot delete), non-existent profile | **Critical** |
| `create()` | Success, validation errors, duplicate name | **Critical** |
| `findById()` | Found, not found | High |
| `findAll()` | All profiles, filter by active flag | Medium |
| `update()` | Success, validation, not found | High |
| `softDelete()` | Success, has accounts, not found | **Critical** |

---

### AccountService Methods

| Method | Test Scenarios | Priority |
|--------|----------------|----------|
| `findAccountsForDiscovery()` | Match criteria (enabled + active), exclude paused, include profile data, empty result | **Critical** |
| `updateDiscoveryStatus()` | Success (update lastAt, clear error), failure (set error, set status='error') | **Critical** |
| `validateCredentials()` | Bluesky credentials present (true), missing (false) | Medium |
| `create()` | Success, validation, profileId not found, duplicate | **Critical** |
| `findById()` | Found, with populated profile, not found | High |
| `findAll()` | All accounts, filter by profileId, filter by status | Medium |
| `update()` | Success, cannot update immutable fields, validation | High |
| `delete()` | Hard delete success, not found | High |

**Key Behaviors**:
- `findAccountsForDiscovery()` must use MongoDB index efficiently
- `updateDiscoveryStatus()` sets `updatedAt` timestamp
- `validateCredentials()` checks `.env` for platform credentials (v0.1: Bluesky only)

## Edge Cases & Error Paths

> 📋 **Complete edge case handling**: See [Design Doc - Edge Cases Section](../designs/account-configuration-design.md#edge-cases--error-handling) for detailed error handling strategies.

| # | Scenario | Expected Behavior | Test Approach | Priority |
|---|----------|-------------------|---------------|----------|
| 1 | Duplicate profile name | Return 409 Conflict with clear message | Create same name twice | **Critical** |
| 2 | Duplicate (platform, handle) | Return 409 Conflict | Create same account twice | **Critical** |
| 3 | Delete profile with accounts | Return 409 Conflict, prevent deletion | Create profile+account, try delete | **Critical** |
| 4 | Invalid cron expression | Return 400 Validation Error | Use invalid cron string | **Critical** |
| 5 | Account with non-existent profileId | Return 404 Not Found | Use non-existent ObjectId | **Critical** |
| 6 | MongoDB connection failure | Return 500 Internal Error | Mock DB to throw error | High |
| 7 | Handle format validation | Either normalize or reject | Test various handle formats | Medium |
| 8 | Update immutable fields | Return 400 Validation Error | Try updating profileId/platform | **Critical** |
| 9 | Soft delete visibility | Exclude from default list | Delete, then list with/without filter | High |
| 10 | Discovery query performance | Use index, response <100ms | Insert 1000 accounts, measure | Medium |

**Decision Needed for #7 (Handle Format)**:
- **Option A (Recommended)**: Normalize handles (add @ prefix if missing)
- **Option B**: Strict validation (reject if format incorrect)

**Test Priority**:
- **Critical**: Must pass before implementation complete
- **High**: Should pass in initial implementation
- **Medium**: Can be deferred to refactor phase if needed

## Integration Dependencies

| Dependency | Purpose | Setup Notes |
|------------|---------|-------------|
| **MongoDB Test DB** | Isolated test database | Use `ngaj_test` database, drop collections between tests, ensure indexes created |
| **Environment Variables** | Mock credentials | Set `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD` test values |
| **cron-parser** | Validate cron expressions | npm package for cron validation |
| **mongodb** | Database driver | Native MongoDB driver (or Mongoose if chosen) |
| **vitest** | Test runner | For unit and integration tests |

**Environment Variables Format**:
```bash
BLUESKY_HANDLE=test.bsky.social
BLUESKY_APP_PASSWORD=test-xxxx-xxxx-xxxx
```

> 📋 **Credential handling details**: See [Design Doc - Integration Points](../designs/account-configuration-design.md#integration-points)

## Test Data Fixtures

> 📋 **Complete schemas**: See [Design Doc - Profile Entity](../designs/account-configuration-design.md#entity-profile) and [Account Entity](../designs/account-configuration-design.md#entity-account) for full field specifications.

### Minimal Valid Fixtures

```typescript
// Valid Profile (minimal for testing)
const testProfile = {
  name: 'Test Professional Persona',
  voice: {
    tone: 'professional-friendly',
    style: 'Clear technical explanations',
    examples: ['Example 1...', 'Example 2...', 'Example 3...']
  },
  discovery: {
    interests: ['ai', 'typescript'],
    keywords: ['machine learning'],
    communities: ['@alice.bsky.social']
  },
  isActive: true
};

// Valid Account (minimal for testing)
const testAccount = {
  profileId: '<ObjectId from created profile>',
  platform: 'bluesky',
  handle: '@test.bsky.social',
  discovery: {
    schedule: {
      enabled: true,
      cronExpression: '0 */2 * * *' // Every 2 hours
    }
  },
  status: 'active'
};
```

### Invalid Fixtures (for validation testing)

```typescript
// Invalid Profiles - test specific validation rules
const invalidName = { name: 'AB' };  // Too short
const missingTone = { name: 'Test', voice: { style: '...' } };
const tooFewExamples = { voice: { examples: ['one', 'two'] } };

// Invalid Accounts - test specific validation rules
const missingProfileId = { platform: 'bluesky', handle: '@test' };
const invalidPlatform = { platform: 'twitter' };  // Not in enum
const invalidCron = { discovery: { schedule: { cronExpression: 'invalid' } } };
```

**Note**: Create focused fixtures for each test case rather than comprehensive invalid objects.

## Definition of Done

A test suite is complete when all acceptance criteria are met:

### ✅ Functional Requirements
- [ ] All profile CRUD operations work correctly
- [ ] All account CRUD operations work correctly
- [ ] Profile name uniqueness enforced
- [ ] Account (platform, handle) uniqueness enforced
- [ ] Profile deletion blocked if active accounts exist
- [ ] Account creation fails if profileId invalid
- [ ] Cron expression validation works
- [ ] Immutable fields (profileId, platform) cannot be updated

### ✅ Data Integrity
- [ ] MongoDB indexes created correctly
- [ ] Unique constraints prevent duplicates
- [ ] Foreign key validation (profileId) works
- [ ] Timestamps (createdAt, updatedAt) managed correctly

### ✅ Error Handling
- [ ] 400 errors have clear validation messages
- [ ] 404 errors specify what was not found
- [ ] 409 errors explain conflicts
- [ ] 500 errors handled gracefully

### ✅ Performance
- [ ] `findAccountsForDiscovery()` uses index
- [ ] Query time <100ms for 1000 accounts

### ✅ Security
- [ ] Credentials never in API responses
- [ ] No MongoDB injection vulnerabilities

---

## Test Execution Strategy

1. **Unit Tests** (mocked DB): ProfileService, AccountService methods
2. **Integration Tests** (test DB): API endpoints, MongoDB queries
3. **E2E Tests**: Full workflows (profile → account → discovery)

**Coverage Target**: 100% service logic, 95%+ API endpoints

---

## Open Questions for Test-Writer

1. **Handle Normalization**: Should we normalize handles (add @ prefix automatically) or enforce strict format?
   - **Recommendation**: Normalize for better UX (covered in edge case #7)
   
2. **MongoDB Driver**: Use native driver or Mongoose ORM?
   - **Recommendation**: Native driver (less abstraction), evaluate Mongoose later if needed

---

## Handoff Complete

**Next Steps**:
1. Test-Writer creates test plan and failing tests (Red phase)
2. Implementer implements services to pass tests (Green phase)
3. Reviewer reviews code quality and architecture compliance

---

## References

- **Technical Specification**: [Design Document](../designs/account-configuration-design.md)
- **Decision Rationale**: [ADR-006: Profile and Account Separation](../../../../docs/architecture/decisions/006-profile-account-separation.md)
- **Type Definitions**: `src/types/profile.ts`, `src/types/account.ts` (see Design Doc)

