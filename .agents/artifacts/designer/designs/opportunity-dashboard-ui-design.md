# Opportunity Dashboard UI - Design Document

📋 **Decision Context**: [ADR-013: Opportunity Dashboard User Interface](../../../../docs/architecture/decisions/013-opportunity-dashboard-ui.md)

**Date**: 2026-01-24  
**Status**: Approved

---

## Overview

The Opportunity Dashboard is the primary interface for ngaj v0.1. Users view discovered opportunities, generate AI responses, edit drafts, and post to Bluesky. This document specifies the frontend implementation details.

**Key Entities**: Opportunity, Response, Author  
**External Dependencies**: Backend REST API, Bluesky (via backend)

**Type Definitions**: 
- `packages/shared/src/types/opportunity.ts`
- `packages/shared/src/types/response.ts`

---

## 1. Page Structure

### 1.1 Layout Components

```
┌─────────────────────────────────────────────────────────────────┐
│  DashboardHeader                                                │
├─────────────────────────────────────────────────────────────────┤
│  FilterBar                                                      │
├─────────────────────────────────────────────────────────────────┤
│  OpportunityList                                                │
│    ├─ OpportunityCard (expanded)                                │
│    │    └─ ResponseEditor                                       │
│    ├─ OpportunityCard (collapsed)                               │
│    └─ OpportunityCard (collapsed)                               │
├─────────────────────────────────────────────────────────────────┤
│  Pagination                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Tree

```typescript
// Page component
Opportunities
  ├─ DashboardHeader
  │    ├─ Logo/Title
  │    └─ RefreshButton
  ├─ FilterBar
  │    ├─ StatusFilter (dropdown or tabs)
  │    └─ SortIndicator (read-only for v0.1)
  ├─ OpportunityList
  │    └─ OpportunityCard[] 
  │         ├─ OpportunityHeader (author, score, age)
  │         ├─ OpportunityContent (post text)
  │         ├─ OpportunityActions (generate, dismiss)
  │         └─ ResponseEditor (when expanded)
  │              ├─ DraftTextarea
  │              ├─ CharacterCount
  │              └─ ResponseActions (regenerate, dismiss, post)
  ├─ Pagination
  │    ├─ PreviousButton
  │    ├─ PageInfo
  │    └─ NextButton
  └─ EmptyState (conditional)
```

---

## 2. State Management

### 2.1 Page State

```typescript
interface DashboardState {
  // Data
  opportunities: OpportunityWithAuthor[];
  responses: Map<string, Response>; // keyed by opportunityId
  
  // UI State
  loading: boolean;
  error: string | null;
  
  // Filters & Pagination
  statusFilter: OpportunityStatus | 'all';
  currentPage: number;
  totalPages: number;
  totalCount: number;
  
  // Expansion
  expandedOpportunityId: string | null;
  
  // Action Loading States
  generatingResponseFor: string | null;  // opportunityId
  postingResponseFor: string | null;     // opportunityId
  dismissingOpportunity: string | null;  // opportunityId
}
```

### 2.2 Initial State & Auto-Expansion

On page load:
1. Fetch opportunities (page 1, status=pending by default)
2. Fetch responses for those opportunity IDs
3. Auto-expand the **first opportunity** that has a draft response
4. If no drafts exist, expand the **first opportunity** in the list

```typescript
function determineInitialExpansion(
  opportunities: OpportunityWithAuthor[],
  responses: Map<string, Response>
): string | null {
  // First, try to find one with a draft
  const withDraft = opportunities.find(
    opp => responses.get(opp._id)?.status === 'draft'
  );
  if (withDraft) return withDraft._id;
  
  // Otherwise, expand first opportunity
  return opportunities[0]?._id ?? null;
}
```

### 2.3 Draft Editing State

```typescript
interface DraftEditState {
  originalText: string;      // From response.text
  editedText: string;        // User's current edits
  isDirty: boolean;          // editedText !== originalText
}
```

Track per-opportunity to preserve edits when collapsing/expanding.

---

## 3. Data Flow

### 3.1 Initial Load Sequence

```mermaid
sequenceDiagram
    participant UI as Dashboard
    participant API as Backend API
    
    UI->>API: GET /api/opportunities?status=pending&limit=20&offset=0&sort=-score
    API-->>UI: { opportunities: [...], total, hasMore }
    
    Note over UI: Extract opportunity IDs
    
    UI->>API: GET /api/responses?opportunityIds=id1,id2,id3...
    API-->>UI: { responses: [...] }
    
    Note over UI: Map responses by opportunityId
    Note over UI: Auto-expand first with draft (or first overall)
```

### 3.2 Generate Response Flow

```mermaid
sequenceDiagram
    participant UI as Dashboard
    participant API as Backend API
    
    Note over UI: User clicks "Generate Response"
    UI->>UI: Set generatingResponseFor = opportunityId
    UI->>UI: Expand opportunity card
    
    UI->>API: POST /api/responses/generate { opportunityId, mode: "quick" }
    API-->>UI: { response: Response }
    
    UI->>UI: Add response to Map
    UI->>UI: Clear generatingResponseFor
```

### 3.3 Post Response Flow

```mermaid
sequenceDiagram
    participant UI as Dashboard
    participant API as Backend API
    
    Note over UI: User clicks "Post Response"
    UI->>UI: Set postingResponseFor = opportunityId
    
    alt Text was edited
        UI->>API: PATCH /api/responses/:id { finalText: editedText }
        API-->>UI: { response: updated }
    end
    
    UI->>API: POST /api/responses/:id/post
    API-->>UI: { response: { status: "posted", platformPostUrl } }
    
    UI->>UI: Update response in Map
    UI->>UI: Update opportunity status to "responded"
    UI->>UI: Clear postingResponseFor
```

### 3.4 Dismiss Flow

```mermaid
sequenceDiagram
    participant UI as Dashboard
    participant API as Backend API
    
    Note over UI: User clicks "Dismiss"
    UI->>UI: Set dismissingOpportunity = opportunityId
    
    UI->>API: PATCH /api/opportunities/:id { status: "dismissed" }
    API-->>UI: { opportunity: updated }
    
    UI->>UI: Remove from list (or update status if showing all)
    UI->>UI: Clear dismissingOpportunity
```

---

## 4. Component Specifications

### 4.1 OpportunityCard

**Props**:
```typescript
interface OpportunityCardProps {
  opportunity: OpportunityWithAuthor;
  response: Response | undefined;
  isExpanded: boolean;
  isGenerating: boolean;
  isPosting: boolean;
  isDismissing: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onGenerate: () => void;
  onDismiss: () => void;
  onPost: (text: string) => void;
  onRegenerate: () => void;
}
```

**Display States**:

| State | Visual Treatment |
|-------|------------------|
| Pending (no response) | Default style, "Generate Response" prominent |
| Draft Ready | Highlight badge, draft visible when expanded |
| Posted | Dimmed, checkmark icon, link to platform post |
| Dismissed | Hidden by default (shown if filter includes) |

**Collapsed View** (always visible):
- Author handle + follower count
- Score (number or visual indicator)
- Relative time ("2 hours ago")
- Post text preview (first ~100 chars)
- Status badge (if draft ready or posted)
- Action buttons: [Generate Response] or [Expand] + [Dismiss]

**Expanded View** (additional):
- Full post text (truncate at 300 chars with "Show more")
- ResponseEditor component (if has response or generating)

### 4.2 ResponseEditor

**Props**:
```typescript
interface ResponseEditorProps {
  response: Response | undefined;
  isGenerating: boolean;
  isPosting: boolean;
  maxLength: number;  // 300 for Bluesky
  onPost: (text: string) => void;
  onRegenerate: () => void;
  onDismissResponse: () => void;  // Dismiss the response, keep opportunity
}
```

**States**:
1. **Generating**: Show loading spinner + "Generating response..."
2. **Draft Ready**: Editable textarea + character count + action buttons
3. **Posted**: Read-only text + link to platform post

**Character Count Display**:
```typescript
// Simple format for v0.1
const display = `${text.length}/${maxLength}`;
// Example: "145/300"
```

### 4.3 FilterBar

**Props**:
```typescript
interface FilterBarProps {
  currentStatus: OpportunityStatus | 'all';
  onStatusChange: (status: OpportunityStatus | 'all') => void;
}
```

**Filter Options**:
- All
- Pending (default)
- Draft Ready
- Posted
- Dismissed

**Implementation**: Dropdown or horizontal tabs (implementer choice)

### 4.4 Pagination

**Props**:
```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled: boolean;  // Disable during loading
}
```

**Display**: `[← Previous]  Page 1 of 3  [Next →]`

---

## 5. API Integration

> **📋 API Specification**: See [docs/api/openapi.yaml](../../../../docs/api/openapi.yaml) for complete schemas.

### 5.1 Endpoints Used

| Action | Endpoint | Method |
|--------|----------|--------|
| List opportunities | `/api/opportunities` | GET |
| List responses (batch) | `/api/responses?opportunityIds=...` | GET |
| Generate response | `/api/responses/generate` | POST |
| Edit response | `/api/responses/:id` | PATCH |
| Post response | `/api/responses/:id/post` | POST |
| Dismiss opportunity | `/api/opportunities/:id` | PATCH |

### 5.2 Query Parameters

**List Opportunities**:
```
GET /api/opportunities?status=pending&limit=20&offset=0&sort=-score
```

**List Responses** (batch):
```
GET /api/responses?opportunityIds=id1,id2,id3
```

### 5.3 Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| Network error | "Unable to connect. Check your connection." | Retry button |
| 404 on opportunity | "This opportunity no longer exists." | Remove from list |
| 503 on generate | "AI service unavailable. Try again later." | Retry button |
| 503 on post | "Bluesky unavailable. Try again later." | Retry button |
| 400 validation | Show specific error message | Fix and retry |

**Error Display**: Inline banner at top of card or toast notification.

---

## 6. Empty States

### 6.1 No Opportunities

**Condition**: `opportunities.length === 0` and `statusFilter === 'pending'`

**Display**:
```
[Icon: Search or Inbox]

No opportunities yet

Discovery will check for new posts based on your schedule.
Next check in approximately [X] minutes.

[Refresh Now]
```

### 6.2 All Caught Up

**Condition**: `opportunities.length === 0` and `statusFilter === 'all'`

**Display**:
```
[Icon: Checkmark]

All caught up!

You've reviewed all discovered opportunities.
Check back later or click Refresh.

[Refresh]
```

### 6.3 No Results for Filter

**Condition**: `opportunities.length === 0` and specific filter active

**Display**:
```
No [status] opportunities

Try changing your filter or check back later.

[Show All]
```

---

## 7. Loading States

### 7.1 Initial Page Load

Show skeleton UI:
- 3-5 placeholder cards with animated shimmer
- Header and filter bar visible but disabled

### 7.2 Action Loading

| Action | Indicator |
|--------|-----------|
| Generating response | Spinner in expanded card, "Generating..." text |
| Posting response | "Post" button shows spinner, disabled |
| Dismissing | "Dismiss" button shows spinner, disabled |
| Page navigation | Skeleton cards replace current list |

### 7.3 Refresh

- Refresh button shows spinner
- Keep current list visible until new data loads
- Replace list on success

---

## 8. Keyboard Accessibility

**v0.1 Minimum**:
- Tab navigation through interactive elements
- Enter/Space to activate buttons
- Escape to collapse expanded card

**Future (v0.2)**:
- j/k navigation between cards
- g to generate, p to post
- d to dismiss

---

## 9. Responsive Behavior

**v0.1**: Desktop-optimized (min-width: 768px)

**Breakpoints** (for future reference):
- Desktop: 1024px+ (comfortable spacing)
- Tablet: 768px-1023px (reduced padding)
- Mobile: <768px (stacked layout, future)

---

## 10. Implementation Notes

### 10.1 Performance Considerations

- **Pagination**: 20 items max per page (prevents DOM bloat)
- **Response Map**: O(1) lookup by opportunityId
- **Debounce**: Debounce textarea edits (300ms) before marking dirty
- **Lazy expand**: Only render ResponseEditor when card expanded

### 10.2 Edge Cases

| Case | Handling |
|------|----------|
| Opportunity deleted while viewing | Show error, remove from list |
| Response already posted (race condition) | Show success, update UI |
| Text exceeds limit after edit | Allow submission (backend validates) |
| Rapid clicking generate | Disable button during request |
| Page change with unsaved edits | Warn user or auto-save to local storage |

### 10.3 Browser Support

- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

---

## 11. Open Questions

- [x] Batch response endpoint - **Resolved**: Added `GET /api/responses?opportunityIds=...`
- [x] Initial expansion behavior - **Resolved**: First with draft, else first overall

---

## 12. References

- **Decision Rationale**: [ADR-013](../../../../docs/architecture/decisions/013-opportunity-dashboard-ui.md)
- **Test Guidance**: [Handoff Document](../handoffs/008-opportunity-dashboard-ui-handoff.md)
- **API Specification**: [openapi.yaml](../../../../docs/api/openapi.yaml)
- **Type Definitions**: 
  - [opportunity.ts](../../../../packages/shared/src/types/opportunity.ts)
  - [response.ts](../../../../packages/shared/src/types/response.ts)
