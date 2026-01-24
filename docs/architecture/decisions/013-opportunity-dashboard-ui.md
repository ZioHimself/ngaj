# ADR-013: Opportunity Dashboard User Interface

## Status

**Accepted** - January 18, 2026

> **Note:** Some UI decisions in this ADR have been **superseded** by [ADR-015: Responsive Web Design](./015-responsive-web-design.md), which establishes mobile-first design patterns. Superseded sections are marked with ~~strikethrough~~.

## Context

The Opportunity Dashboard is the **primary interface** for ngaj v0.1. This is where users spend most of their time: reviewing discovered opportunities, generating AI responses, editing drafts, and posting to Bluesky. The backend discovery system (ADR-008) surfaces relevant posts, but we need to decide how users interact with this list.

**User Goal:** "I want to quickly scan opportunities, generate responses for the most interesting ones, and post after light editing."

**Design Constraints:**
- Users may have 10-50 opportunities per day (based on ADR-005 success criteria: 5-10 relevant)
- **Mobile-first design** (see [ADR-015](./015-responsive-web-design.md) for responsive layout decisions)
- Must feel fast and responsive (not sluggish with 50+ items)
- Simple workflow: View → Generate → Edit → Post (no complex branching)
- Non-technical users (consumer app, not power user tool)

**Key Questions:**
1. How should opportunities be displayed? (List vs. cards, dense vs. spacious)
2. What information is essential vs. nice-to-have?
3. How do users progress from discovery to posting?
4. How to handle opportunities across multiple sessions? (persistence, freshness)
5. What happens when opportunity is stale/deleted on platform?

## Decision

We will implement a **vertically scrolling list view** with inline response generation and editing, optimized for desktop scanning and quick decision-making.

### 1. Display Format

**Primary View:** List (not cards or table)

**Rationale:**
- **List over cards**: More opportunities visible per screen, faster scanning
- **List over table**: More flexible for dynamic content (responses, inline editing)
- Vertical scroll (familiar pattern, works on mobile)

### 2. Essential Information Hierarchy

Each opportunity displays (in order of prominence):

**Required (Always Visible):**
1. **Post content** (truncated if >300 chars, expandable)
2. **Author info** (handle, follower count)
3. **Score** (composite number or visual indicator)
4. **Age** (relative time: "2 hours ago")
5. **Status** (pending, draft ready, posted, dismissed)

**Optional (Show on Expand or Hover):**
- Full thread context (if reply to reply)
- Discovery source (replies to me, keyword match)
- Score breakdown (recency + impact components)

**Not Shown in v0.1** (defer to v0.2):
- Engagement metrics (likes, reposts on opportunity post)
- Predicted response quality
- Similar past responses

### 3. User Actions per Opportunity

**Primary Actions:**
- **Generate Response** - Calls Claude API, creates draft
- **View/Edit Response** - Shows draft in expandable editor
- **Post Response** - Submits to Bluesky
- **Dismiss** - Removes from list (mark as dismissed)

**Secondary Actions (Lower Priority for v0.1):**
- Regenerate response (new version)
- Copy response to clipboard
- Open in Bluesky (external link)

**Not in v0.1:**
- Snooze/remind later
- Add to favorites
- Share opportunity with others

### 4. Workflow States

Opportunities progress through states:

```
pending → [Generate] → draft → [Edit] → [Post] → posted
    ↓
 [Dismiss] → dismissed
```

**State Transitions:**
- `pending`: Just discovered, no response yet
- `draft`: Response generated, awaiting user review
- `posted`: Response successfully posted to platform
- `dismissed`: User decided not to respond

**UI Treatment:**
- `pending`: Default style, "Generate Response" button prominent
- `draft`: Highlight/badge, show response inline, "Post" button prominent
- `posted`: Dimmed/checkmark, link to platform post
- `dismissed`: Hidden by default (show if "Show dismissed" toggle enabled)

### 5. Sorting and Filtering

**Default Sort:** Score descending (highest priority first)

**Alternative Sorts (v0.1 if time allows):**
- Newest first (recency)
- Oldest first (don't miss older opportunities)

**Filtering (v0.1):**
- Status filter: "All", "Pending", "Draft Ready", "Posted", "Dismissed"

**Not in v0.1:**
- Search/text filter
- Tag/topic filter
- Author filter
- Date range filter

### 6. Data Loading Strategy

**Problem:** 50+ opportunities slow to load/render

**Decision:** ~~Server-side pagination~~ → **"Load More" button** (see [ADR-015](./015-responsive-web-design.md))

**Approach:**
- Load 20 opportunities initially
- "Load More" button appends next batch to existing list
- Server returns paginated results from MongoDB (skip/limit)
- Progress indicator shows "X of Y loaded"

**Why "Load More" over numbered pagination?**
- Better mobile UX (no fiddly page numbers on touch screens)
- User stays in context (doesn't jump to new page)
- Simpler mental model (just keep loading more)

> **Note:** Original decision was numbered pagination. Updated per ADR-015 for mobile-first design.

### 7. Real-Time Updates

**Problem:** New opportunities discovered while user viewing dashboard

**Decision:** Manual refresh for v0.1 (no auto-polling)

**Approach:**
- Show "Refresh" button in UI header
- User clicks to fetch new opportunities
- Optionally: Show banner "New opportunities available" if backend knows (via timestamp check)

**Why not auto-refresh?**
- Simpler implementation
- No risk of UI jumping while user reading
- Discovery runs infrequently (1-4 hours), so not critical
- Can add WebSocket updates in v0.2

### 8. Response Generation UX

**Inline vs. Modal?** → **Full-screen modal on mobile, inline on desktop** (see [ADR-015](./015-responsive-web-design.md))

**Flow:**
1. User clicks "Generate Response" on opportunity
2. Loading indicator appears (shows AI is working)
3. **Mobile:** Full-screen modal opens with response editor
4. **Desktop:** Modal with backdrop, constrained width
5. Textarea is editable for user changes
6. "Post" and "Regenerate" buttons in modal footer

**Why modal for mobile?**
- Full keyboard focus without layout jumping
- Virtual keyboard handling is cleaner
- Dedicated editing space on small screens
- Back button provides clear exit

> **Note:** Original decision was inline editing. Updated per ADR-015 for mobile-first design.

### 9. Error Handling

**Scenarios:**
- Generate fails (Claude API error)
- Post fails (Bluesky API error)
- Opportunity deleted on platform (404 on post)

**Approach (v0.1):**
- Show error message inline (banner or toast)
- Keep opportunity/draft in same state (no auto-dismiss)
- Provide "Retry" action
- No automatic recovery

**Example Messages:**
- "Failed to generate response. Check your Claude API key and try again."
- "Failed to post. The original post may have been deleted."
- "Network error. Please check your connection."

### 10. Empty States

**Scenarios:**
- No opportunities discovered yet
- All opportunities dismissed/posted
- Discovery disabled

**Display:**
- Centered message with helpful text
- Icon or illustration (optional)
- Call-to-action if applicable

**Examples:**
- "No opportunities yet. Next discovery check in 45 minutes."
- "All caught up! Check back later or click Refresh."
- "Discovery is paused. Enable in Settings to start finding opportunities."

## Rationale

### Why List View (vs. Cards or Table)?

**Decision:** Vertically scrolling list

**Alternatives Considered:**

1. **Card Grid (Pinterest-style)**
   - ✅ Visual, modern aesthetic
   - ❌ Fewer items visible (requires more scrolling)
   - ❌ Harder to scan text content quickly
   
2. **Table (Spreadsheet-style)**
   - ✅ Dense, lots of data visible
   - ❌ Feels technical/intimidating for non-technical users
   - ❌ Hard to show dynamic content (responses, expandable text)

**Chosen: List** because:
- Optimal balance of density and readability
- Familiar pattern (email inbox, task lists, social feeds)
- Works well for text-heavy content
- Easy to expand/collapse items

### Why Score Descending Sort (vs. Chronological)?

**Decision:** Default sort by composite score (highest first)

**Rationale:**
- Scoring already combines recency + impact (ADR-008)
- Users want to see "best opportunities" first
- Chronological alone may surface low-value recent posts

**Trade-off:**
- Some users may prefer "newest first" → Offer as alternative sort (if time allows)

### Why "Load More" (vs. Pagination or Infinite Scroll)?

**Decision:** ~~Server-side pagination~~ → **"Load More" button** (updated per [ADR-015](./015-responsive-web-design.md))

**Alternatives Considered:**

1. **Load All (No Pagination)**
   - ✅ Simplest
   - ❌ Slow with 50+ opportunities
   
2. **Numbered Pagination** (original decision)
   - ✅ Simple, predictable
   - ❌ Poor mobile UX (small touch targets for page numbers)
   - ❌ Context lost when changing pages

3. **Infinite Scroll**
   - ✅ Modern, smooth UX
   - ❌ More complex (scroll tracking, virtualization)
   - ❌ Harder to navigate back to specific item

**Chosen: "Load More"** because:
- Better mobile UX than numbered pages
- User stays in context (items append, don't replace)
- Simpler than infinite scroll (explicit user action)
- Explicit control over data loading

### Why Manual Refresh (vs. Auto-Polling)?

**Decision:** Manual refresh button (no automatic updates)

**Rationale:**
- Discovery runs every 1-4 hours (infrequent)
- Auto-polling adds complexity (WebSocket or polling interval)
- Risk of UI jumping while user interacting
- Manual refresh sufficient for MVP

**Trade-off:**
- User must remember to click Refresh → Mitigate with "New opportunities available" banner

### Why Full-Screen Modal on Mobile (vs. Inline)?

**Decision:** ~~Inline editing~~ → **Full-screen modal on mobile** (updated per [ADR-015](./015-responsive-web-design.md))

**Alternatives Considered:**

1. **Inline (original decision)**
   - ✅ Keeps context visible
   - ✅ Familiar social media pattern
   - ❌ Layout shifts when editor appears on mobile
   - ❌ Virtual keyboard handling is problematic
   
2. **Separate Page**
   - ✅ More space for editing
   - ❌ Requires navigation (slower)

3. **Full-Screen Modal**
   - ✅ Focused editing environment
   - ✅ Clean virtual keyboard handling
   - ✅ Works well on mobile
   - ⚠️ Needs "original post" preview to maintain context

**Chosen: Full-screen modal** because:
- Better mobile keyboard handling
- Dedicated editing space on small screens
- Clear entry/exit flow (back button)
- Original post preview maintains context

## Consequences

### Positive

- ✅ **Fast scanning**: List format optimized for quick review
- ✅ **Simple workflow**: Linear progression (pending → draft → posted)
- ✅ **Predictable performance**: Pagination limits rendering cost
- ✅ **Familiar patterns**: List + inline editing = known UX
- ✅ **Flexible display**: Easy to expand/collapse, show/hide details
- ✅ **Testable**: Clear states and actions to verify

### Negative

- ~~❌ **Desktop-only optimized**~~ → ✅ **Addressed by [ADR-015](./015-responsive-web-design.md)** (mobile-first design)
- ❌ **Manual refresh**: User must click to see new opportunities
- ❌ **Limited sorting/filtering**: Only basic options in v0.1
- ❌ **No bulk actions**: Must process opportunities one at a time
- ~~❌ **Pagination friction**~~ → ✅ **Addressed** ("Load More" button replaces numbered pages)

### Mitigation

- **Manual refresh**: Show banner when new opportunities available
- **Limited filters**: Document REST API for advanced queries; add more filters in v0.2
- **No bulk actions**: Acceptable for MVP (users review individually anyway)

## Implementation Guidance

### For Designer Agent

Focus design doc on:
- Layout proportions (opportunity card dimensions, spacing)
- Visual hierarchy (typography, color for different states)
- Interaction patterns (expand/collapse, button placement)
- Responsive breakpoints (if mobile attempted in v0.1)
- Component wireframes (low/mid-fidelity)

Avoid over-specifying:
- Exact CSS properties (let implementer choose)
- Animation details (nice-to-have, implementer decides)
- Icon library (implementer chooses)

### For Test-Writer Agent

Test coverage should include:
- Opportunity list loads with correct data
- Sorting works (score descending)
- Filtering by status works
- Generate response flow (pending → draft)
- Post response flow (draft → posted)
- Dismiss opportunity (pending → dismissed)
- Error handling (API failures show messages)
- Empty states display correctly
- Pagination navigation works

### For Implementer Agent

Creative freedom areas:
- Choose UI framework (React + Tailwind assumed, but implementer decides)
- Visual design (colors, fonts, spacing)
- Animations/transitions (if any)
- Icon library (Heroicons, Lucide, custom)
- Loading states (spinners, skeletons)
- Code organization (components, state management)

Must follow:
- Display required information (post content, author, score, age, status)
- Support defined actions (generate, post, dismiss)
- Implement state transitions correctly
- Use pagination (20 per page)
- Handle errors as specified

## Success Criteria

v0.1 Opportunity Dashboard succeeds if:

1. ✅ User can scan 20 opportunities in <60 seconds
2. ✅ Generate response flow completes in <10 seconds (excluding API time)
3. ✅ Post response flow completes in <5 seconds
4. ✅ UI feels responsive (no lag when scrolling, clicking)
5. ✅ Error messages are clear and actionable
6. ✅ Empty state provides helpful guidance
7. ✅ Desktop browsers (Chrome, Safari, Firefox) work correctly

## Future Enhancements

### v0.2: Enhanced Filtering & Sorting
- Multi-criteria sort (score + recency)
- Text search across opportunity content
- Filter by discovery source (replies, search)
- Save filter presets

### v0.3: Bulk Actions
- Select multiple opportunities
- Dismiss all selected
- Generate responses for all selected (batch)

### v0.4: Real-Time Updates
- WebSocket connection for live updates
- Auto-refresh when new opportunities discovered
- Live status updates (other devices post response)

### v0.5: Advanced Features
- Infinite scroll with virtualization
- Keyboard shortcuts (j/k navigation, g to generate, p to post)
- ~~Mobile-optimized view~~ → ✅ Implemented in v0.1 (see [ADR-015](./015-responsive-web-design.md))
- Drag-to-reorder (manual prioritization)
- Opportunity insights (why was this scored high?)

## References

- [ADR-005: MVP Scope](./005-mvp-scope.md) - v0.1 feature scope, UI priorities
- [ADR-008: Opportunity Discovery Architecture](./008-opportunity-discovery-architecture.md) - Backend discovery, scoring, data models
- [ADR-009: Response Suggestion Architecture](./009-response-suggestion-architecture.md) - Response generation flow
- [ADR-010: Response Posting](./010-response-posting.md) - Post response flow
- [ADR-012: First-Launch Setup Wizard](./012-first-launch-wizard.md) - Onboarding that leads to this page
- [ADR-015: Responsive Web Design](./015-responsive-web-design.md) - **Mobile-first UI layout decisions** (supersedes some UI decisions in this ADR)

## Related Documentation

- Design Doc: `.agents/artifacts/designer/designs/opportunity-dashboard-ui-design.md`
- **UI Design Doc**: `.agents/artifacts/designer/designs/responsive-web-design.md` - Mobile-first layout specifications
- Handoff Doc: `.agents/artifacts/designer/handoffs/008-opportunity-dashboard-ui-handoff.md`
- **UI Handoff Doc**: `.agents/artifacts/designer/handoffs/011-responsive-web-design-handoff.md` - Responsive design test scenarios
