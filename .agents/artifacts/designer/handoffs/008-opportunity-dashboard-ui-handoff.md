# Opportunity Dashboard UI - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-013](../../../../docs/architecture/decisions/013-opportunity-dashboard-ui.md)  
🔗 **Technical Specs**: [Design Document](../designs/opportunity-dashboard-ui-design.md)

---

## Overview

Test the Opportunity Dashboard - the main UI for viewing opportunities, generating responses, editing drafts, and posting to Bluesky.

**Test Types**: Unit (components), Integration (API calls), E2E (user flows)

---

## 1. Test Scope

### In Scope
- ✅ Opportunity list rendering and pagination
- ✅ Status filtering (pending, draft ready, posted, dismissed)
- ✅ Expand/collapse behavior
- ✅ Generate response flow
- ✅ Edit draft text
- ✅ Post response flow
- ✅ Dismiss opportunity flow
- ✅ Error handling and display
- ✅ Empty states
- ✅ Loading states

### Out of Scope (v0.1)
- ❌ Keyboard shortcuts (j/k navigation)
- ❌ Mobile responsive behavior
- ❌ Offline support
- ❌ Real-time updates (WebSocket)
- ❌ Performance benchmarks

---

## 2. Unit Tests: Components

### 2.1 OpportunityCard

#### Scenario: Renders collapsed pending opportunity
**Given**: Opportunity with status "pending" and no response  
**When**: Card is rendered in collapsed state  
**Then**: Shows author, score, time, preview text, and "Generate Response" button

**Acceptance Criteria**:
- [ ] Author handle displayed (e.g., "@user.bsky.social")
- [ ] Follower count displayed (e.g., "1.2k followers")
- [ ] Score displayed (numeric value)
- [ ] Relative time displayed (e.g., "2 hours ago")
- [ ] Post text truncated to ~100 chars with ellipsis
- [ ] "Generate Response" button visible and enabled
- [ ] "Dismiss" button visible

#### Scenario: Renders expanded opportunity with draft
**Given**: Opportunity with draft response  
**When**: Card is expanded  
**Then**: Shows full content and response editor

**Acceptance Criteria**:
- [ ] Full post text visible (up to 300 chars)
- [ ] Response textarea visible with draft text
- [ ] Character count displayed (e.g., "145/300")
- [ ] "Regenerate", "Dismiss", "Post Response" buttons visible

#### Scenario: Renders posted opportunity
**Given**: Opportunity with status "responded"  
**When**: Card is rendered  
**Then**: Shows dimmed state with posted indicator

**Acceptance Criteria**:
- [ ] Card has dimmed/muted visual style
- [ ] Checkmark or "Posted" badge visible
- [ ] Link to platform post visible and clickable
- [ ] No edit actions available

### 2.2 ResponseEditor

#### Scenario: Displays generating state
**Given**: Response is being generated  
**When**: Editor is rendered  
**Then**: Shows loading indicator

**Acceptance Criteria**:
- [ ] Spinner or loading animation visible
- [ ] "Generating response..." text displayed
- [ ] Action buttons disabled

#### Scenario: Enables text editing
**Given**: Draft response exists  
**When**: User types in textarea  
**Then**: Text updates and character count changes

**Acceptance Criteria**:
- [ ] Textarea is editable
- [ ] Character count updates on each keystroke
- [ ] Count format is "{length}/300"

#### Scenario: Handles text at limit
**Given**: Draft text is exactly 300 characters  
**When**: User views character count  
**Then**: Shows "300/300"

**Acceptance Criteria**:
- [ ] Count displays correctly at limit
- [ ] User can still submit (backend validates)

### 2.3 FilterBar

#### Scenario: Changes filter selection
**Given**: Filter is set to "pending"  
**When**: User selects "Draft Ready"  
**Then**: onStatusChange called with correct value

**Acceptance Criteria**:
- [ ] All filter options available: All, Pending, Draft Ready, Posted, Dismissed
- [ ] Current selection visually indicated
- [ ] Callback fired with correct status value

### 2.4 Pagination

#### Scenario: Navigates pages
**Given**: Multiple pages of results  
**When**: User clicks "Next"  
**Then**: onPageChange called with incremented page

**Acceptance Criteria**:
- [ ] Previous disabled on page 1
- [ ] Next disabled on last page
- [ ] Page info displays "Page X of Y"
- [ ] Buttons disabled during loading

---

## 3. Integration Tests: API

### 3.1 Load Opportunities

#### Scenario: Fetches opportunities on mount
**Given**: Dashboard page loads  
**When**: Component mounts  
**Then**: API called with correct parameters

**Acceptance Criteria**:
- [ ] GET `/api/opportunities?status=pending&limit=20&offset=0&sort=-score` called
- [ ] Opportunities rendered after response
- [ ] Response fetch triggered with opportunity IDs

**Mock Data**:
```typescript
const mockOpportunities = {
  opportunities: [
    {
      _id: "opp-1",
      accountId: "acc-1",
      platform: "bluesky",
      postId: "at://did:plc:abc/app.bsky.feed.post/123",
      postUrl: "https://bsky.app/profile/user.bsky.social/post/123",
      content: { text: "Test post content", createdAt: new Date() },
      authorId: "author-1",
      engagement: { likes: 5, reposts: 2, replies: 1 },
      scoring: { recency: 80, impact: 60, total: 72 },
      discoveryType: "replies",
      status: "pending",
      discoveredAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      updatedAt: new Date(),
      author: {
        _id: "author-1",
        platform: "bluesky",
        platformUserId: "did:plc:abc",
        handle: "@user.bsky.social",
        displayName: "Test User",
        followerCount: 1200,
        lastUpdatedAt: new Date(),
      },
    },
  ],
  total: 1,
  limit: 20,
  offset: 0,
  hasMore: false,
};
```

### 3.2 Batch Load Responses

#### Scenario: Fetches responses for opportunities
**Given**: Opportunities loaded with IDs ["opp-1", "opp-2"]  
**When**: Opportunities fetch completes  
**Then**: Responses fetched in batch

**Acceptance Criteria**:
- [ ] GET `/api/responses?opportunityIds=opp-1,opp-2` called
- [ ] Responses mapped to opportunities correctly
- [ ] Opportunities without responses handled gracefully

### 3.3 Generate Response

#### Scenario: Generates response successfully
**Given**: Opportunity without response  
**When**: User clicks "Generate Response"  
**Then**: Response created and displayed

**Acceptance Criteria**:
- [ ] POST `/api/responses/generate` called with `{ opportunityId, mode: "quick" }`
- [ ] Loading state shown during request
- [ ] Response added to UI on success
- [ ] Card expands to show draft

#### Scenario: Handles generate failure
**Given**: AI service unavailable  
**When**: Generate request fails with 503  
**Then**: Error displayed with retry option

**Acceptance Criteria**:
- [ ] Error message displayed (not raw error)
- [ ] Retry action available
- [ ] Card remains expanded

### 3.4 Post Response

#### Scenario: Posts response successfully
**Given**: Draft response exists  
**When**: User clicks "Post Response"  
**Then**: Response posted to platform

**Acceptance Criteria**:
- [ ] If text edited: PATCH `/api/responses/:id` called first
- [ ] POST `/api/responses/:id/post` called
- [ ] Response status updates to "posted"
- [ ] Opportunity status updates to "responded"
- [ ] Platform post URL displayed

#### Scenario: Handles post failure
**Given**: Bluesky API unavailable  
**When**: Post request fails with 503  
**Then**: Error displayed, draft preserved

**Acceptance Criteria**:
- [ ] Error message: "Bluesky unavailable. Try again later."
- [ ] Draft text preserved
- [ ] Retry action available

### 3.5 Dismiss Opportunity

#### Scenario: Dismisses opportunity
**Given**: Pending opportunity displayed  
**When**: User clicks "Dismiss"  
**Then**: Opportunity removed from list

**Acceptance Criteria**:
- [ ] PATCH `/api/opportunities/:id` called with `{ status: "dismissed" }`
- [ ] Opportunity removed from list (pending filter)
- [ ] Opportunity stays in list with dismissed filter

---

## 4. E2E Tests: User Flows

### 4.1 Complete Response Flow

**Steps**:
1. Load dashboard
2. Click "Generate Response" on first opportunity
3. Wait for response generation
4. Edit response text
5. Click "Post Response"
6. Verify success

**Acceptance Criteria**:
- [ ] All API calls made in correct order
- [ ] UI updates reflect each state change
- [ ] Posted response shows platform link

### 4.2 Filter and Navigate

**Steps**:
1. Load dashboard (pending filter)
2. Change filter to "Draft Ready"
3. Verify list updates
4. Navigate to page 2
5. Verify pagination works

**Acceptance Criteria**:
- [ ] Filter change triggers new API call
- [ ] Page change triggers new API call
- [ ] Both filter and offset passed correctly

### 4.3 Dismiss Multiple

**Steps**:
1. Load dashboard with 3+ opportunities
2. Dismiss first opportunity
3. Verify removed from list
4. Dismiss second opportunity
5. Verify list updates correctly

**Acceptance Criteria**:
- [ ] Each dismiss removes one opportunity
- [ ] Remaining opportunities stay in correct order
- [ ] No duplicate API calls

---

## 5. Edge Cases & Error Paths

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| Empty opportunities list | Show empty state with refresh | High |
| Network error on load | Show error banner with retry | High |
| Opportunity deleted during view | Remove from list, show brief notice | Medium |
| Generate while already generating | Button disabled, prevent duplicate | High |
| Post already posted response | Show error (shouldn't happen) | Low |
| Very long post text (>300 chars) | Truncate with "Show more" | Medium |
| Refresh while action in progress | Queue refresh until action completes | Medium |
| Navigate away with unsaved edits | Allow (v0.1), warn in v0.2 | Low |

---

## 6. Data Fixtures

### Opportunity Fixture
See [Design Doc Section 3.1](../designs/opportunity-dashboard-ui-design.md#31-initial-load-sequence) for `OpportunityWithAuthor` shape.

```typescript
const fixtures = {
  pendingOpportunity: {
    _id: "opp-pending",
    status: "pending",
    // ... full shape in types/opportunity.ts
  },
  draftOpportunity: {
    _id: "opp-draft",
    status: "pending",
    // Associated response has status: "draft"
  },
  postedOpportunity: {
    _id: "opp-posted", 
    status: "responded",
  },
};
```

### Response Fixture
```typescript
const responseFixtures = {
  draft: {
    _id: "resp-1",
    opportunityId: "opp-draft",
    status: "draft",
    text: "This is a draft response...",
    version: 1,
    // ... full shape in types/response.ts
  },
  posted: {
    _id: "resp-2",
    opportunityId: "opp-posted",
    status: "posted",
    text: "Posted response text",
    platformPostId: "at://did:plc:abc/app.bsky.feed.post/reply123",
    platformPostUrl: "https://bsky.app/profile/user/post/reply123",
  },
};
```

---

## 7. Integration Dependencies

### External APIs (Mock)
- **Backend API**: Mock fetch calls, return fixture data
- **No direct Bluesky calls** (all via backend)

### Database
- Not directly accessed from frontend tests
- Backend integration tests should cover DB operations

---

## 8. Test Priorities

### Critical Path (Must Pass)
1. Opportunities load and display correctly
2. Generate response creates draft
3. Post response succeeds
4. Dismiss removes opportunity
5. Error states display appropriately

### Important (Should Pass)
6. Pagination navigates correctly
7. Filters change displayed opportunities
8. Character count updates
9. Empty states render

### Nice to Have (May Defer)
10. Skeleton loading states
11. Keyboard accessibility (tab navigation)
12. Browser compatibility checks

---

## 9. Definition of Done

A test suite is complete when:
- [ ] All critical path scenarios covered
- [ ] All API endpoints have request/response tests
- [ ] Error paths tested (network errors, 4xx, 5xx)
- [ ] Empty states tested
- [ ] Loading states tested
- [ ] Edge cases from Section 5 addressed
- [ ] Tests fail before implementation (Red phase verified)

---

## References

- **Why these decisions**: [ADR-013](../../../../docs/architecture/decisions/013-opportunity-dashboard-ui.md)
- **Complete technical specs**: [Design Document](../designs/opportunity-dashboard-ui-design.md)
- **API schemas**: [openapi.yaml](../../../../docs/api/openapi.yaml) - see `listOpportunities`, `listResponsesByOpportunities`, `generateResponse`, `postResponse`
- **Type definitions**: 
  - [opportunity.ts](../../../../packages/shared/src/types/opportunity.ts)
  - [response.ts](../../../../packages/shared/src/types/response.ts)
