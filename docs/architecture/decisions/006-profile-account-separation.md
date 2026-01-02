# ADR-006: Profile and Account Separation

## Status

**Accepted** - December 29, 2025

## Context

ngaj needs to store configuration for social media accounts including platform credentials, discovery preferences, voice/tone, and scheduling. With v0.1 supporting single Bluesky account and v0.2 expanding to multi-account and multi-platform, we need a schema that:

- Supports single account in v0.1 without overengineering
- Enables multi-account/multi-platform expansion in v0.2 without major refactoring
- Allows users to maintain consistent voice/preferences across multiple platforms
- Separates platform-specific details from cross-platform persona configuration

**Key insight**: Users may want the same "professional persona" posting to both LinkedIn and Bluesky, or different personas on different platforms. Conflating account and persona makes future flexibility harder.

---

**📋 Complete Technical Specification**: See [Account Configuration Design Document](../../../.agents/artifacts/designer/designs/account-configuration-design.md) for detailed data models, API contracts, and implementation guidance.

## Decision

**Separate `profiles` and `accounts` into two MongoDB collections with 1-to-many relationship (1 Profile → Many Accounts).**

### High-Level Structure

**Collection: `profiles`**
- Stores cross-platform persona configuration
- Contains: voice (tone, style, examples), discovery preferences (interests, keywords, communities)
- Represents: "Who I am and how I engage"

**Collection: `accounts`**  
- Stores platform-specific connection details
- Contains: platform, handle, **multiple discovery schedules** (one per discovery type), sync status
- Represents: "Where I post and when"

**Relationship**: One Profile → Many Accounts
- Profile owns: voice, discovery preferences, knowledge base (future)
- Account owns: platform, handle, **multiple typed schedules** (replies, search, etc.), sync status
- **Note**: Each account has an **array of schedules**, not a single schedule (see ADR-008)
- Credentials stored in `.env` per ADR-002 (not in MongoDB)

**Key Constraints**:
- Profile name must be unique
- (platform, handle) combination must be unique across accounts
- Cannot delete profile with active accounts

**Indexes**: Unique constraint on `accounts(platform, handle)`, index on `profiles.name`, performance index on account discovery queries.

**Discovery Scheduling**: Per ADR-008, each account has **multiple independent schedules** (array of `DiscoveryTypeSchedule` objects), enabling different discovery types (replies, search) to run at different frequencies (e.g., replies every 15 minutes, search every 2 hours).

> 📋 **Complete schemas, API endpoints, and validation rules**: See [Design Document - Data Models Section](../../../.agents/artifacts/designer/designs/account-configuration-design.md#data-models)

## Options Considered

### Option 1: Single `accounts` Collection (Embedded Profile Data)
**Description**: Store all configuration in one `accounts` document with nested profile fields (voice, discovery prefs embedded directly)

**Pros**:
- Simpler for v0.1 (one collection, one document)
- No joins needed for queries
- Straightforward implementation

**Cons**:
- **Duplicates profile data** when adding second platform in v0.2
- **Requires data migration** for v0.2 multi-account
- Couples persona to platform (violates separation of concerns)
- No way to share knowledge base across platforms

### Option 2: Profile and Account Separation ✅ **CHOSEN**
**Description**: Two collections with foreign key relationship (`account.profileId` → `profile._id`)

**Pros**:
- **Zero duplication**: Voice/preferences shared across platforms
- **Clean domain model**: "Who I am" vs "Where I post"
- **Trivial v0.2 expansion**: Just add more account documents
- Knowledge base naturally belongs to profile
- Future-proof for multi-persona scenarios

**Cons**:
- Slightly more complex (2 collections instead of 1)
- Requires MongoDB `$lookup` for joins
- More upfront design effort

### Option 3: Many-to-Many (Profiles ↔ Accounts)
**Description**: Join table allowing multiple profiles per account and vice versa

**Pros**:
- Maximum flexibility

**Cons**:
- **Massive overkill** for known requirements
- No clear use case identified
- Significant complexity cost (YAGNI violation)

## Rationale

**Why Option 2 (Profile/Account Separation):**

1. **Aligns with v0.2 Vision**: ADR-005 roadmap includes multi-platform. Separating profile from account makes this trivial (add more account documents with same profileId)

2. **Natural Domain Model**: "Professional persona posting to LinkedIn and Bluesky" is more intuitive than "two accounts that happen to share config"

3. **Minimal v0.1 Cost**: Only adds one extra document (1 profile + 1 account instead of 1 account). Complexity is negligible.

4. **Knowledge Base Association**: Knowledge base naturally belongs to profile (persona), not account (platform). If we stored everything in accounts, we'd duplicate or complicate KB references.

5. **Future Flexibility**: Could later add profile-switching, multi-persona management, etc. without schema changes

6. **Precedent**: User/Account separation is common pattern in multi-platform apps

**Why Not Option 1:**
- Would require migration in v0.2 (break changes, data scripts, user impact)
- Duplicating profile data across accounts feels wrong architecturally

**Why Not Option 3:**
- No requirement for many-to-many; YAGNI applies

## Consequences

### Positive
- **Smooth v0.2 Transition**: Adding LinkedIn account is just `db.accounts.insertOne({ profileId, platform: 'linkedin', ... })`
- **Clean Domain Model**: Profile = persona, Account = platform connection
- **Shared Configuration**: Voice, interests, KB shared across platforms automatically
- **Query Clarity**: "Get all accounts for this profile" vs "Get profile for this account" are both simple
- **Extensibility**: Easy to add profile-level features (availability, analytics) later

### Negative
- **Slight Complexity**: Must query 2 collections instead of 1
- **Join Cost**: Loading account with profile requires MongoDB `$lookup` or 2 queries
- **v0.1 Overhead**: Creates 2 documents when 1 would technically suffice

### Mitigation
- Use MongoDB `$lookup` aggregation for efficient joins
- Cache profile data in application layer if needed
- TypeScript types enforce relationship integrity
- Document relationship clearly in code comments

## Implementation Notes

### v0.1 Setup (Single Profile, Single Account)
- Backend creates default profile on first run
- Single Bluesky account linked to default profile
- UI exposes "Account Settings" (profile management deferred to v0.2)
- All operations use the single profile/account pair

### v0.2 Migration Path (No Breaking Changes)
- Add UI for profile management
- Allow creating additional accounts (same or different profiles)
- **No schema migration needed** - existing documents work as-is

### Data Access Pattern
- Use MongoDB `$lookup` aggregation for profile+account joins
- Cache profile data in memory for cron jobs
- TypeScript types enforce relationship integrity

### Credential Handling
- Sensitive credentials stored in `.env` per ADR-002
- Accounts collection stores handles (non-sensitive) only
- See [Design Doc - Integration Points](../../../.agents/artifacts/designer/designs/account-configuration-design.md#integration-points) for credential format

> 📋 **Complete implementation details**: See [Design Document - Service Interfaces](../../../.agents/artifacts/designer/designs/account-configuration-design.md#service-interfaces-internal) and [Sequence Diagrams](../../../.agents/artifacts/designer/designs/account-configuration-design.md#sequence-diagrams)

## Related Decisions

- [ADR-001: MongoDB Storage](./001-mongodb-storage.md) - Why MongoDB for document storage
- [ADR-002: Environment Variables for Credentials](./002-env-credentials.md) - Why credentials in `.env` not database
- [ADR-005: MVP Scope](./005-mvp-scope.md) - v0.1 (single account) → v0.2 (multi-account/multi-platform) roadmap

## Technical Details

- **Complete Data Models**: [Design Document - Data Models](../../../.agents/artifacts/designer/designs/account-configuration-design.md#data-models)
- **API Contracts**: [Design Document - API Contracts](../../../.agents/artifacts/designer/designs/account-configuration-design.md#api-contracts)
- **Implementation Guidance**: [Design Document - Service Interfaces](../../../.agents/artifacts/designer/designs/account-configuration-design.md#service-interfaces-internal)
- **Test Guidance**: [Test-Writer Handoff](../../../.agents/artifacts/designer/handoffs/account-configuration-handoff.md)

## External References

- [MongoDB $lookup Documentation](https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/) - Join operation syntax

## Decision History

**Dec 29, 2025** - Initial decision
- Confirmed 1-to-many relationship (not many-to-many)
- Scheduling stays at account level (platform-specific cadence)
- Voice examples in MongoDB (not ChromaDB) for v0.1 simplicity
- Deferred availability/quiet hours to future version

