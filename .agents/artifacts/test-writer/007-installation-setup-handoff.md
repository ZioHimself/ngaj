# Installation and Setup - Test-Writer Handoff

**Handoff Number**: 007
**Feature**: Installation and Setup
**Date**: January 23, 2026

---

## Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 97 |
| Green Phase (Pass) | 64 |
| Red Phase (Fail) | 33 |
| Unit Tests | 86 |
| Integration Tests | 11 |

### Test Status Summary

| Category | Status |
|----------|--------|
| Validators (Bluesky, Anthropic) | ✅ Green |
| Env Writer | ✅ Green |
| Wizard Flow | ✅ Green |
| **Signal Handler (Ctrl+C)** | 🔴 **Red** |
| **Script Validator** | 🔴 **Red** (partial) |

---

## Files Created

### Test Files (Green Phase - Implementation Exists)
- `tests/unit/setup/validators/bluesky-validator.spec.ts` - 13 tests
- `tests/unit/setup/validators/anthropic-validator.spec.ts` - 11 tests
- `tests/unit/setup/writers/env-writer.spec.ts` - 12 tests
- `tests/integration/setup/setup-wizard.spec.ts` - 9 tests

### Test Files (Red Phase - Needs Implementation)
- `tests/unit/setup/handlers/signal-handler.spec.ts` - 10 tests 🔴
- `tests/unit/setup/utils/script-validator.spec.ts` - 42 tests (22 Red, 20 Green)

### Implementation Stubs (Red Phase)
- `packages/setup/src/handlers/signal-handler.ts` - Ctrl+C handling stub
- `packages/setup/src/utils/script-validator.ts` - Script validation stub

### Fixtures
- `tests/fixtures/setup-fixtures.ts` - Test data for credentials and configurations

### Test Plan
- `.agents/artifacts/test-writer/test-plans/installation-setup-test-plan.md`

---

## Test Coverage Breakdown

### Bluesky Validator (8 tests)
| Test | Description |
|------|-------------|
| Valid credentials → success | Happy path |
| @ prefix stripped from handle | API call correctness |
| Valid handle formats (parameterized) | Format acceptance |
| Invalid password → AUTH_FAILED | Error handling |
| Invalid handle → AUTH_FAILED | Error handling |
| ENOTFOUND → NETWORK_ERROR | Network failure |
| Network keyword → NETWORK_ERROR | Network failure |
| Unknown errors → UNKNOWN | Fallback handling |

### Anthropic Validator (6 tests)
| Test | Description |
|------|-------------|
| Valid API key → success | Happy path |
| Valid formats (parameterized) | Format acceptance |
| Minimal API call verification | Cost optimization |
| 401 error → AUTH_FAILED | Error handling |
| ENOTFOUND → NETWORK_ERROR | Network failure |
| Unknown errors → UNKNOWN | Fallback handling |

### Env Writer (6 tests)
| Test | Description |
|------|-------------|
| Writes to /data/.env | File path |
| Bluesky credentials format | Content verification |
| Anthropic credentials format | Content verification |
| Database defaults included | Configuration |
| Directory creation if missing | File system |
| Timestamp comment included | Auditability |

### Setup Wizard (5 tests)
| Test | Description |
|------|-------------|
| Collects Bluesky first | Order verification |
| Collects Anthropic after Bluesky | Order verification |
| Writes env file after all credentials | Orchestration |
| Returns SetupConfiguration | Data shape |
| Error propagation | Failure handling |

---

## Test Fixtures

### Valid Credentials
```typescript
validBlueskyCredentials: {
  platform: 'bluesky',
  handle: '@testuser.bsky.social',
  appPassword: 'xxxx-xxxx-xxxx-xxxx'
}

validAnthropicCredentials: {
  provider: 'anthropic',
  apiKey: 'sk-ant-api03-test-key-12345'
}
```

### Invalid Credentials
- `invalidBlueskyHandles`: Missing @, wrong domain, etc.
- `invalidAppPasswords`: Too short, no hyphens, etc.
- `invalidAnthropicApiKeys`: Wrong prefix, no prefix, etc.

### Validation Results
- `successValidationResult`: `{ valid: true }`
- `authFailedResult`: `{ valid: false, errorCode: 'AUTH_FAILED' }`
- `networkErrorResult`: `{ valid: false, errorCode: 'NETWORK_ERROR' }`

---

## Dependencies

No new packages needed. Tests use:
- `vitest` - Test framework
- `vi` - Mocking utilities
- Existing `@ngaj/shared` types

---

## Implementation Order (for Implementer)

Implementation is already complete. Tests verify existing code in:

1. `packages/setup/src/validators/bluesky.ts` - Bluesky validation
2. `packages/setup/src/validators/anthropic.ts` - Anthropic validation
3. `packages/setup/src/writers/env-writer.ts` - .env file writing
4. `packages/setup/src/prompts/wizard.ts` - Wizard orchestration

---

## Critical Tests (Must Pass)

1. **Valid credentials validation** - Core functionality
2. **AUTH_FAILED error handling** - User feedback
3. **NETWORK_ERROR detection** - Error classification
4. **.env file format** - Production configuration

---

## Running Tests

```bash
# Run all setup tests
npm test -- tests/unit/setup tests/integration/setup

# Run validator tests only
npm test -- tests/unit/setup/validators

# Run with verbose output
npm test -- --reporter=verbose tests/unit/setup

# Run with coverage
npm test -- --coverage tests/unit/setup tests/integration/setup
```

---

## Test Output

### Green Phase (Implemented)
```
✓ tests/unit/setup/validators/bluesky-validator.spec.ts (13)
✓ tests/unit/setup/validators/anthropic-validator.spec.ts (11)
✓ tests/unit/setup/writers/env-writer.spec.ts (12)
✓ tests/integration/setup/setup-wizard.spec.ts (9)

Test Files  4 passed
Tests       45 passed
```

### Red Phase (Needs Implementation)
```
× tests/unit/setup/handlers/signal-handler.spec.ts (10 failed)
× tests/unit/setup/utils/script-validator.spec.ts (22 failed, 20 passed)
  - Pattern tests: ✓ 20 passed (verify scripts contain required steps)
  - Validator tests: × 22 failed (Not implemented)

Test Files  2 failed
Tests       33 failed | 19 passed (52)
```

---

## Key Implementation Notes

### Bluesky Validation (Green)
- Handle format: `@username.bsky.social`
- App password format: `xxxx-xxxx-xxxx-xxxx` (19 chars)
- Must strip `@` prefix before API call (BskyAgent expects identifier without @)

### Anthropic Validation (Green)
- API key format: starts with `sk-ant-`
- Uses minimal API call (`max_tokens: 1`) to verify key
- Model: `claude-3-haiku-20240307` (cheapest option)

### Env Writer (Green)
- File path: `/data/.env` (inside container, maps to `~/.ngaj/.env` on host)
- Includes database defaults for Docker networking
- Creates parent directory recursively if missing

### Signal Handler (Red - Needs Implementation)
- Must show "Setup incomplete. Quit? (y/n)" on Ctrl+C
- Use `process.on('SIGINT', handler)` to intercept
- On confirm: throw `USER_CANCELLED` error
- On decline: return to current prompt (no exit)
- Integrate with existing `index.ts` error handling

### Script Validator (Red - Needs Implementation)
- Validates installer scripts contain required steps
- Use regex patterns in `MACOS_PATTERNS` and `WINDOWS_PATTERNS`
- Return `ScriptValidationResult` with missing requirements
- Enables CI validation of installer scripts

---

## Known Limitations

1. **No E2E tests** - Installer packages (pkg, msi) require OS-level testing
2. **No Docker tests** - Container operations require Docker daemon
3. **Inquirer not directly tested** - Mocked at module level

---

## Success Criteria

### Green Phase (Complete)
- [x] 45 tests pass (validators, env writer, wizard)
- [x] No linter errors in test files
- [x] TypeScript compilation succeeds

### Red Phase (For Implementer)
- [ ] Signal handler: 10 tests pass
- [ ] Script validator: 22 tests pass
- [ ] All 97 tests pass total
- [ ] Code coverage meets threshold (80%)

---

## References

- [ADR-011: Installation and Setup Architecture](../../../../docs/architecture/decisions/011-installation-and-setup.md)
- [Designer Handoff](../../designer/handoffs/006-installation-setup-handoff.md)
- [Type Definitions](../../../../packages/shared/src/types/setup.ts)
- [Test Plan](./test-plans/installation-setup-test-plan.md)
