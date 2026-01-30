# ADR-018: Expiration Mechanics

## Status

**Accepted** - January 27, 2026

## Context

After a few hours of using ngaj, the MongoDB `opportunities` collection accumulates thousands of records. Discovery runs frequently (every 15 minutes for replies, every 2 hours for search), but nothing removes stale data.

**Current problems:**
- **MongoDB bloat**: ~2000 records accumulate in hours, growing unbounded
- **Stale data dominates**: Older opportunities with high impact scores outrank fresh, timely ones
- **Manual cleanup tedious**: Dismissing opportunities one-by-one is impractical
- **No automatic expiration**: `expiresAt` field exists but nothing enforces it

**ADR-008** defined a 48-hour TTL and `expired` status, but:
1. `expireOpportunities()` only changes status (no deletion)
2. No scheduled job calls it
3. Dismissed items persist forever

## Decision

We will implement **application-level expiration mechanics** with aggressive cleanup:

### 1. Retention Policy

| Status | Retention | Action |
|--------|-----------|--------|
| `pending` | 4 hours from discovery | Mark as `expired` |
| `expired` | Immediate | Hard delete |
| `dismissed` | 5 minutes | Hard delete |
| `responded` | Forever | Keep |

### 2. Cleanup Job
- Scheduled task runs every **5 minutes**
- Hard deletes expired and dismissed opportunities
- Cascades: deletes associated responses

### 3. Scoring Rebalance
- **Recency weight**: 70% (was 60%)
- **Impact weight**: 30% (was 40%)
- Prioritizes fresh opportunities over high-follower stale posts

### 4. Query Filtering
- `getOpportunities(status: 'pending')` excludes `expired` by default

### 5. Bulk Dismiss UX
- Mobile: Long-press to enter selection mode, tap to toggle
- Desktop: Checkbox appears on hover
- Actions:
  - **"Dismiss selected (N)"**: Bulk dismiss all selected opportunities
  - **"Select all"**: Select all visible opportunities in current filter view
  - **"Select others"**: Select all visible opportunities NOT currently selected (deselects current). Enables "dismiss everything except these" workflow.

## Rationale

### Why 4-Hour TTL (vs. 48 Hours)?
- Social media engagement is time-sensitive
- A 4-hour-old opportunity is a missed opportunity
- Reduces MongoDB storage by ~12x

### Why Immediate Delete for Expired?
- Already past TTL—no value in keeping
- Simplifies data model (no "dead" records)
- Users can't interact with expired items anyway

### Why 5 Minutes for Dismissed?
- Brief grace period for accidental dismisses
- Long enough for undo consideration, short enough to not accumulate
- User explicitly indicated disinterest

### Why Application-Level (vs. MongoDB TTL Index)?
- More control over cascade deletes (responses)
- Different retention rules per status
- Logging for debugging
- TTL index would need single `deleteAt` field (complex migration)

### Why 70/30 Scoring Weights?
- Fresh moderate-impact posts should outrank stale high-impact posts
- Recency decay already handles time, but weight shift amplifies it
- Maintains some value for reach/engagement signals

## Consequences

### Positive
- ✅ **Bounded storage**: Collection size stabilizes based on discovery rate × 4h window
- ✅ **Fresh content prioritized**: Higher recency weight surfaces timely opportunities
- ✅ **Efficient workflow**: Bulk dismiss reduces manual effort
- ✅ **Clean data**: No zombie records cluttering queries

### Negative
- ❌ **Lost history**: Dismissed/expired opportunities not recoverable
- ❌ **No analytics**: Can't analyze dismissal patterns (future v0.2 feature)
- ❌ **Faster expiration**: Users with infrequent sessions may miss opportunities

### Mitigation
- **Lost history**: `responded` items preserved for engagement history
- **No analytics**: Consider archive collection in future version
- **Faster expiration**: 4 hours is still reasonable for active users; can tune via env var

## Related Decisions

- **Modifies**: [ADR-008: Opportunity Discovery Architecture](./008-opportunity-discovery-architecture.md) - Changes TTL from 48h to 4h, adds cleanup
- **Modifies**: [ADR-013: Opportunity Dashboard UI](./013-opportunity-dashboard-ui.md) - Adds bulk selection UX
- **Uses**: [ADR-017: Structured Logging](./017-structured-logging.md) - Debug-level logging for cleanup

## Technical Details

See [Design Document](../../.agents/artifacts/designer/designs/expiration-mechanics-design.md) for:
- Cleanup service implementation
- Bulk dismiss API contracts
- Selection mode UI specifications
- Updated scoring formula

## References

- [GitHub Issue: MongoDB bloat after hours of use](#) <!-- Link when created -->
- [ADR-008: Opportunity Discovery Architecture](./008-opportunity-discovery-architecture.md)
