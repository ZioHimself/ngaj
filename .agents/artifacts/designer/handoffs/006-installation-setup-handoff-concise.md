# Installation & Setup - Test Handoff (Concise)

**References**: [ADR-011](../../../../docs/architecture/decisions/011-installation-and-setup.md) | [Design Doc](../designs/installation-setup-design.md) | [Types](../../../../packages/setup/src/)

---

## Scope

### In Scope
- Setup wizard CLI (`@ngaj/setup`) - credential prompts, validation, `.env` writing
- Bluesky credential validation (format + connection test)
- Claude API key validation (format + connection test)

### Out of Scope (v0.1)
- Native installer scripts (shell/PowerShell) - manual testing only
- Docker installation flow - covered by installer scripts
- Production service startup - Docker Compose handles this

---

## Unit Tests: Setup Wizard

**Location**: `tests/unit/setup/`

### 1. Bluesky Handle Validation

```typescript
// Test: Format validation
expect(validateBlueskyHandle('@user.bsky.social')).toBe(true);
expect(validateBlueskyHandle('user.bsky.social')).toBe(false);  // missing @
expect(validateBlueskyHandle('@user')).toBe(false);              // missing domain
```

### 2. Bluesky App Password Validation

```typescript
// Test: Format validation (xxxx-xxxx-xxxx-xxxx)
expect(validateAppPassword('abcd-efgh-ijkl-mnop')).toBe(true);
expect(validateAppPassword('invalid')).toBe(false);
```

### 3. Claude API Key Validation

```typescript
// Test: Format validation (starts with sk-ant-)
expect(validateAnthropicKey('sk-ant-api03-xxxxx')).toBe(true);
expect(validateAnthropicKey('sk-openai-xxxxx')).toBe(false);
```

### 4. Credential Validation (Connection Tests)

```typescript
// Test: Bluesky connection
// Mock @atproto/api BskyAgent.login()
// Success → { valid: true }
// Invalid creds → { valid: false, errorCode: 'AUTH_FAILED' }
// Network error → { valid: false, errorCode: 'NETWORK_ERROR' }

// Test: Anthropic connection
// Mock @anthropic-ai/sdk messages.create()
// Success → { valid: true }
// Invalid key → { valid: false, errorCode: 'AUTH_FAILED' }
```

### 5. Env File Writer

```typescript
// Test: Writes correct format
const config: SetupConfiguration = {
  platformCredentials: [{ platform: 'bluesky', handle: '@test.bsky.social', appPassword: 'xxxx-xxxx-xxxx-xxxx' }],
  aiCredentials: { provider: 'anthropic', apiKey: 'sk-ant-xxxxx' },
  completedAt: new Date()
};

await writeEnvFile(config);

// Verify file contains:
// BLUESKY_HANDLE=@test.bsky.social
// BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
// ANTHROPIC_API_KEY=sk-ant-xxxxx
```

---

## Integration Tests: Setup Flow

**Location**: `tests/integration/setup/`

### 1. Complete Wizard Flow (Mocked I/O)

Mock `inquirer.prompt()` to simulate user input:

```typescript
// Given: Mock user inputs valid credentials
// When: runSetupWizard() executes
// Then: .env file written with correct content
```

### 2. Validation Retry Loop

```typescript
// Given: First credential invalid, second valid
// When: Wizard prompts for credentials
// Then: Re-prompts after first failure, succeeds on second
```

### 3. User Cancellation

```typescript
// Given: User sends SIGINT (Ctrl+C)
// When: Wizard is running
// Then: Throws 'USER_CANCELLED' error, no .env file created
```

---

## Key Types

From `packages/shared/src/types/setup.ts`:

| Type | Purpose |
|------|---------|
| `BlueskyCredentials` | Handle + app password |
| `AnthropicCredentials` | API key |
| `SetupConfiguration` | Full config to write |
| `CredentialValidationResult` | Validation response |
| `CREDENTIAL_PATTERNS` | Regex patterns |

---

## Test Data

**Valid**:
- Bluesky: `@test.bsky.social`, `abcd-efgh-ijkl-mnop`
- Claude: `sk-ant-api03-test-key`

**Invalid**:
- Bluesky handle: `user.bsky.social`, `@user`, `@user@domain.com`
- App password: `wrong`, `12345678`
- Claude key: `sk-openai-xxx`, `invalid-key`

---

## Acceptance Criteria

✅ Format validation catches invalid inputs before connection test  
✅ Connection test validates credentials against real APIs (mocked in tests)  
✅ Re-prompt on validation failure (don't exit)  
✅ `.env` file written only after all credentials validated  
✅ No partial `.env` file on cancellation  
✅ Error codes match `CredentialValidationErrorCode` enum

---

## Files to Create

```
tests/
├── unit/
│   └── setup/
│       ├── validators/
│       │   ├── bluesky.spec.ts
│       │   └── anthropic.spec.ts
│       └── writers/
│           └── env-writer.spec.ts
└── integration/
    └── setup/
        └── wizard-flow.spec.ts
```
