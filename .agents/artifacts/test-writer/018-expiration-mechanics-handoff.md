# Expiration Mechanics - Implementer Handoff

📋 **Handoff Number**: 018
🔗 **Test Plan**: [expiration-mechanics-test-plan.md](test-plans/expiration-mechanics-test-plan.md)
🔗 **Design Document**: [expiration-mechanics-design.md](../designer/designs/expiration-mechanics-design.md)
🔗 **ADR**: [ADR-018](../../docs/architecture/decisions/018-expiration-mechanics.md)

---

## 1. Test Statistics

| Metric | Value |
|--------|-------|
| **Total Tests** | 88 |
| **Unit Tests** | 31 |
| **Integration Tests** | 29 |
| **Component Tests** | 28 |
| **Red Phase Status** | ❌ All tests failing |

---

## 2. Files Created

### Test Files
| File | Tests | Purpose |
|------|-------|---------|
| `tests/unit/services/cleanup-service.spec.ts` | 19 | CleanupService operations |
| `tests/unit/services/scoring-service-weights.spec.ts` | 12 | 70/30 scoring weights |
| `tests/integration/api/bulk-dismiss-api.spec.ts` | 18 | Bulk dismiss endpoint |
| `tests/integration/database/query-filtering.spec.ts` | 11 | Expired filtering queries |
| `tests/unit/components/dashboard/selection-mode.spec.tsx` | 28 | Selection mode UI |

### Fixtures
| File | Purpose |
|------|---------|
| `tests/fixtures/cleanup-fixtures.ts` | Factory functions for expiration testing |

### Implementation Stubs
| File | Purpose |
|------|---------|
| `packages/backend/src/services/cleanup-service.ts` | CleanupService stub |

---

## 3. Implementation Order

### Phase 1: Backend Core (Critical)
1. **CleanupService** - `packages/backend/src/services/cleanup-service.ts`
   - Implement `cleanup()` method
   - Implement `start()` and `stop()` for scheduling
   - Run: `npm test -- cleanup-service.spec.ts`

2. **ScoringService Update** - `packages/backend/src/services/scoring-service.ts`
   - Change `RECENCY_WEIGHT` from 0.6 → 0.7
   - Change `IMPACT_WEIGHT` from 0.4 → 0.3
   - Run: `npm test -- scoring-service-weights.spec.ts`

3. **Query Filtering** - Update `getOpportunities()` in DiscoveryService
   - Add `expiresAt: { $gt: new Date() }` for pending queries
   - Run: `npm test -- query-filtering.spec.ts`

### Phase 2: API Endpoint (Critical)
4. **Bulk Dismiss API** - `packages/backend/src/routes/opportunities.ts`
   - Add `POST /api/opportunities/bulk-dismiss`
   - Run: `npm test -- bulk-dismiss-api.spec.ts`

### Phase 3: Frontend UI (Important)
5. **OpportunityCard Selection** - `packages/frontend/src/components/dashboard/OpportunityCard.tsx`
   - Add checkbox (hidden by default, visible on hover)
   - Add selection state props
   - Add long-press handler for mobile

6. **SelectionToolbar** - New component
   - Selected count display
   - "Select others" button
   - "Dismiss selected" button
   - "Cancel" button

7. **Selection State** - Dashboard state management
   - `isSelectionMode` state
   - `selectedIds` Set
   - Run: `npm test -- selection-mode.spec.tsx`

---

## 4. Critical Tests

These tests define the core functionality and must pass:

```bash
# CleanupService core
npm test -- -t "should mark pending opportunities as expired"
npm test -- -t "should hard delete opportunities with status=expired"
npm test -- -t "should hard delete dismissed opportunities after 5 minutes"
npm test -- -t "should delete associated responses when opportunity is deleted"

# Bulk dismiss
npm test -- -t "should dismiss multiple pending opportunities"
npm test -- -t "should skip opportunities from other accounts"

# Query filtering
npm test -- -t "should exclude pending opportunities with expiresAt in past"
```

---

## 5. Implementation Details

### CleanupService.cleanup()

```typescript
async cleanup(): Promise<CleanupStats> {
  const now = new Date();
  const stats: CleanupStats = { 
    expired: 0, 
    deletedExpired: 0, 
    deletedDismissed: 0, 
    deletedResponses: 0 
  };

  // 1. Mark pending → expired (expiresAt < now)
  const expireResult = await this.db.collection('opportunities').updateMany(
    { status: 'pending', expiresAt: { $lt: now } },
    { $set: { status: 'expired', updatedAt: now } }
  );
  stats.expired = expireResult.modifiedCount;

  // 2. Get IDs for cascade delete
  const toDelete = await this.db.collection('opportunities').find({
    $or: [
      { status: 'expired' },
      { 
        status: 'dismissed', 
        updatedAt: { $lt: new Date(now.getTime() - DISMISSED_RETENTION_MS) } 
      }
    ]
  }, { projection: { _id: 1 } }).toArray();

  const opportunityIds = toDelete.map(o => o._id);

  // 3. Cascade delete responses
  if (opportunityIds.length > 0) {
    const responseResult = await this.db.collection('responses').deleteMany({
      opportunityId: { $in: opportunityIds }
    });
    stats.deletedResponses = responseResult.deletedCount;
  }

  // 4. Delete expired (immediate)
  const deleteExpiredResult = await this.db.collection('opportunities').deleteMany({
    status: 'expired'
  });
  stats.deletedExpired = deleteExpiredResult.deletedCount;

  // 5. Delete dismissed (after 5 min)
  const deleteDismissedResult = await this.db.collection('opportunities').deleteMany({
    status: 'dismissed',
    updatedAt: { $lt: new Date(now.getTime() - DISMISSED_RETENTION_MS) }
  });
  stats.deletedDismissed = deleteDismissedResult.deletedCount;

  return stats;
}
```

### ScoringService Weight Update

```typescript
// Change from:
private readonly RECENCY_WEIGHT = 0.6;
private readonly IMPACT_WEIGHT = 0.4;

// To:
private readonly RECENCY_WEIGHT = 0.7;
private readonly IMPACT_WEIGHT = 0.3;
```

### Query Filter for Pending

```typescript
// In getOpportunities() when status === 'pending':
query.status = 'pending';
query.expiresAt = { $gt: new Date() }; // Exclude expired
```

### Bulk Dismiss API

```typescript
// POST /api/opportunities/bulk-dismiss
app.post('/api/opportunities/bulk-dismiss', async (req, res) => {
  const { opportunityIds } = req.body;
  
  const result = await db.collection('opportunities').updateMany(
    {
      _id: { $in: objectIds },
      accountId: account._id,
      status: 'pending'  // Only dismiss pending
    },
    { $set: { status: 'dismissed', updatedAt: new Date() } }
  );

  res.json({
    dismissed: result.modifiedCount,
    skipped: /* IDs not found or not pending */
  });
});
```

---

## 6. Constants

```typescript
// packages/backend/src/services/cleanup-service.ts
export const DISMISSED_RETENTION_MS = 5 * 60 * 1000;  // 5 minutes
export const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;     // 5 minutes

// Opportunity TTL (already exists, verify value)
const OPPORTUNITY_TTL_HOURS = 4;  // Reduced from 48h in ADR-018
```

---

## 7. Running Tests

### All Expiration Tests
```bash
npm test -- cleanup-service.spec.ts scoring-service-weights.spec.ts bulk-dismiss-api.spec.ts query-filtering.spec.ts selection-mode.spec.tsx
```

### By Category
```bash
# Unit tests only
npm test -- tests/unit/services/cleanup-service.spec.ts

# Integration tests only
npm test -- tests/integration/api/bulk-dismiss-api.spec.ts
npm test -- tests/integration/database/query-filtering.spec.ts

# Component tests only
npm test -- tests/unit/components/dashboard/selection-mode.spec.tsx
```

### With Coverage
```bash
npm test -- --coverage cleanup-service
```

---

## 8. Expected Green Phase Output

```
✓ CleanupService
  ✓ cleanup() - Mark Expired (4 tests)
  ✓ cleanup() - Hard Delete Expired (3 tests)
  ✓ cleanup() - Hard Delete Dismissed (4 tests)
  ✓ cleanup() - Cascade Delete Responses (4 tests)
  ✓ cleanup() - Preserve Responded (2 tests)
  ✓ cleanup() - Complete Cycle (2 tests)

✓ ScoringService - Updated 70/30 Weights
  ✓ scoreOpportunity() with updated weights (4 tests)
  ✓ Weight Verification (2 tests)
  ✓ Expected SCORING_WEIGHTS constants (3 tests)
  ✓ Scoring scenarios with 70/30 weights (3 tests)

✓ Bulk Dismiss API
  ✓ Success Scenarios (3 tests)
  ✓ Skip Non-Pending Opportunities (4 tests)
  ✓ Cross-Account Protection (2 tests)
  ✓ Error Handling (6 tests)
  ✓ Batch Size (1 test)

✓ Query Filtering - Exclude Expired
  ✓ Pending Status Query (4 tests)
  ✓ Mixed Status Scenarios (3 tests)
  ✓ Edge Cases (4 tests)

✓ Selection Mode UI
  ✓ Desktop - Checkbox Behavior (7 tests)
  ✓ Mobile - Long-Press Behavior (5 tests)
  ✓ Mobile - Tap in Selection Mode (4 tests)
  ✓ SelectionToolbar Component (9 tests)

Test Suites: 5 passed, 5 total
Tests:       88 passed, 88 total
```

---

## 9. Success Criteria

Implementation is complete when:

- [ ] All 88 tests pass
- [ ] `npm run lint` has no errors
- [ ] `npm run build` compiles successfully
- [ ] CleanupService scheduled job starts on app launch
- [ ] Bulk dismiss API returns correct response format
- [ ] Selection mode works on both desktop and mobile
- [ ] Existing tests in `scoring-service.spec.ts` updated for 70/30 weights

---

## 10. References

- **Test Plan**: [expiration-mechanics-test-plan.md](test-plans/expiration-mechanics-test-plan.md)
- **Design Document**: [expiration-mechanics-design.md](../designer/designs/expiration-mechanics-design.md)
- **Designer Handoff**: [015-expiration-mechanics-handoff.md](../designer/handoffs/015-expiration-mechanics-handoff.md)
- **ADR**: [ADR-018](../../docs/architecture/decisions/018-expiration-mechanics.md)
