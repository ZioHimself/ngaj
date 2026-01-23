# Installation and Setup - Test Plan

**Handoff Number**: 007
**Feature**: Installation and Setup
**Date**: January 23, 2026

## Overview

Tests for the containerized CLI setup wizard that collects and validates user credentials (Bluesky, Claude API) during installation, plus OS-specific script validation.

**References**:
- [ADR-011: Installation and Setup Architecture](../../../../docs/architecture/decisions/011-installation-and-setup.md)
- [Designer Handoff](../../designer/handoffs/006-installation-setup-handoff.md)
- [Type Definitions](../../../../packages/shared/src/types/setup.ts)

---

## Test Coverage Summary

| Category | Tests | Status | Priority |
|----------|-------|--------|----------|
| Unit: Bluesky Validator | 13 | ✅ Pass | Critical |
| Unit: Anthropic Validator | 11 | ✅ Pass | Critical |
| Unit: Env Writer | 12 | ✅ Pass | Critical |
| Integration: Wizard Flow | 9 | ✅ Pass | Important |
| **Unit: Signal Handler** | **10** | **🔴 Red** | **Critical** |
| **Unit: Script Validator** | **42** | **🔴 Red (22) / ✅ Pass (20)** | **Important** |
| **Total** | **97** | | |

---

## Red Phase Tests (Unimplemented Features)

### Signal Handler (Ctrl+C Cancellation)

**File**: `tests/unit/setup/handlers/signal-handler.spec.ts`
**Stub**: `packages/setup/src/handlers/signal-handler.ts`

| Test | Description | Status |
|------|-------------|--------|
| Show cancellation prompt | "Setup incomplete. Quit? (y/n)" | 🔴 Red |
| Return confirmed: true | User confirms exit | 🔴 Red |
| Return confirmed: false | User declines exit | 🔴 Red |
| Register SIGINT handler | process.on('SIGINT') | 🔴 Red |
| Return cleanup function | Unregister handler | 🔴 Red |
| Call onCancel on confirm | Callback invocation | 🔴 Red |
| Call onResume on decline | Callback invocation | 🔴 Red |
| Remove SIGINT handler | Cleanup | 🔴 Red |
| No .env on cancel | File not written | 🔴 Red |
| Throw USER_CANCELLED | Error propagation | 🔴 Red |

### Script Validator (OS-Specific Scripts)

**File**: `tests/unit/setup/utils/script-validator.spec.ts`
**Stub**: `packages/setup/src/utils/script-validator.ts`

| Test Category | Tests | Status |
|---------------|-------|--------|
| validateMacOSScript | 11 | 🔴 Red |
| validateWindowsScript | 11 | 🔴 Red |
| MACOS_PATTERNS | 9 | ✅ Pass |
| WINDOWS_PATTERNS | 9 | ✅ Pass |
| Cross-platform consistency | 2 | 1 Pass / 1 Red |

---

## Green Phase Tests (Implemented Features)

### 1. Unit Tests: Bluesky Validator

**File**: `tests/unit/setup/validators/bluesky-validator.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| Valid handle + password → Success | Happy path connection | Critical |
| Invalid handle format → AUTH_FAILED | Missing @ prefix | Critical |
| Invalid password format → Error | Wrong format | Critical |
| Auth rejected → AUTH_FAILED | Wrong credentials | Critical |
| Network error → NETWORK_ERROR | No connectivity | Important |
| Timeout → TIMEOUT | Slow response | Important |
| Handle with @ prefix stripped | API call correctness | Important |
| Help URL returned on error | UX guidance | Nice-to-have |

### 2. Unit Tests: Anthropic Validator

**File**: `tests/unit/setup/validators/anthropic-validator.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| Valid API key → Success | Happy path | Critical |
| Invalid format (no sk-ant-) → Error | Format rejection | Critical |
| Invalid key (401) → AUTH_FAILED | API rejection | Critical |
| Network error → NETWORK_ERROR | No connectivity | Important |
| Help URL returned on error | UX guidance | Nice-to-have |
| Rate limited → RATE_LIMITED | Too many attempts | Nice-to-have |

### 3. Unit Tests: Env Writer

**File**: `tests/unit/setup/writers/env-writer.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| Writes complete .env file | All credentials included | Critical |
| Correct Bluesky format | BLUESKY_HANDLE, BLUESKY_APP_PASSWORD | Critical |
| Correct Anthropic format | ANTHROPIC_API_KEY | Critical |
| Creates directory if missing | Recursive mkdir | Important |
| Includes database defaults | MONGODB_URI, CHROMA_URL | Important |
| Includes timestamp comment | Auditability | Nice-to-have |

### 4. Integration Tests: Setup Wizard Flow

**File**: `tests/integration/setup/setup-wizard.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| Complete wizard flow | End-to-end success | Critical |
| Invalid Bluesky triggers retry | Re-prompt behavior | Important |
| Invalid Anthropic triggers retry | Re-prompt behavior | Important |
| Config object returned correctly | Data shape | Important |
| Error propagation | Failure handling | Important |

---

## Mock Strategy

### Bluesky API
- Mock `@atproto/api` BskyAgent
- Control `login()` success/failure
- Simulate network errors

### Anthropic API
- Mock `@anthropic-ai/sdk`
- Control `messages.create()` success/failure
- Simulate 401, network errors

### File System
- Mock `fs` module for env writer
- Verify correct file path and content
- Control directory existence

### User Input (Inquirer)
- Mock `inquirer.prompt()` for wizard tests
- Return pre-defined answers
- Simulate validation flow

---

## Test Fixtures

**File**: `tests/fixtures/setup-fixtures.ts`

### Valid Credentials
- `validBlueskyCredentials`: Handle + app password
- `validAnthropicCredentials`: API key

### Invalid Credentials
- `invalidBlueskyFormats`: Various format errors
- `invalidAnthropicFormats`: Wrong prefixes

### Mock Results
- `successValidationResult`: `{ valid: true }`
- `authFailedResult`: `{ valid: false, errorCode: 'AUTH_FAILED' }`
- `networkErrorResult`: `{ valid: false, errorCode: 'NETWORK_ERROR' }`

---

## Test Organization

```
tests/
├── unit/
│   └── setup/
│       ├── handlers/
│       │   └── signal-handler.spec.ts    # 🔴 Red phase
│       ├── utils/
│       │   └── script-validator.spec.ts  # 🔴 Red phase (partial)
│       ├── validators/
│       │   ├── bluesky-validator.spec.ts
│       │   └── anthropic-validator.spec.ts
│       └── writers/
│           └── env-writer.spec.ts
├── integration/
│   └── setup/
│       └── setup-wizard.spec.ts
└── fixtures/
    └── setup-fixtures.ts
```

## Stubs Created (for Red Phase)

```
packages/setup/src/
├── handlers/
│   └── signal-handler.ts      # Ctrl+C handling stub
└── utils/
    └── script-validator.ts    # Script validation stub
```

---

## Known Limitations

1. **No E2E tests for installers** - macOS .pkg and Windows .msi are out of unit test scope
2. **Docker not tested** - Container pull/run operations require actual Docker daemon
3. **Inquirer mocking complexity** - Interactive prompts require careful mock setup

---

## Implementation Order (for Implementer)

1. Start with validators (pure functions, no side effects)
2. Then env writer (file system interactions)
3. Finally wizard flow (orchestration)

---

## Running Tests

```bash
# Run all setup tests (Green + Red)
npm test -- tests/unit/setup tests/integration/setup

# Run only Green phase tests (implemented)
npm test -- tests/unit/setup/validators tests/unit/setup/writers tests/integration/setup

# Run only Red phase tests (unimplemented)
npm test -- tests/unit/setup/handlers tests/unit/setup/utils

# Run specific validator tests
npm test -- tests/unit/setup/validators/bluesky-validator.spec.ts

# Run with coverage
npm test -- --coverage tests/unit/setup
```

## Implementation Order (for Implementer)

### Red Phase → Green Phase

1. **Signal Handler** (`packages/setup/src/handlers/signal-handler.ts`)
   - Implement `promptCancellationConfirmation()` using inquirer
   - Implement `installSignalHandler()` with process.on('SIGINT')
   - Implement `removeSignalHandler()` cleanup
   - Integrate with wizard flow in `index.ts`

2. **Script Validator** (`packages/setup/src/utils/script-validator.ts`)
   - Implement `validateMacOSScript()` using MACOS_PATTERNS
   - Implement `validateWindowsScript()` using WINDOWS_PATTERNS
   - Return proper `ScriptValidationResult` objects
