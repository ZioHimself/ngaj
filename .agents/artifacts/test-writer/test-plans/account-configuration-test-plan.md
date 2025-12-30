# Account Configuration - Test Plan

🔗 **Based on**: [Design Handoff](../../designer/handoffs/001-account-configuration-handoff.md)  
🔗 **Design Reference**: [Design Document](../../designer/designs/account-configuration-design.md)  
🔗 **Decision Context**: [ADR-006: Profile and Account Separation](../../../../docs/architecture/decisions/006-profile-account-separation.md)

**Handoff Number**: 001  
**Date**: 2025-12-30  
**Test-Writer**: Test-Writer Agent  
**Feature**: Account Configuration (Profiles & Accounts)

---

## Test Coverage Summary

### Scope
- **Profile Entity**: CRUD operations, validation, soft delete, business logic
- **Account Entity**: CRUD operations, validation, hard delete, relationship constraints
- **API Endpoints**: All profile and account REST endpoints
- **Integration**: MongoDB queries, indexes, relationship enforcement

### Test Categories

| Category | Count | Purpose |
|----------|-------|---------|
| **Unit Tests** | ~50 | Service methods, validation logic, business rules |
| **Integration Tests** | ~30 | API endpoints, database operations, indexes |
| **Edge Cases** | ~15 | Error handling, constraints, performance |
| **Total** | ~95 | Comprehensive coverage |

### Priority Breakdown

- **Critical** (Must pass): 40 tests - Core CRUD, uniqueness, relationships
- **High** (Should pass): 35 tests - Validation, error handling, edge cases
- **Medium** (Nice to have): 20 tests - Performance, complex queries, formatting

---

## Test Organization

### File Structure

```
tests/
├── fixtures/
│   ├── profile-fixtures.ts          # Profile test data factories
│   └── account-fixtures.ts          # Account test data factories
├── unit/
│   ├── services/
│   │   ├── profile-service.spec.ts  # ProfileService unit tests
│   │   └── account-service.spec.ts  # AccountService unit tests
│   └── types/
│       ├── profile.spec.ts          # Profile type guards and utilities
│       └── account.spec.ts          # Account type guards and utilities
└── integration/
    ├── api/
    │   ├── profiles-api.spec.ts     # Profile API endpoints
    │   └── accounts-api.spec.ts     # Account API endpoints
    └── database/
        ├── profile-repository.spec.ts # MongoDB profile operations
        └── account-repository.spec.ts # MongoDB account operations
```

---

## Unit Tests

### ProfileService Tests (tests/unit/services/profile-service.spec.ts)

**Test Count**: 25 tests

#### create() - 8 tests
- ✅ **[Critical]** Creates profile with valid data
- ✅ **[Critical]** Throws ValidationError when name missing
- ✅ **[Critical]** Throws ValidationError when name too short (< 3 chars)
- ✅ **[High]** Throws ValidationError when name too long (> 100 chars)
- ✅ **[Critical]** Throws ConflictError when name already exists
- ✅ **[High]** Throws ValidationError when voice.tone missing
- ✅ **[High]** Throws ValidationError when voice.examples has < 3 items
- ✅ **[High]** Throws ValidationError when voice.examples has > 5 items

#### findById() - 3 tests
- ✅ **[High]** Returns profile when found
- ✅ **[High]** Returns null when not found
- ✅ **[Medium]** Throws error when invalid ObjectId format

#### findAll() - 3 tests
- ✅ **[Medium]** Returns all profiles when no filter
- ✅ **[High]** Returns only active profiles when active=true filter
- ✅ **[Medium]** Returns empty array when no profiles exist

#### update() - 5 tests
- ✅ **[High]** Updates profile with valid partial data
- ✅ **[High]** Updates updatedAt timestamp
- ✅ **[High]** Throws NotFoundError when profile doesn't exist
- ✅ **[High]** Throws ValidationError when invalid data
- ✅ **[Critical]** Throws ConflictError when updating to duplicate name

#### softDelete() - 4 tests
- ✅ **[Critical]** Sets isActive=false when no accounts linked
- ✅ **[Critical]** Throws ConflictError when active accounts exist
- ✅ **[High]** Throws NotFoundError when profile doesn't exist
- ✅ **[High]** Updates updatedAt timestamp on soft delete

#### Business Logic - 2 tests
- ✅ **[Medium]** validateProfileName() returns true for available name
- ✅ **[Medium]** canDelete() returns false when accounts linked

---

### AccountService Tests (tests/unit/services/account-service.spec.ts)

**Test Count**: 28 tests

#### create() - 10 tests
- ✅ **[Critical]** Creates account with valid data
- ✅ **[Critical]** Throws NotFoundError when profileId doesn't exist
- ✅ **[Critical]** Throws ValidationError when profileId missing
- ✅ **[Critical]** Throws ValidationError when platform missing
- ✅ **[Critical]** Throws ValidationError when invalid platform enum
- ✅ **[Critical]** Throws ValidationError when handle missing
- ✅ **[Critical]** Throws ConflictError when (platform, handle) duplicate
- ✅ **[Critical]** Throws ValidationError when invalid cron expression
- ✅ **[High]** Initializes discovery.lastAt as undefined
- ✅ **[High]** Initializes discovery.error as undefined

#### findById() - 4 tests
- ✅ **[High]** Returns account when found
- ✅ **[High]** Returns account with populated profile when populate=true
- ✅ **[High]** Returns null when not found
- ✅ **[Medium]** Throws error when invalid ObjectId format

#### findAll() - 4 tests
- ✅ **[Medium]** Returns all accounts when no filter
- ✅ **[High]** Filters by profileId when provided
- ✅ **[High]** Filters by status when provided
- ✅ **[Medium]** Returns empty array when no accounts exist

#### update() - 5 tests
- ✅ **[High]** Updates account with valid partial data
- ✅ **[Critical]** Throws ValidationError when attempting to update profileId
- ✅ **[Critical]** Throws ValidationError when attempting to update platform
- ✅ **[High]** Throws NotFoundError when account doesn't exist
- ✅ **[High]** Updates updatedAt timestamp

#### delete() - 2 tests
- ✅ **[High]** Deletes account successfully (hard delete)
- ✅ **[High]** Throws NotFoundError when account doesn't exist

#### Business Logic - 3 tests
- ✅ **[Critical]** findAccountsForDiscovery() returns only enabled+active accounts
- ✅ **[Critical]** updateDiscoveryStatus() updates lastAt on success
- ✅ **[Critical]** updateDiscoveryStatus() sets error and status='error' on failure

---

## Integration Tests

### Profile API Tests (tests/integration/api/profiles-api.spec.ts)

**Test Count**: 18 tests

#### GET /api/profiles - 3 tests
- ✅ **[Medium]** Returns 200 with empty array when no profiles
- ✅ **[Medium]** Returns 200 with all profiles
- ✅ **[High]** Filters by active flag correctly

#### GET /api/profiles/:id - 3 tests
- ✅ **[High]** Returns 200 with profile when found
- ✅ **[High]** Returns 404 when profile not found
- ✅ **[Medium]** Returns 400 when invalid ObjectId format

#### POST /api/profiles - 6 tests
- ✅ **[Critical]** Returns 201 with created profile
- ✅ **[Critical]** Returns 400 when name missing
- ✅ **[Critical]** Returns 400 when voice.tone missing
- ✅ **[High]** Returns 400 when voice.examples invalid size
- ✅ **[Critical]** Returns 409 when duplicate name
- ✅ **[High]** Sets createdAt and updatedAt timestamps

#### PUT /api/profiles/:id - 4 tests
- ✅ **[High]** Returns 200 with updated profile
- ✅ **[High]** Returns 404 when profile not found
- ✅ **[High]** Returns 400 when validation fails
- ✅ **[High]** Updates only updatedAt (not createdAt)

#### DELETE /api/profiles/:id - 2 tests
- ✅ **[Critical]** Returns 204 when successfully deleted
- ✅ **[Critical]** Returns 409 when profile has active accounts

---

### Account API Tests (tests/integration/api/accounts-api.spec.ts)

**Test Count**: 20 tests

#### GET /api/accounts - 4 tests
- ✅ **[Medium]** Returns 200 with empty array when no accounts
- ✅ **[Medium]** Returns 200 with all accounts
- ✅ **[High]** Filters by profileId correctly
- ✅ **[High]** Filters by status correctly

#### GET /api/accounts/:id - 4 tests
- ✅ **[High]** Returns 200 with account when found
- ✅ **[High]** Returns 200 with populated profile when populate=true
- ✅ **[High]** Returns 404 when account not found
- ✅ **[Medium]** Returns 400 when invalid ObjectId format

#### POST /api/accounts - 6 tests
- ✅ **[Critical]** Returns 201 with created account
- ✅ **[Critical]** Returns 404 when profileId doesn't exist
- ✅ **[Critical]** Returns 400 when invalid platform enum
- ✅ **[Critical]** Returns 409 when duplicate (platform, handle)
- ✅ **[Critical]** Returns 400 when invalid cron expression
- ✅ **[High]** Sets createdAt and updatedAt timestamps

#### PUT /api/accounts/:id - 4 tests
- ✅ **[High]** Returns 200 with updated account
- ✅ **[Critical]** Returns 400 when attempting to update profileId
- ✅ **[Critical]** Returns 400 when attempting to update platform
- ✅ **[High]** Returns 404 when account not found

#### DELETE /api/accounts/:id - 2 tests
- ✅ **[High]** Returns 204 when successfully deleted
- ✅ **[High]** Returns 404 when account not found

---

## Edge Cases & Performance Tests

### Edge Cases (tests/integration/database/edge-cases.spec.ts)

**Test Count**: 10 tests

- ✅ **[Critical]** Duplicate profile name enforcement via unique index
- ✅ **[Critical]** Duplicate (platform, handle) enforcement via unique index
- ✅ **[Critical]** Cascading delete prevention (profile with accounts)
- ✅ **[Critical]** Invalid cron expression validation
- ✅ **[High]** Soft deleted profiles excluded from default queries
- ✅ **[High]** Account handle format normalization (Bluesky @prefix)
- ✅ **[Medium]** MongoDB connection failure retry logic
- ✅ **[Medium]** Large voice.examples array handling (5 items max)
- ✅ **[Medium]** Unicode in profile names (emoji, non-ASCII)
- ✅ **[Medium]** Concurrent profile creation with same name

### Performance Tests (tests/integration/database/performance.spec.ts)

**Test Count**: 3 tests

- ✅ **[Medium]** findAccountsForDiscovery() uses index (<100ms for 1000 accounts)
- ✅ **[Medium]** Profile.name index improves lookup performance
- ✅ **[Medium]** Account (platform, handle) index enforces uniqueness efficiently

---

## Mock Strategy

### External Dependencies

| Dependency | Mock Approach | Reason |
|------------|---------------|--------|
| **MongoDB** | In-memory MongoDB (MongoMemoryServer) for integration tests | Fast, isolated, no external deps |
| **MongoDB** | Vitest mocks for unit tests | Test service logic without DB |
| **Environment Variables** | Vitest vi.stubEnv() | Test credential validation |
| **cron-parser** | Real library (no mock) | Lightweight, deterministic |
| **Date/Time** | Vitest vi.useFakeTimers() (where needed) | Deterministic timestamp testing |

### Mock Setup

```typescript
// Unit tests: Mock MongoDB collections
const mockCollection = {
  insertOne: vi.fn(),
  findOne: vi.fn(),
  find: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn()
};

// Integration tests: Use MongoMemoryServer
import { MongoMemoryServer } from 'mongodb-memory-server';
let mongoServer: MongoMemoryServer;
let db: Db;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const client = await MongoClient.connect(mongoServer.getUri());
  db = client.db('ngaj_test');
  
  // Create indexes
  await db.collection('profiles').createIndex({ name: 1 }, { unique: true });
  await db.collection('accounts').createIndex(
    { platform: 1, handle: 1 }, 
    { unique: true }
  );
});

afterAll(async () => {
  await mongoServer.stop();
});

afterEach(async () => {
  // Clean collections between tests
  await db.collection('profiles').deleteMany({});
  await db.collection('accounts').deleteMany({});
});
```

---

## Test Data Fixtures

### Profile Fixtures (tests/fixtures/profile-fixtures.ts)

```typescript
// Valid profiles
export const validProfile = {
  name: 'Test Professional Persona',
  voice: {
    tone: 'professional-friendly',
    style: 'Clear technical explanations with occasional humor',
    examples: [
      'Great question! In distributed systems...',
      'I found this pattern useful when...',
      'Let me break this down step by step...'
    ]
  },
  discovery: {
    interests: ['ai', 'typescript', 'testing'],
    keywords: ['machine learning', 'tdd'],
    communities: ['@alice.bsky.social']
  },
  isActive: true
};

// Invalid profiles for validation testing
export const invalidProfiles = {
  missingName: { /* omit name */ },
  shortName: { name: 'AB' },
  longName: { name: 'X'.repeat(101) },
  missingTone: { voice: { style: '...', examples: ['1', '2', '3'] } },
  tooFewExamples: { voice: { tone: 'test', style: '...', examples: ['1', '2'] } },
  tooManyExamples: { voice: { tone: 'test', style: '...', examples: ['1', '2', '3', '4', '5', '6'] } }
};
```

### Account Fixtures (tests/fixtures/account-fixtures.ts)

```typescript
// Valid accounts
export const createValidAccount = (profileId: ObjectId) => ({
  profileId,
  platform: 'bluesky' as Platform,
  handle: '@test.bsky.social',
  discovery: {
    schedule: {
      enabled: true,
      cronExpression: '0 */2 * * *' // Every 2 hours
    }
  },
  status: 'active' as AccountStatus
});

// Invalid accounts for validation testing
export const invalidAccounts = {
  missingProfileId: { platform: 'bluesky', handle: '@test' },
  invalidPlatform: { platform: 'twitter' }, // Not in enum
  missingHandle: { platform: 'bluesky' },
  invalidCron: { 
    discovery: { 
      schedule: { 
        enabled: true, 
        cronExpression: 'invalid cron' 
      } 
    } 
  }
};
```

---

## Known Limitations

### Deferred Tests (Out of Scope for v0.1)

1. **Multi-user authentication** - v0.1 is single-user, local-first
2. **Availability/quiet hours** - Deferred to future version per design
3. **Knowledge base integration** - Will be tested separately
4. **Platform-specific credential validation** - Only Bluesky in v0.1
5. **Rate limiting** - Not required for v0.1 scope
6. **Caching performance** - Implement only if performance issues arise

### Test Coverage Gaps (Intentional)

- **Type definitions**: Type guards tested, but not exhaustive type checks
- **MongoDB driver errors**: Focus on common errors (not all edge cases)
- **Handle format normalization**: Design decision pending (edge case #7)

---

## Definition of Done

### Functional Requirements ✅
- [ ] All profile CRUD operations work correctly
- [ ] All account CRUD operations work correctly
- [ ] Profile name uniqueness enforced
- [ ] Account (platform, handle) uniqueness enforced
- [ ] Profile deletion blocked if active accounts exist
- [ ] Account creation fails if profileId invalid
- [ ] Cron expression validation works
- [ ] Immutable fields (profileId, platform) cannot be updated

### Test Quality ✅
- [ ] All tests follow Arrange-Act-Assert pattern
- [ ] Test names describe expected behavior clearly
- [ ] Tests are isolated (no inter-test dependencies)
- [ ] Fixtures reduce duplication
- [ ] Mock strategy documented and consistent

### Red Phase ✅
- [ ] All tests fail with clear error messages
- [ ] Failures due to missing implementation (not test bugs)
- [ ] Implementation stubs created with correct signatures
- [ ] No false positives (tests passing incorrectly)

### Documentation ✅
- [ ] Test plan explains coverage decisions
- [ ] Fixtures documented with usage examples
- [ ] Mock strategy clear for Implementer
- [ ] Handoff notes highlight critical tests

---

## Handoff to Implementer

### Implementation Order (Recommended)

1. **Phase 1: Data Layer**
   - MongoDB connection and configuration
   - Profile repository (CRUD operations)
   - Account repository (CRUD operations)
   - Index creation

2. **Phase 2: Service Layer**
   - ProfileService (business logic)
   - AccountService (business logic)
   - Validation utilities (cron, formats)

3. **Phase 3: API Layer**
   - Express routes setup
   - Profile API endpoints
   - Account API endpoints
   - Error handling middleware

### Critical Tests (Must Pass First)

1. **Profile uniqueness**: Duplicate name prevention
2. **Account uniqueness**: Duplicate (platform, handle) prevention
3. **Relationship integrity**: Profile deletion blocked when accounts exist
4. **Foreign key validation**: Account creation requires valid profileId
5. **Immutability**: profileId and platform cannot change after creation

### Test Execution Commands

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- tests/unit

# Run integration tests only
npm test -- tests/integration

# Run specific test file
npm test -- tests/unit/services/profile-service.spec.ts

# Run with coverage
npm test -- --coverage

# Watch mode (TDD)
npm test -- --watch
```

### Expected Red Phase Output

```
FAIL tests/unit/services/profile-service.spec.ts
  ProfileService
    create()
      ✗ creates profile with valid data (2 ms)
          Error: Not implemented
    ...

FAIL tests/integration/api/profiles-api.spec.ts
  Profile API
    POST /api/profiles
      ✗ returns 201 with created profile (5 ms)
          Error: Cannot GET /api/profiles
    ...

Test Suites: 8 failed, 8 total
Tests:       95 failed, 95 total
Time:        1.523 s
```

---

## Success Metrics

- **Coverage**: Aim for 100% of service logic, 95%+ of API endpoints
- **Test Speed**: Unit tests <2s, integration tests <10s, full suite <15s
- **Maintainability**: Clear test names, minimal duplication via fixtures
- **Reliability**: No flaky tests, deterministic failures

---

## References

- **Design Handoff**: [001-account-configuration-handoff.md](../../designer/handoffs/001-account-configuration-handoff.md)
- **Design Document**: [account-configuration-design.md](../../designer/designs/account-configuration-design.md)
- **ADR-006**: [Profile and Account Separation](../../../../docs/architecture/decisions/006-profile-account-separation.md)
- **Type Definitions**: `src/types/profile.ts`, `src/types/account.ts`
- **Vitest Docs**: https://vitest.dev/
- **MongoMemoryServer**: https://github.com/nodkz/mongodb-memory-server

---

**Test Plan Complete** ✅  
**Ready for Test Implementation** 🚀

