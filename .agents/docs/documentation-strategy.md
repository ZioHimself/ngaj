# Documentation Strategy: Eliminating Duplication

## Problem Statement

The Designer Agent previously created three documents that had significant content overlap:
1. **ADR** (Architecture Decision Record)
2. **Design Document** (Technical specification)
3. **Handoff Document** (Test-Writer guidance)

This led to:
- ❌ Redundant information across documents
- ❌ Maintenance burden (update in multiple places)
- ❌ Longer documentation phase
- ❌ Risk of inconsistencies

## Solution: Information Hierarchy

Each document now has a **distinct purpose** and **unique content**, with cross-references instead of duplication.

### Document Roles

```
┌─────────────────────────────────────────────────────────┐
│ ADR (Architecture Decision Record)                      │
│ Purpose: Strategic - WHAT was decided and WHY           │
│ Audience: Architects, future team members               │
│ Content: High-level decisions, rationale, trade-offs    │
│ Size: ~150-250 lines                                    │
└─────────────────────────────────────────────────────────┘
                          │
                          │ References
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Design Document                                         │
│ Purpose: Technical - HOW to implement                   │
│ Audience: All implementers (Test-Writer, Implementer)   │
│ Content: Complete schemas, APIs, diagrams, edge cases   │
│ Size: ~400-700 lines (source of truth)                  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ References
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Test-Writer Handoff                                     │
│ Purpose: Actionable - WHAT to test                      │
│ Audience: Test-Writer Agent specifically                │
│ Content: Test scenarios, acceptance criteria, mocks     │
│ Size: ~200-350 lines                                    │
└─────────────────────────────────────────────────────────┘
```

## Content Distribution

### ADR (WHY) - Strategic Level

**✅ Include**:
- Problem context (business/technical)
- Options considered (with pros/cons)
- Decision made (high-level description)
- Rationale (why this choice over others)
- Consequences (positive and negative trade-offs)
- Links to related ADRs

**❌ Don't Include** (belongs in Design Doc):
- Complete TypeScript interfaces
- Full API request/response schemas
- Detailed implementation algorithms
- Sequence diagrams (unless critical to decision)
- Test scenarios

**Example** (ADR-006: Profile/Account Separation):
```markdown
## Decision
We will store Profiles and Accounts in separate MongoDB collections
with a many-to-one relationship (many Profiles → one Account).

## Rationale
1. Profiles and Accounts have different lifecycles
2. User may want different privacy settings per profile
3. Easier to extend profile types (personal, brand, etc.)

## Consequences
**Positive**:
- More flexible for multi-profile scenarios
- Clear separation of concerns

**Negative**:
- Requires join queries to fetch profile + account data
- More complex than single collection
```

**❌ Bad** (too detailed for ADR):
```markdown
## Decision
```typescript
interface Profile {
  id: string;
  account_id: string;
  display_name: string;
  bio: string;
  // ... 50 more lines of interface
}

interface Account {
  // ... another 50 lines
}
```
^ This belongs in Design Doc, not ADR
```

---

### Design Document (HOW) - Technical Level

**✅ Include** (Source of Truth):
- **Complete data models** (full TypeScript interfaces with JSDoc)
- **API contracts** (full request/response schemas)
- **Service interfaces** (all methods with signatures)
- **Sequence diagrams** (for complex flows)
- **Database design** (collections, indexes, query patterns)
- **Error handling** (all error codes and conditions)
- **Edge cases** (table of cases and handling)
- **Performance notes** (optimization strategies)

**❌ Don't Include** (belongs elsewhere):
- High-level decision rationale (that's in ADR)
- Test-specific scenarios (that's in Handoff)
- Test fixtures and mock data (that's in Handoff)

**Cross-References**:
- Top of doc: `📋 **Decision Context**: [ADR-###](path/to/adr.md)`
- Where relevant: "See [ADR-###](path) for why we chose this approach"

**Example** (Design Doc: Account Configuration):
```markdown
# Account Configuration - Design Document

📋 **Decision Context**: [ADR-006](../../../docs/architecture/decisions/006-profile-account-separation.md)

## 1. Data Models

### 1.1 Account Entity

```typescript
/**
 * Represents a user's account containing authentication credentials
 * and linking multiple social media profiles.
 * 
 * @see ADR-006 for rationale on Profile/Account separation
 */
interface Account {
  /** MongoDB ObjectId */
  id: string;
  
  /** Account creation timestamp */
  created_at: Date;
  
  /** Last modification timestamp */
  updated_at: Date;
  
  /** All profiles owned by this account */
  profile_ids: string[];
}
```

**MongoDB Collection**: `accounts`
**Indexes**:
- `{ id: 1 }` - Primary key (unique)

### 1.2 Profile Entity

```typescript
/**
 * Represents a single social media profile (e.g., Bluesky, LinkedIn)
 * linked to an Account.
 */
interface Profile {
  /** MongoDB ObjectId */
  id: string;
  
  /** Reference to parent Account */
  account_id: string;
  
  /** Platform identifier */
  platform: 'bluesky' | 'linkedin' | 'reddit';
  
  /** Platform-specific username/handle */
  handle: string;
  
  /** Display name for this profile */
  display_name: string;
  
  // ... complete interface with all fields
}
```

## 2. API Contracts

### 2.1 Create Account

**Endpoint**: `POST /api/accounts`

**Request**:
```typescript
interface CreateAccountRequest {
  // ... complete schema
}
```

**Response** (Success - 201):
```typescript
interface CreateAccountResponse {
  account: Account;
}
```

**Errors**:
- `400` - Invalid request body
- `409` - Account already exists
- `500` - Database error

// ... more sections
```

---

### Test-Writer Handoff (TEST WHAT) - Action Level

**✅ Include**:
- **Test scenarios** (Given/When/Then format)
- **Acceptance criteria** (specific assertions)
- **Edge cases** (prioritized list)
- **Mock/stub guidance** (what to mock, how to mock)
- **Test fixtures** (minimal examples for testing)
- **Test priorities** (critical path vs. nice-to-have)
- **Definition of Done** (checklist)

**❌ Don't Include** (reference Design Doc instead):
- Complete data model interfaces (link to Design Doc Section 1)
- Full API schemas (link to Design Doc Section 2)
- Implementation details (Test-Writer doesn't implement)

**Cross-References**:
- Top of doc: Links to both ADR and Design Doc
- In scenarios: "See [Design Doc Section X](link) for complete schema"
- For APIs: "Technical details: [Design Doc Section 2.1](link)"

**Example** (Handoff: Account Configuration):
```markdown
# Account Configuration - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-006](../../../docs/architecture/decisions/006-profile-account-separation.md)
🔗 **Technical Specs**: [Design Document](../designs/account-configuration-design.md)

## 2. Test Scenarios

### 2.1 Unit Tests: AccountService

#### Scenario: Create account successfully
**Given**: No existing account
**When**: Call `accountService.create()`
**Then**: Account is created and returned

**Acceptance Criteria**:
- [ ] Returns account with generated `id`
- [ ] Sets `created_at` to current timestamp
- [ ] Initializes `profile_ids` as empty array

**Technical Details**: See [Design Doc Section 1.1](../designs/account-configuration-design.md#11-account-entity) for complete `Account` interface.

#### Scenario: Link profile to account
**Given**: Existing account and profile
**When**: Call `accountService.linkProfile(accountId, profileId)`
**Then**: Profile is added to account's `profile_ids`

**Acceptance Criteria**:
- [ ] `profile_ids` contains the new profile ID
- [ ] Profile's `account_id` is set correctly
- [ ] Returns updated account

**API Schema**: See [Design Doc Section 2.3](../designs/account-configuration-design.md#23-link-profile) for request/response schemas.

---

## 3. Edge Cases & Error Paths

| Scenario | Expected Behavior | Priority | Details |
|----------|-------------------|----------|---------|
| Link profile already linked | Return 409 error | High | [Design Doc 2.3](link) |
| Link non-existent profile | Return 404 error | High | [Design Doc 2.3](link) |
| Create duplicate account | Return 409 error | Medium | [Design Doc 2.1](link) |

---

## 4. Data Fixtures

### Test Account (Minimal)
```typescript
const testAccount: Partial<Account> = {
  id: "test-account-123",
  profile_ids: []
};
```

**Full Schema**: See [Design Doc Section 1.1](../designs/account-configuration-design.md#11-account-entity)
```

## Benefits of This Approach

### 1. Reduced Duplication
- **Before**: ~1,500 lines with ~40% duplication
- **After**: ~800 lines with cross-references
- **Savings**: ~47% less content to write and maintain

### 2. Single Source of Truth
- Design Doc is the authoritative source for technical details
- ADR and Handoff reference it, don't duplicate it
- Changes only need to be made in one place

### 3. Clear Purpose for Each Document
| Document | Reader's Question | Answer |
|----------|-------------------|--------|
| ADR | "Why did we decide this?" | Strategic rationale |
| Design Doc | "How do I implement this?" | Complete technical specs |
| Handoff | "What do I need to test?" | Test scenarios + criteria |

### 4. Better Maintainability
- Update data model? → Change Design Doc only
- ADR and Handoff automatically reference the update
- No risk of inconsistencies

### 5. Faster Documentation
- Designer can be more concise
- Less time spent copy/pasting between documents
- Focus on unique content for each artifact

## Implementation Checklist

When creating design artifacts, follow this sequence:

### Step 1: Create ADR (First)
- [ ] Write problem context
- [ ] List options considered
- [ ] Document decision (high-level)
- [ ] Explain rationale
- [ ] Note consequences
- [ ] Link to related ADRs
- [ ] **Don't** include detailed schemas or code

### Step 2: Create Design Doc (Second)
- [ ] Add cross-reference to ADR at top
- [ ] Write complete data models (TypeScript)
- [ ] Document all API contracts (full schemas)
- [ ] Add sequence diagrams for complex flows
- [ ] Detail error handling
- [ ] List edge cases
- [ ] Note performance considerations
- [ ] This is the "source of truth" for technical details

### Step 3: Create Handoff (Third)
- [ ] Add cross-references to both ADR and Design Doc
- [ ] Write test scenarios (Given/When/Then)
- [ ] Define acceptance criteria
- [ ] List edge cases with priorities
- [ ] Provide minimal test fixtures
- [ ] Specify mock/stub guidance
- [ ] **Don't** duplicate schemas - link to Design Doc
- [ ] **Don't** duplicate rationale - link to ADR

### Step 4: Verify Cross-References
- [ ] All links work correctly
- [ ] No large blocks of duplicated content
- [ ] Each document serves its unique purpose

## Quick Reference: What Goes Where?

| Content Type | ADR | Design Doc | Handoff |
|--------------|-----|------------|---------|
| Decision rationale | ✅ Full | 📎 Link | 📎 Link |
| Options considered | ✅ Full | ❌ No | ❌ No |
| TypeScript interfaces | ❌ No | ✅ Full | 📎 Link |
| API schemas | ❌ No | ✅ Full | 📎 Link |
| Sequence diagrams | Sometimes | ✅ Full | ❌ No |
| Test scenarios | ❌ No | ❌ No | ✅ Full |
| Acceptance criteria | ❌ No | ❌ No | ✅ Full |
| Test fixtures | ❌ No | ❌ No | ✅ Minimal |
| Mock guidance | ❌ No | ❌ No | ✅ Full |
| Edge cases | Brief | ✅ Table | ✅ Prioritized |
| Performance notes | Brief | ✅ Detailed | ❌ No |

**Legend**:
- ✅ Full = Complete content here
- 📎 Link = Reference only, link to source
- ❌ No = Not relevant for this document

## Examples

See [Documentation Templates](../templates/documentation-templates.md) for complete examples of each document type with proper cross-referencing.

## Summary

**Old Approach**:
```
ADR: 300 lines (including schemas)
Design Doc: 700 lines (including schemas + rationale)
Handoff: 500 lines (including schemas + rationale)
Total: 1,500 lines (high duplication)
```

**New Approach**:
```
ADR: 200 lines (decisions only, links to Design Doc)
Design Doc: 600 lines (complete specs, source of truth)
Handoff: 300 lines (test guidance, links to Design Doc)
Total: 1,100 lines (minimal duplication, clear references)
```

**Result**: 27% reduction in total content + better maintainability + clearer purpose

