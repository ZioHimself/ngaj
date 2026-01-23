# First-Launch Wizard - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-012](../../../../docs/architecture/decisions/012-first-launch-wizard.md)  
🔗 **Technical Specs**: [Design Document](../designs/first-launch-wizard-design.md)

---

## 1. Test Scope

### In Scope
- ✅ Wizard activation (redirect to `/setup` when no Profile)
- ✅ Step 1: Profile creation with validation
- ✅ Step 2: Connection test and Account creation
- ✅ Step 3: Discovery schedule configuration
- ✅ Navigation (back/next, progress indicator)
- ✅ Error handling (validation, API, network)
- ✅ Completion redirect to `/opportunities`

### Out of Scope
- ❌ Settings UI (no editing after wizard in v0.1)
- ❌ Multi-account setup
- ❌ Skip wizard option

---

## 2. Test Scenarios

### 2.1 Wizard Activation

#### Scenario: Redirect to wizard when no Profile exists
**Given**: No Profile in database  
**When**: User navigates to any route (e.g., `/`, `/opportunities`)  
**Then**: Redirects to `/setup`  
**Criteria**: 
- [ ] HTTP 302 redirect to `/setup`
- [ ] `/setup` route itself does not redirect

#### Scenario: Skip wizard when Profile exists
**Given**: Profile exists in database  
**When**: User navigates to `/`  
**Then**: Shows dashboard, not wizard  
**Criteria**:
- [ ] No redirect to `/setup`
- [ ] `/setup` redirects to `/opportunities` if Profile exists

---

### 2.2 Step 1: Profile Creation

#### Scenario: Successful profile creation
**Given**: Wizard at Step 1  
**When**: User fills valid data and clicks Next  
**Then**: Profile created, advances to Step 2  
**Criteria**:
- [ ] POST `/api/profiles` with `WizardProfileInput`
- [ ] Profile record created in MongoDB
- [ ] Wizard advances to Step 2

#### Scenario: Validation errors
**Given**: Wizard at Step 1  
**When**: User submits invalid data  
**Then**: Shows error, does not advance  
**Test Cases**:
- [ ] Empty name → "Profile name is required"
- [ ] Name 2 chars → "Minimum 3 characters"
- [ ] Name 101 chars → "Maximum 100 characters"
- [ ] Voice 5 chars → "Minimum 10 characters"
- [ ] Principles empty → "Principles required"
- [ ] 21 interests → "Maximum 20 interests"

#### Scenario: Duplicate profile name
**Given**: Profile "Test" already exists  
**When**: User tries to create Profile named "Test"  
**Then**: Shows error "Name already exists"  
**Criteria**:
- [ ] API returns 409 Conflict
- [ ] Error displayed to user

---

### 2.3 Step 2: Connect Bluesky

#### Scenario: Successful connection test
**Given**: Wizard at Step 2, valid credentials in .env  
**When**: User clicks "Test Connection"  
**Then**: Shows success, enables Next  
**Criteria**:
- [ ] POST `/api/accounts/test-connection` returns `{ success: true }`
- [ ] "Connected successfully" shown
- [ ] Next button enabled

#### Scenario: Connection test fails
**Given**: Wizard at Step 2, invalid credentials  
**When**: User clicks "Test Connection"  
**Then**: Shows error, Next stays disabled  
**Criteria**:
- [ ] Returns `{ success: false, error: "..." }`
- [ ] Error message displayed
- [ ] Next button remains disabled

#### Scenario: Missing consent checkbox
**Given**: Connection test passed  
**When**: User clicks Next without checking consent  
**Then**: Shows validation error  
**Criteria**:
- [ ] "You must agree to continue" shown
- [ ] Does not advance

#### Scenario: Account creation
**Given**: Connection test passed, consent checked  
**When**: User clicks Next  
**Then**: Account created, advances to Step 3  
**Criteria**:
- [ ] POST `/api/accounts` with `WizardAccountInput`
- [ ] Account linked to Profile via `profileId`
- [ ] Wizard advances to Step 3

---

### 2.4 Step 3: Discovery Schedule

#### Scenario: Set discovery schedule
**Given**: Wizard at Step 3  
**When**: User selects schedule and clicks Finish  
**Then**: Account updated, redirects to opportunities  
**Criteria**:
- [ ] PATCH `/api/accounts/:id` with schedule preset
- [ ] Both `replies` and `search` schedules set to same cron
- [ ] Both schedules enabled
- [ ] Redirects to `/opportunities`

#### Scenario: Schedule presets map correctly
**Given**: User selects each preset  
**Then**: Correct cron expression saved  
**Test Cases**:
- [ ] "Every 15 minutes" → `*/15 * * * *`
- [ ] "Every 30 minutes" → `*/30 * * * *`
- [ ] "Every 1 hour" → `0 * * * *`
- [ ] "Every 2 hours" → `0 */2 * * *`
- [ ] "Every 4 hours" → `0 */4 * * *`

---

### 2.5 Navigation

#### Scenario: Back button
**Given**: Wizard at Step 2 or 3  
**When**: User clicks Back  
**Then**: Returns to previous step  
**Criteria**:
- [ ] Step 2 Back → Step 1
- [ ] Step 3 Back → Step 2
- [ ] Form pre-populated with existing data

#### Scenario: Browser refresh
**Given**: Wizard mid-flow, Profile/Account created  
**When**: User refreshes browser  
**Then**: Wizard restarts but data persists  
**Criteria**:
- [ ] Wizard shows Step 1
- [ ] Form pre-populated from database
- [ ] Completing wizard updates existing records (not duplicates)

---

### 2.6 Error Handling

#### Scenario: Network error during API call
**Given**: Network unavailable  
**When**: Any API call fails  
**Then**: Shows network error, allows retry  
**Criteria**:
- [ ] "Network error. Check connection." displayed
- [ ] Retry button available
- [ ] No partial data corruption

#### Scenario: Server error
**Given**: API returns 500  
**When**: Any step submission  
**Then**: Shows generic error  
**Criteria**:
- [ ] "Something went wrong. Please try again." shown
- [ ] User can retry

---

## 3. Integration Dependencies

### Mocks Required
- MongoDB (Profile, Account collections)
- Bluesky API (for connection test)
- Express middleware (profile existence check)

### Test Environment
- Backend running with test database
- Valid/invalid .env credentials for connection test scenarios

---

## 4. Priority

### Critical (Must Pass)
- Wizard activation/redirect
- Profile creation
- Connection test
- Account creation
- Discovery schedule setting
- Completion redirect

### Important (Should Pass)
- All validation scenarios
- Back navigation
- Error handling

### Nice-to-Have
- Browser refresh handling
- Progress indicator display

---

## References

- [Design Document](../designs/first-launch-wizard-design.md) - API endpoints and types
- [ADR-012](../../../../docs/architecture/decisions/012-first-launch-wizard.md) - UI mockups and rationale
