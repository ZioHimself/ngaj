# ADR-012: First-Launch Setup Wizard

## Status

**Accepted** - January 18, 2026

> **Note:** UI layout specifications (wireframes, component dimensions) are now defined in [ADR-015: Responsive Web Design](./015-responsive-web-design.md) and the associated design documents. This ADR focuses on wizard **flow and logic**.

## Context

After installation (ADR-011), services are running and credentials are configured, but **Profile and Account** records don't exist yet in MongoDB. The user needs a guided experience to:

1. **Create Profile** - Define voice, principles, interests (persona configuration)
2. **Create Account** - Connect Bluesky handle, verify connection
3. **Configure Discovery** - Set how often to check for opportunities
4. **Reach Dashboard** - Start using ngaj

**Current Challenge:**
- REST API exists for Profile/Account creation (see account-configuration-design.md)
- But expecting users to make API calls is not consumer-friendly
- Need web UI wizard that guides setup and calls APIs on behalf of user

**Design Constraints:**
- Wizard shows **only on first launch** (when no Profile exists)
- Must be **mandatory** for v0.1 (user can't skip to dashboard without completing setup)
- Should be **simple** (defer advanced settings to REST API)
- Must validate inputs and test connections before proceeding

## Decision

We will implement a **multi-step web UI wizard** that runs on first launch, creates Profile and Account, and redirects to Opportunity Dashboard page on completion.

### 1. Wizard Activation

**Trigger:** Backend detects no Profile exists in MongoDB

**Flow:**
1. User opens `http://localhost:3000` after installation
2. Backend checks: `db.profiles.count() === 0`
3. If true → Redirect to `/setup` (wizard)
4. If false → Serve normal dashboard

**Implementation:**
- Express middleware checks for Profile existence on all routes
- If no Profile exists, redirect to `/setup` (except `/setup` itself)
- After wizard completion, redirect to `/opportunities` (main page)

### 2. Wizard Steps

The wizard consists of **3 mandatory steps** presented sequentially:

---

#### **Step 1: Create Your Profile**

**Purpose:** Define cross-platform persona (voice, principles, interests)

> **UI Design:** See [ADR-015: Responsive Web Design](./015-responsive-web-design.md) and [Design Doc](../../.agents/artifacts/designer/designs/responsive-web-design.md) for mobile-first layout specifications.

**Fields:**

| Field | Type | Validation | Default |
|-------|------|-----------|---------|
| Profile Name | Text input | Required, 3-100 chars, unique | "" |
| Voice | Textarea (3 rows) | Required, 10-500 chars | "" |
| Principles | Textarea (3 rows) | Required, 10-500 chars | "" |
| Interests | Text input (tag-style) | Optional, comma-separated, max 20 tags | "" |

**Help Text:**
- **Voice**: "Describe your tone and style. This guides AI response generation."
- **Principles**: "Core beliefs that shape how you engage. AI will honor these principles."
- **Interests**: "Topics you want to engage with. Used for opportunity discovery."

**Validation:**
- Profile Name: Not empty, max 100 chars
- Voice: Min 10 chars, max 500 chars
- Principles: Min 10 chars, max 500 chars
- Interests: Each tag max 30 chars, max 20 tags total

**Action:**
- Click "Next" → POST `/api/profiles` with form data
- On success → Advance to Step 2
- On error → Show error message, allow retry

---

#### **Step 2: Connect Bluesky**

**Purpose:** Verify Bluesky credentials from installation, create Account record

> **UI Design:** See [ADR-015: Responsive Web Design](./015-responsive-web-design.md) and [Design Doc](../../.agents/artifacts/designer/designs/responsive-web-design.md) for mobile-first layout specifications.

**Fields:**

| Field | Type | Validation | Default |
|-------|------|-----------|---------|
| Bluesky Handle | Read-only text | (from .env) | (from BLUESKY_HANDLE) |
| Test Connection | Button | Calls API to verify auth | - |
| Consent checkbox | Checkbox | Required before "Next" | unchecked |

**Flow:**
1. Page loads → Display handle from `.env`
2. User clicks "Test Connection" → POST `/api/accounts/test-connection`
   - Success → Show "✓ Connected successfully", enable Next button
   - Failure → Show error message ("Authentication failed. Check credentials in .env"), disable Next
3. User checks consent checkbox
4. User clicks "Next" → POST `/api/accounts` with `{ profileId, platform: 'bluesky', ... }`
5. On success → Advance to Step 3
6. On error → Show error message, allow retry

**Action:**
- "Back" → Return to Step 1 (Profile still saved, can edit)
- "Next" → Create Account, advance to Step 3

---

#### **Step 3: Configure Discovery**

**Purpose:** Set discovery schedule (how often to check for opportunities)

> **UI Design:** See [ADR-015: Responsive Web Design](./015-responsive-web-design.md) and [Design Doc](../../.agents/artifacts/designer/designs/responsive-web-design.md) for mobile-first layout specifications.

**Fields:**

| Field | Type | Validation | Default |
|-------|------|-----------|---------|
| Discovery Schedule | Dropdown | One of: 15min, 30min, 1hr, 2hr, 4hr | 1hr |

**Mapping to Cron Expressions:**

| User Selection | Cron Expression |
|---------------|----------------|
| Every 15 minutes | `*/15 * * * *` |
| Every 30 minutes | `*/30 * * * *` |
| Every 1 hour | `0 * * * *` |
| Every 2 hours | `0 */2 * * *` |
| Every 4 hours | `0 */4 * * *` |

**Action:**
- "Back" → Return to Step 2 (Account still saved)
- "Finish Setup" → PATCH `/api/accounts/:id` to update discovery schedules
  - Set both `discovery.replies.schedule` and `discovery.search.schedule` to same cron expression (simplified for v0.1)
  - Set both schedules to `enabled: true`
  - On success → Redirect to `/opportunities` (main page)
  - On error → Show error message, allow retry

---

### 3. Navigation & State

**Progress Indicator:**
- Show `[1/3]`, `[2/3]`, `[3/3]` in wizard header
- Highlight current step

**Back Button:**
- Available on Step 2 and Step 3
- Returns to previous step
- Data from previous steps is saved (Profile, Account exist)
- User can edit previous values (updates existing records)

**Can't Skip:**
- No "Skip Setup" button
- No way to access main app without completing wizard
- Wizard only shows once (when no Profile exists)

**Browser Refresh:**
- If user refreshes during wizard, wizard restarts at Step 1
- BUT Profile/Account records persist if already created
- Form fields pre-populate with existing values

### 4. API Calls

The wizard makes the following API calls:

| Step | Action | Endpoint | Payload |
|------|--------|----------|---------|
| 1 | Create Profile | `POST /api/profiles` | `WizardProfileInput` (see below) |
| 2 | Test Connection | `POST /api/accounts/test-connection` | `{ platform: 'bluesky' }` |
| 2 | Create Account | `POST /api/accounts` | `{ profileId, platform: 'bluesky' }` |
| 3 | Update Discovery | `PATCH /api/accounts/:id` | `{ schedulePreset: '1hr' }` |

**Notes:**
- Profile creation returns `profileId`, used in Account creation
- `test-connection` reads credentials from `.env` on backend, returns `{ success, handle, error? }`
- Account creation reads `handle` from `.env` on backend
- Discovery update transforms preset to cron schedules on backend

### 5. Error Handling

**Validation Errors (Client-Side):**
- Show error message below field
- Disable "Next" button until fixed
- Example: "Profile name is required"

**API Errors (Server-Side):**
- Display error message in modal or banner
- Allow user to retry
- Examples:
  - "Profile name already exists. Choose a different name."
  - "Bluesky connection failed. Check credentials in .env and restart services."
  - "Failed to create account. Please try again."

**Network Errors:**
- Show generic error: "Network error. Please check your connection and try again."
- Provide "Retry" button

**No Automatic Recovery:**
- User must fix and retry manually
- Wizard does not auto-advance on error

## Rationale

### Why Mandatory Wizard (vs. Skippable)?

**Decision:** Wizard is mandatory; user cannot access dashboard without completing setup

**Alternatives Considered:**

1. **Skippable wizard with banner reminder**
   - ✅ More flexible (power users can skip, use REST API)
   - ❌ User lands on empty dashboard, confused
   - ❌ Must handle "no Profile" state throughout app

2. **Progressive setup (allow partial completion)**
   - ✅ Faster to get started
   - ❌ Opportunity discovery won't work without Account
   - ❌ More complex state management

**Chosen approach: Mandatory** because:
- Clear, linear onboarding (reduces confusion)
- Ensures app is fully functional after setup
- Simpler implementation (no partial state handling)
- Non-technical users benefit from guidance

### Why 3 Steps (vs. Single Form or 4+ Steps)?

**Decision:** 3 steps: Profile, Account, Discovery

**Alternatives Considered:**

1. **Single-page form (all fields at once)**
   - ✅ Faster for experienced users
   - ❌ Overwhelming for non-technical users
   - ❌ Harder to show contextual help

2. **4+ steps (e.g., separate step for each field group)**
   - ✅ More granular guidance
   - ❌ Feels tedious ("how many more steps?")

**Chosen approach: 3 steps** because:
- Logical grouping (Persona → Platform → Automation)
- Each step has clear purpose
- Not too long, not too short

### Why Simplified Discovery Schedule (vs. Advanced Cron)?

**Decision:** Dropdown with 5 preset options (15min to 4hr)

**Alternatives Considered:**

1. **Show cron expression input**
   - ❌ Technical, intimidating for non-technical users

2. **Separate schedules for replies vs. search**
   - ✅ More powerful (as designed in account-configuration-design.md)
   - ❌ Over-complicated for first-time setup
   - 🔄 Deferred to REST API ("Advanced settings")

**Chosen approach: Simple dropdown** because:
- Non-technical users understand "every 1 hour"
- Can always switch to advanced schedules via REST API later
- Good enough for 80% of use cases

### Why Tips/Help Text (No Examples)?

**Decision:** Show tips for Voice and Principles fields, no pre-filled examples

**User feedback:** "No need for voice examples, principles examples"

**Rationale:**
- Tips provide guidance without prescribing specific content
- Users provide their own authentic voice (not copy/paste examples)
- Examples might bias users toward certain styles

## Consequences

### Positive

- ✅ **Clear onboarding**: Linear, guided flow from install to working app
- ✅ **Validates setup**: Tests Bluesky connection before proceeding
- ✅ **Consumer-friendly**: No API calls or config file editing needed
- ✅ **One-time flow**: Only shows on first launch (no repeated annoyance)
- ✅ **Persistent state**: Browser refresh doesn't lose progress (data saved to DB)
- ✅ **Developer escape hatch**: Advanced users can still use REST API for settings

### Negative

- ❌ **Can't skip**: Even power users must complete wizard
- ❌ **No editing in GUI**: After wizard, settings changes require REST API
- ❌ **Single Profile/Account**: Wizard assumes single-account setup (v0.1 constraint)
- ❌ **Limited discovery options**: No separate schedules for replies/search (simplified)

### Mitigation

- **Can't skip**: Fast wizard (3 steps, ~2 minutes); acceptable for one-time setup
- **No editing in GUI**: Document REST API clearly; add Settings UI in v0.2
- **Single Profile/Account**: Acceptable for v0.1 MVP; wizard can support multi-account in v0.2
- **Limited discovery**: Document advanced scheduling via REST API

## Implementation Notes

### Frontend (React)

**State Management:**
- Local React state for current step
- Store `profileId` and `accountId` after creation (pass to subsequent steps)
- Form state managed per-step (no shared form state)

**Routing:**
- `/setup` route shows wizard
- After completion, redirect to `/opportunities`

### Backend (Express Middleware)

**API Endpoints (Already Exist):**
- `POST /api/profiles` - Create Profile
- `POST /api/accounts` - Create Account
- `PATCH /api/accounts/:id` - Update Account (discovery schedules)
- `POST /api/accounts/test-connection` - Test platform connection (new endpoint)

## Success Criteria

v0.1 wizard succeeds if:

1. ✅ Non-technical user completes setup in <5 minutes
2. ✅ Wizard validates Bluesky connection before proceeding
3. ✅ User lands on Opportunity Dashboard page with functional app
4. ✅ Wizard only shows once (never again after completion)
5. ✅ Clear error messages guide recovery on failures
6. ✅ Form fields provide helpful tips (not overwhelming)

## Future Enhancements

### v0.2: Settings UI
- Edit Profile (voice, principles, interests) in GUI
- Edit discovery schedules (advanced: separate for replies/search)
- Add/remove Accounts (multi-account support)

### v0.3: Wizard Improvements
- Skip wizard (for power users who prefer REST API)
- Progress bar (instead of step counter)
- "Save and continue later" option

### v0.4: Knowledge Base Wizard Step
- Add optional Step 4: Upload documents
- Drag-drop knowledge base files
- Show processing status

### v0.5: Onboarding Tour
- After wizard, show interactive dashboard tour
- Tooltips explaining key features
- "Skip tour" option

## References

- [ADR-011: Installation and Setup Architecture](./011-installation-and-setup.md) - Installation flow that precedes this wizard
- [ADR-006: Profile and Account Separation](./006-profile-account-separation.md) - Data model for Profile/Account
- [ADR-015: Responsive Web Design](./015-responsive-web-design.md) - **UI layout and responsive design decisions**
- [Design Doc: Account Configuration](../../.agents/artifacts/designer/designs/account-configuration-design.md) - API contracts for Profile/Account
- [ADR-005: MVP Scope](./005-mvp-scope.md) - v0.1 feature scope

## Related Documentation

- Design Doc: `.agents/artifacts/designer/designs/first-launch-wizard-design.md`
- **UI Design Doc**: `.agents/artifacts/designer/designs/responsive-web-design.md` - Mobile-first layout specifications
- Handoff Doc: `.agents/artifacts/designer/handoffs/007-first-launch-wizard-handoff.md`
- Type Definitions: `packages/shared/src/types/wizard.ts`
