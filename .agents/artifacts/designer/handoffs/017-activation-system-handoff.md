# Activation System - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-020](../../../docs/architecture/decisions/020-activation-system.md)
🔗 **Technical Specs**: [Design Document](../designs/activation-system-design.md)

## Overview

Test the heartbeat-based activation system that prevents unauthorized and concurrent ngaj installations. The system spans three components:

1. **Cloudflare Worker** - Activation API
2. **Backend** - Startup validation & heartbeat service
3. **Setup Wizard** - Activation key entry
4. **Caretaker CLI** - Key management

---

## 1. Test Scope

### In Scope

- ✅ Activation API endpoints (activate, validate, heartbeat, deactivate)
- ✅ Admin API endpoints (create, list, get, revoke keys)
- ✅ Device fingerprint computation
- ✅ Concurrent session detection
- ✅ Stale session timeout logic
- ✅ Backend startup validation flow
- ✅ Heartbeat service lifecycle
- ✅ Graceful shutdown deactivation
- ✅ Setup wizard activation prompt
- ✅ Caretaker CLI commands

### Out of Scope (for this phase)

- ❌ Cloudflare Worker deployment (infrastructure)
- ❌ Performance/load testing
- ❌ Network failure retry strategies (v0.2)
- ❌ Grace period for server outages (v0.2)

---

## 2. Test Scenarios

### 2.1 Unit Tests: Device Fingerprint

#### Scenario: Compute fingerprint correctly

**Given**: HOST_MACHINE_ID = "abc123", ACTIVATION_SALT = "xyz789"
**When**: `computeDeviceFingerprint()` is called
**Then**: Returns SHA256 hash of "abc123xyz789"

**Acceptance Criteria**:
- [ ] Returns 64-character hex string
- [ ] Same inputs produce same output (deterministic)
- [ ] Different inputs produce different outputs

#### Scenario: Missing HOST_MACHINE_ID

**Given**: HOST_MACHINE_ID is undefined
**When**: Backend attempts fingerprint computation
**Then**: Throws descriptive error

**Acceptance Criteria**:
- [ ] Error message indicates HOST_MACHINE_ID is missing
- [ ] Does not fall back to random value

---

### 2.2 Unit Tests: Cloudflare Worker Handlers

#### Scenario: Activate with valid key (no existing session)

**Given**: Activation key exists in KV, `current_session` is null
**When**: POST `/api/v1/activate` with valid key and fingerprint
**Then**: Returns `{success: true}`, updates `current_session`

**Acceptance Criteria**:
- [ ] Response status 200
- [ ] KV record updated with `current_session.device_fingerprint`
- [ ] `started_at` and `last_heartbeat_at` set to current time

#### Scenario: Activate with concurrent session (different fingerprint)

**Given**: Activation key exists, `current_session` active (heartbeat < 10 min ago)
**When**: POST `/api/v1/activate` with same key, different fingerprint
**Then**: Returns `{success: false, error: 'concurrent_session'}`

**Acceptance Criteria**:
- [ ] Response status 409 (Conflict)
- [ ] `retry_after_seconds` included in response
- [ ] KV record NOT updated

#### Scenario: Activate with stale session (heartbeat > 10 min ago)

**Given**: Activation key exists, `last_heartbeat_at` > 10 minutes ago
**When**: POST `/api/v1/activate` with same key, different fingerprint
**Then**: Returns `{success: true}`, replaces old session

**Acceptance Criteria**:
- [ ] Response status 200
- [ ] Old session replaced with new fingerprint
- [ ] Stale timeout logic uses server time

#### Scenario: Activate with invalid key

**Given**: Activation key does not exist in KV
**When**: POST `/api/v1/activate`
**Then**: Returns `{success: false, error: 'invalid_key'}`

**Acceptance Criteria**:
- [ ] Response status 401
- [ ] Descriptive error message

#### Scenario: Activate with revoked key

**Given**: Activation key exists but `status: 'revoked'`
**When**: POST `/api/v1/activate`
**Then**: Returns `{success: false, error: 'revoked'}`

**Acceptance Criteria**:
- [ ] Response status 403
- [ ] Descriptive error message

#### Scenario: Validate (same as activate logic)

Tests should mirror activate tests, as `/validate` has identical logic.

#### Scenario: Heartbeat updates timestamp

**Given**: Active session with matching fingerprint
**When**: POST `/api/v1/heartbeat`
**Then**: Updates `last_heartbeat_at`, returns `next_heartbeat_seconds`

**Acceptance Criteria**:
- [ ] Response status 200
- [ ] `last_heartbeat_at` updated in KV
- [ ] `next_heartbeat_seconds` returned (default 300)

#### Scenario: Heartbeat with wrong fingerprint

**Given**: Active session exists with different fingerprint
**When**: POST `/api/v1/heartbeat`
**Then**: Returns `{success: false, error: 'session_expired'}`

**Acceptance Criteria**:
- [ ] Response status 401
- [ ] Session NOT updated

#### Scenario: Deactivate clears session

**Given**: Active session with matching fingerprint
**When**: POST `/api/v1/deactivate`
**Then**: Clears `current_session`, returns success

**Acceptance Criteria**:
- [ ] Response status 200
- [ ] `current_session` set to null in KV

---

### 2.3 Unit Tests: Admin Endpoints

#### Scenario: Create key generates valid format

**When**: POST `/api/v1/admin/keys` with valid admin secret
**Then**: Returns new key in `NGAJ-{UUID}` format

**Acceptance Criteria**:
- [ ] Key matches pattern `^NGAJ-[0-9a-f-]{36}$`
- [ ] Key stored in KV with `status: 'active'`
- [ ] Optional label stored if provided

#### Scenario: Create key without admin secret

**When**: POST `/api/v1/admin/keys` without Authorization header
**Then**: Returns 401 Unauthorized

#### Scenario: List keys returns all keys

**Given**: Multiple keys in KV
**When**: GET `/api/v1/admin/keys` with valid admin secret
**Then**: Returns array of all keys with status

**Acceptance Criteria**:
- [ ] Each key includes `is_stale` computed from `last_heartbeat_at`
- [ ] Revoked keys included with `status: 'revoked'`

#### Scenario: Revoke key updates status

**Given**: Active key exists
**When**: DELETE `/api/v1/admin/keys/:key` with valid admin secret
**Then**: Sets `status: 'revoked'`

**Acceptance Criteria**:
- [ ] Key status updated in KV
- [ ] Active session NOT cleared (immediate effect via revoked check)

---

### 2.4 Integration Tests: Backend Startup

#### Scenario: Backend starts with valid activation

**Given**: Valid ACTIVATION_KEY and ACTIVATION_SALT in env, server reachable
**When**: Backend starts
**Then**: Validates activation, starts heartbeat, starts HTTP server

**Acceptance Criteria**:
- [ ] Validation request sent before HTTP server starts
- [ ] Heartbeat service started
- [ ] Health endpoint responds

**Mock/Stub Guidance**:
- Mock activation server to return `{success: true}`

#### Scenario: Backend exits on invalid activation

**Given**: Invalid ACTIVATION_KEY
**When**: Backend starts
**Then**: Logs error, exits with non-zero status

**Acceptance Criteria**:
- [ ] Exit code is non-zero (1)
- [ ] Error message matches "Invalid activation key" format
- [ ] HTTP server NOT started

**Mock/Stub Guidance**:
- Mock activation server to return `{success: false, error: 'invalid_key'}`

#### Scenario: Backend exits on concurrent session

**Given**: Another device actively using same key
**When**: Backend starts
**Then**: Logs error with retry guidance, exits

**Acceptance Criteria**:
- [ ] Error message mentions "Another device"
- [ ] Error message mentions wait time
- [ ] Exit code is non-zero

---

### 2.5 Integration Tests: Heartbeat Service

#### Scenario: Heartbeat sends at interval

**Given**: Backend running with valid activation
**When**: 5 minutes elapse
**Then**: Heartbeat request sent

**Acceptance Criteria**:
- [ ] First heartbeat sent immediately on start
- [ ] Subsequent heartbeats at 5-minute intervals

**Mock/Stub Guidance**:
- Use fake timers (jest.useFakeTimers or vitest equivalent)

#### Scenario: Heartbeat failure does not crash app

**Given**: Backend running, heartbeat endpoint unreachable
**When**: Heartbeat fails
**Then**: Logs warning, continues running

**Acceptance Criteria**:
- [ ] Warning logged
- [ ] App continues serving requests
- [ ] Next heartbeat attempted on schedule

#### Scenario: Graceful shutdown sends deactivate

**Given**: Backend running
**When**: SIGTERM received
**Then**: Deactivate request sent before exit

**Acceptance Criteria**:
- [ ] Deactivate endpoint called
- [ ] Exit after deactivate (or timeout)

---

### 2.6 Integration Tests: Setup Wizard

#### Scenario: Valid activation key accepted

**Given**: User enters valid activation key
**When**: Setup wizard validates
**Then**: Writes ACTIVATION_KEY and ACTIVATION_SALT to .env

**Acceptance Criteria**:
- [ ] ACTIVATION_SALT is 32 random characters
- [ ] Both values written to .env
- [ ] Success message displayed

**Mock/Stub Guidance**:
- Mock activation server
- Mock file system for .env writes

#### Scenario: Invalid key shows error, re-prompts

**Given**: User enters invalid key
**When**: Setup wizard validates
**Then**: Shows error, prompts again

**Acceptance Criteria**:
- [ ] Error message mentions "not recognized"
- [ ] User can retry
- [ ] Nothing written to .env

#### Scenario: Concurrent session shows specific error

**Given**: User enters key with active session
**When**: Setup wizard validates
**Then**: Shows "Another device" error with wait guidance

**Acceptance Criteria**:
- [ ] Error mentions wait time (up to 10 minutes)
- [ ] Error includes caretaker contact

---

### 2.7 Unit Tests: Caretaker CLI

The CLI is **interactive** (inquirer-based), run via `npm run caretaker`.

#### Scenario: create-key generates and stores key

**Given**: Valid admin secret (env or prompted), user selects "Create new activation key"
**When**: User enters label and confirms
**Then**: Creates key, outputs key value

**Acceptance Criteria**:
- [ ] API called with label (or undefined if empty)
- [ ] Output includes full key in `NGAJ-{UUID}` format
- [ ] Success indicator (✓)
- [ ] Returns to main menu

**Mock/Stub Guidance**:
- Mock admin API endpoint
- Mock inquirer prompts with test answers

#### Scenario: list-keys displays all keys

**Given**: Multiple keys exist, user selects "List all keys"
**When**: List is fetched
**Then**: Outputs table with key (truncated), status, label, last seen

**Acceptance Criteria**:
- [ ] Key shown as last 8 characters (`...44000000`)
- [ ] Stale sessions marked as "stale (Xd ago)"
- [ ] Active sessions show time since heartbeat ("2 min ago")
- [ ] Revoked keys show status, no heartbeat

#### Scenario: Admin secret prompt when not in env

**Given**: NGAJ_ADMIN_SECRET not set in environment
**When**: CLI starts
**Then**: Prompts for admin secret with masked input

**Acceptance Criteria**:
- [ ] Warning message shown about missing env var
- [ ] Password input is masked (shows `•` characters)
- [ ] Entered secret used for API calls
- [ ] Secret not persisted anywhere

**Mock/Stub Guidance**:
- Mock `process.env` without NGAJ_ADMIN_SECRET
- Mock inquirer password prompt

#### Scenario: API error handling

**Given**: API returns error (network or HTTP error)
**When**: Any command executes
**Then**: Error displayed, user can continue

**Acceptance Criteria**:
- [ ] Error message displayed clearly
- [ ] Menu continues (not exit)
- [ ] "Press Enter to continue" shown

---

## 3. Edge Cases & Error Paths

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| Activation server timeout (>5s) | Show "Cannot reach" error | High |
| Malformed activation key format | Show "Invalid key" error | High |
| Empty ACTIVATION_SALT in .env | Fail startup with clear error | High |
| Heartbeat during network outage | Log warning, continue running | Medium |
| Clock skew between client/server | Use server timestamps only | Medium |
| KV read failure | Return 500, log error | Medium |
| Admin secret in wrong format | Return 401 | Low |

---

## 4. Data Fixtures

### Test Activation Record

```typescript
const validActivationRecord: ActivationRecord = {
  key: 'NGAJ-550e8400-e29b-41d4-a716-446655440000',
  created_at: '2026-02-01T10:00:00Z',
  status: 'active',
  label: 'Test Device',
  current_session: null,
};

const activeSessionRecord: ActivationRecord = {
  ...validActivationRecord,
  current_session: {
    device_fingerprint: 'abc123def456...', // 64 hex chars
    last_heartbeat_at: new Date().toISOString(),
    started_at: '2026-02-01T10:00:00Z',
  },
};

const staleSessionRecord: ActivationRecord = {
  ...validActivationRecord,
  current_session: {
    device_fingerprint: 'abc123def456...',
    last_heartbeat_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
    started_at: '2026-02-01T10:00:00Z',
  },
};

const revokedRecord: ActivationRecord = {
  ...validActivationRecord,
  status: 'revoked',
};
```

**Full Schema**: See [Design Doc Section 1.1](../designs/activation-system-design.md#11-activation-record-server-side)

### Test Fingerprints

```typescript
const testFingerprints = {
  device1: 'a'.repeat(64), // Device 1
  device2: 'b'.repeat(64), // Device 2 (different)
};
```

---

## 5. Integration Dependencies

### Cloudflare Worker

- **Mock**: Use Miniflare for local Worker testing
- **KV**: Use in-memory KV mock
- **Time**: Use `Date.now()` mocks for stale session testing

### Backend

- **Activation API**: Mock HTTP client (nock or msw)
- **Environment**: Mock `process.env` with test values
- **Timers**: Use fake timers for heartbeat interval testing

### Setup Wizard

- **File system**: Mock `.env` writes
- **Activation API**: Mock HTTP client
- **User input**: Use inquirer test mode or mock prompts

### Caretaker CLI

- **Admin API**: Mock HTTP client
- **Environment**: Set test credentials
- **Output**: Capture stdout for assertion

---

## 6. Test Priorities

### Critical Path (Must Pass)

1. Activate with valid key (no session)
2. Activate rejected for concurrent session
3. Activate succeeds for stale session
4. Backend exits on invalid activation
5. Heartbeat updates timestamp
6. Deactivate clears session

### Important (Should Pass)

7. Invalid key rejected
8. Revoked key rejected
9. Admin endpoints require auth
10. Setup wizard writes to .env
11. Caretaker CLI creates keys

### Nice to Have (May Defer)

12. Heartbeat failure resilience
13. Clock skew handling
14. Rate limiting (v0.2)

---

## 7. Definition of Done

A test suite is complete when:

- [ ] All critical path scenarios covered with passing tests
- [ ] Concurrent session detection tested with multiple fingerprints
- [ ] Stale timeout logic tested with time mocking
- [ ] All API error codes tested (401, 403, 409, 500)
- [ ] Backend startup validation tested (success and failure paths)
- [ ] Heartbeat service lifecycle tested
- [ ] Setup wizard activation flow tested
- [ ] Caretaker CLI commands tested
- [ ] Tests fail before implementation (Red phase verified)

---

## References

- **Why these decisions**: [ADR-020](../../../docs/architecture/decisions/020-activation-system.md)
- **Complete technical specs**: [Design Document](../designs/activation-system-design.md)
- **API contracts**: [Design Doc Section 3](../designs/activation-system-design.md#3-api-contracts-cloudflare-worker)
- **Data models**: [Design Doc Section 1](../designs/activation-system-design.md#1-data-models)
- **Timing parameters**: [Design Doc Section 4](../designs/activation-system-design.md#4-timing-parameters)
