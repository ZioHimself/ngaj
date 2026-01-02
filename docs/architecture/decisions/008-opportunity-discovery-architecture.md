# ADR-008: Opportunity Discovery Architecture

## Status

**Accepted** - January 2, 2026

## Context

ngaj's core value proposition is helping users find and engage with high-value conversations they might otherwise miss. The discovery system needs to continuously monitor Bluesky for relevant opportunities and present them to users in priority order.

**Key Requirements:**
- **Time-sensitive**: Replies to user's posts need near-real-time discovery (< 30 minutes)
- **Keyword-driven**: Search for topics matching user interests, but less urgent (2-4 hour windows acceptable)
- **Prioritized**: Most urgent/relevant opportunities shown first (recency > impact)
- **Efficient**: Don't waste API rate limits; different sources need different schedules
- **Extensible**: v0.2 will add LinkedIn and Reddit; design should accommodate multi-platform

**Constraints:**
- ADR-005 scopes v0.1 to Bluesky-only, single account
- Local-first architecture (no cloud queue services)
- Bluesky rate limits unknown; assume conservative approach needed
- User reviews all responses (no automated posting yet)

## Options Considered

### Option A: Single Schedule, All Sources Together

**Approach**: One cron expression per account; fetch replies + searches on same schedule.

**Pros**:
- Simple data model (single `cronExpression` field)
- Single cron job to manage
- Easy to implement for v0.1

**Cons**:
- ❌ Inefficient: Search every 15 minutes wastes rate limits
- ❌ Can't prioritize time-sensitive replies over searches
- ❌ If search API fails, replies also blocked
- ❌ Poor UX: User can't configure "fast replies, slow searches"

### Option B: Multiple Schedules per Discovery Type (CHOSEN)

**Approach**: Array of typed schedules; each discovery type (replies, search) has independent cron expression.

**Data Model**:
```typescript
interface AccountDiscoveryConfig {
  schedules: DiscoveryTypeSchedule[];  // Array of typed schedules
  lastAt?: Date;  // Overall last discovery timestamp
  error?: string;  // Last error across all types
}

interface DiscoveryTypeSchedule {
  type: 'replies' | 'search';  // Discovery source type
  enabled: boolean;
  cronExpression: string;
  lastRunAt?: Date;  // Per-type tracking
}
```

**Example**:
```javascript
{
  schedules: [
    { type: 'replies', enabled: true, cronExpression: '*/15 * * * *' },  // Every 15 min
    { type: 'search', enabled: true, cronExpression: '0 */2 * * *' }     // Every 2 hours
  ]
}
```

**Pros**:
- ✅ API efficient: Replies fast, searches slow
- ✅ Failure isolation: Search errors don't block replies
- ✅ User control: Enable/disable per type, tune schedules
- ✅ Extensible: Easy to add 'mentions', 'hashtags' in v0.2+

**Cons**:
- More complex data model
- Need multiple cron jobs or smarter scheduler
- Slightly more config for users (mitigated by good defaults)

### Option C: Priority-Based Boosting

**Approach**: Single schedule, but assign priority scores to different source types.

**Pros**:
- Simpler than Option B
- Still allows source differentiation via scoring

**Cons**:
- ❌ Doesn't solve rate limit efficiency
- ❌ No failure isolation
- ❌ Priority boost is a workaround, not a real solution

## Decision

We will implement **Option B: Multiple Schedules per Discovery Type**.

Each account can configure independent schedules for different discovery sources (replies, search). The system runs separate cron jobs per schedule type, allowing time-sensitive replies to be checked frequently while less urgent searches run less often.

**Default Configuration** (v0.1):
- **Replies**: Every 15 minutes (`*/15 * * * *`)
- **Search**: Every 2 hours (`0 */2 * * *`)

## Rationale

1. **Time-Sensitivity is Critical**: User's own posts getting replies need < 30 min discovery. Keyword searches can wait 2-4 hours. Single schedule can't satisfy both.

2. **API Efficiency Matters**: Even for v0.1 single account, wasting Bluesky rate limits on frequent searches is poor architecture. Multi-platform v0.2 will make this worse.

3. **Failure Isolation**: If keyword search API changes or has issues, reply discovery should continue working. Separate schedules enable this.

4. **User Control**: Power users will want to tune schedules ("check replies every 10 minutes during work hours"). Array structure enables this without data model changes.

5. **Future-Proof**: Adding 'mentions', 'hashtags', or 'follows' in v0.2 requires zero data model changes—just add new schedule types.

6. **Platform-Specific Needs**: LinkedIn might need hourly checks, Reddit might need 6-hour checks due to rate limits. Multi-schedule design accommodates this naturally.

## Consequences

### Positive

- **Optimal User Experience**: Fast replies, efficient searches
- **Rate Limit Friendly**: Conservative API usage from day 1
- **Robust**: Partial failures don't cascade
- **Flexible**: Users can customize per their needs
- **Extensible**: v0.2+ platforms add easily

### Negative

- **Implementation Complexity**: Need cron library that supports multiple jobs (e.g., `node-cron`)
- **More Configuration**: Users see more options (mitigated by smart defaults)
- **Testing Complexity**: Need to test independent schedule execution

### Mitigation

- Use `node-cron` or similar library with per-job scheduling
- Provide sensible defaults; advanced config is optional
- Unit test schedule parsing separately from discovery logic
- Integration tests can use fixed times instead of real cron

## Discovery Flow Architecture

### High-Level Components

```
┌──────────────────────────────────────────────────────────┐
│ Cron Scheduler (node-cron)                              │
│  - Manages multiple schedules per account                │
│  - Triggers DiscoveryService per schedule type           │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│ DiscoveryService                                         │
│  - Orchestrates discovery for one account + type         │
│  - Calls platform adapter                                │
│  - Scores and filters opportunities                      │
│  - Persists to MongoDB                                   │
└──────────────────┬───────────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌─────────────┐         ┌──────────────┐
│ Bluesky     │         │ Scoring      │
│ Adapter     │         │ Service      │
│             │         │              │
│ - Fetch     │         │ - Recency    │
│   replies   │         │ - Impact     │
│ - Search    │         │ - Threshold  │
│   keywords  │         │              │
└─────────────┘         └──────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ MongoDB Collections                                     │
│  - opportunities: Discovered posts with scores          │
│  - authors: Bluesky user profiles (upserted)            │
│  - accounts: Discovery status tracking                  │
└─────────────────────────────────────────────────────────┘
```

### Scoring Formula

**Recency** (60% weight): Exponential decay based on post age
- Posts < 2 minutes: ~100 points
- Posts @ 30 minutes: ~37 points  
- Posts @ 2 hours: ~1 point
- Formula: `e^(-ageInMinutes / 30) * 100`

**Impact** (40% weight): Logarithmic scale of reach and engagement
- Author follower count: `log10(followers)`
- Post likes: `log10(likes + 1)`
- Post reposts: `log10(reposts + 1)`
- Normalized to 0-100

**Total Score**: `(0.6 * recency) + (0.4 * impact)`

**Threshold**: Configurable via `DISCOVERY_MIN_SCORE` env var (default: 30)

## Data Model Changes

### Modified: Account (existing)

```typescript
interface AccountDiscoveryConfig {
  schedules: DiscoveryTypeSchedule[];  // NEW: Array instead of single schedule
  lastAt?: Date;
  error?: string;
}

interface DiscoveryTypeSchedule {  // NEW TYPE
  type: 'replies' | 'search';
  enabled: boolean;
  cronExpression: string;
  lastRunAt?: Date;
}
```

### New: Opportunity

```typescript
interface Opportunity {
  _id: ObjectId;
  accountId: ObjectId;  // Which account discovered this
  platform: 'bluesky';
  postId: string;  // Platform-specific post ID
  postUrl: string;
  content: {
    text: string;
    createdAt: Date;
  };
  authorId: ObjectId;  // Reference to authors collection
  engagement: {
    likes: number;
    reposts: number;
    replies: number;
  };
  scoring: {
    recency: number;  // 0-100
    impact: number;   // 0-100
    total: number;    // 0-100
  };
  discoveryType: 'replies' | 'search';  // How it was found
  status: 'pending' | 'responded' | 'dismissed' | 'expired';
  discoveredAt: Date;
  expiresAt: Date;  // Auto-calculated: discoveredAt + 48 hours
  updatedAt: Date;
}
```

### New: Author

```typescript
interface Author {
  _id: ObjectId;
  platform: 'bluesky';
  platformUserId: string;  // Bluesky DID
  handle: string;  // @user.bsky.social
  displayName: string;
  bio?: string;
  followerCount: number;
  lastUpdatedAt: Date;  // For cache staleness
}
```

**Unique Index**: `(platform, platformUserId)`

## API Design

### New Endpoints

- `GET /api/opportunities` - List opportunities (filtered, paginated)
- `GET /api/opportunities/:id` - Get single opportunity
- `PATCH /api/opportunities/:id/status` - Update status (dismiss, responded)
- `POST /api/discovery/run` - Trigger discovery manually (for testing)

*Complete API specification in Design Document.*

## Related Decisions

- **Builds on**: [ADR-006: Profile and Account Separation](./006-profile-account-separation.md) - Uses account-level discovery config
- **Builds on**: [ADR-005: MVP Scope](./005-mvp-scope.md) - Bluesky-only for v0.1
- **Relates to**: [ADR-002: Environment Variables for Credentials](./002-env-credentials.md) - Bluesky credentials from `.env`

## Technical Details

See [Opportunity Discovery Design Document](../../.agents/artifacts/designer/designs/opportunity-discovery-design.md) for:
- Complete data models and TypeScript interfaces
- Platform adapter interface specification
- Scoring algorithm implementation details
- Cron scheduler architecture
- Error handling strategies
- Database indexes and query patterns

## References

- [Bluesky API Documentation](https://docs.bsky.app/docs/api/)
- [node-cron](https://github.com/node-cron/node-cron) - Cron library for Node.js
- [ADR-005: MVP Scope](./005-mvp-scope.md)
- [ADR-006: Profile and Account Separation](./006-profile-account-separation.md)

