# Installation and Launcher - Test-Writer Handoff

**Handoff Number**: 010/012 (Combined)
**Date**: 2026-01-24
**Feature**: Network Access Display & Application Launcher
**Status**: Red Phase Complete

---

## Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 123 |
| Unit Tests | 78 |
| Integration Tests | 45 |
| Test Files | 6 |
| Stub Files | 6 |
| Fixtures | 1 |

---

## Files Created

### Test Files

```
tests/
├── fixtures/
│   └── launcher-fixtures.ts              # Test data and mock factories
├── unit/
│   └── launcher/
│       ├── lan-ip-detection.spec.ts      # 28 tests
│       ├── docker-detection.spec.ts      # 22 tests
│       ├── login-code-reader.spec.ts     # 18 tests
│       └── graceful-shutdown.spec.ts     # 10 tests
└── integration/
    └── launcher/
        ├── terminal-output.spec.ts       # 28 tests
        └── file-system-validation.spec.ts # 17 tests
```

### Implementation Stubs

```
packages/setup/src/utils/
├── lan-ip-detection.ts     # IP detection utilities
├── docker-manager.ts       # Docker lifecycle management
├── login-code-reader.ts    # .env file reading
├── shutdown-handler.ts     # Graceful shutdown
├── terminal-output.ts      # Terminal formatting
└── file-system-validator.ts # File structure validation
```

---

## Test Coverage Breakdown

### Unit Tests: LAN IP Detection (28 tests)

| Test | Description |
|------|-------------|
| `isValidLanIP()` | Validates IP addresses (WiFi, Ethernet, VPN) |
| `isValidLanIP()` | Rejects localhost (127.x.x.x) |
| `isValidLanIP()` | Rejects APIPA (169.254.x.x) |
| `filterInvalidIPs()` | Filters out invalid IPs from array |
| `preferWiFiOverEthernet()` | Returns WiFi when both available |
| `detectLanIP() - macOS` | WiFi connected (en0) |
| `detectLanIP() - macOS` | Ethernet only (en1 fallback) |
| `detectLanIP() - macOS` | No network interfaces |
| `detectLanIP() - macOS` | VPN active |
| `detectLanIP() - macOS` | Multiple interfaces |
| `detectLanIP() - Windows` | WiFi connected |
| `detectLanIP() - Windows` | Ethernet only |
| `detectLanIP() - Windows` | No network |
| `detectLanIP() - Windows` | APIPA only |
| `detectLanIP() - Windows` | WiFi preferred over Ethernet |
| Edge cases | IPv6 filtering, malformed IPs, errors |

### Unit Tests: Docker Detection (22 tests)

| Test | Description |
|------|-------------|
| `checkDockerRunning()` | Docker running (exit code 0) |
| `checkDockerRunning()` | Docker not running |
| `checkDockerRunning()` | Docker not installed |
| `startDockerDesktop()` | macOS launch |
| `startDockerDesktop()` | Windows launch |
| `waitForDockerDaemon()` | Success after retry |
| `waitForDockerDaemon()` | Timeout after 60s |
| `waitForDockerDaemon()` | Skip launch if running |
| `startServices()` | Fresh start |
| `startServices()` | Already running (idempotent) |
| `startServices()` | Partial running |
| `startServices()` | Port conflict |
| `stopServices()` | Graceful shutdown |
| `stopServices()` | Timeout handling |
| `waitForHealthCheck()` | Success after retry |
| `waitForHealthCheck()` | Timeout with error |

### Unit Tests: Login Code Reader (18 tests)

| Test | Description |
|------|-------------|
| `readLoginCode()` | Valid .env with LOGIN_SECRET |
| `readLoginCode()` | Missing LOGIN_SECRET |
| `readLoginCode()` | Missing .env file |
| `readLoginCode()` | Malformed .env |
| `readLoginCode()` | Empty .env |
| `parseEnvFile()` | Parse standard format |
| `parseEnvFile()` | Ignore comments |
| `parseEnvFile()` | Handle quotes |
| `parseEnvFile()` | Values with equals |
| `parseEnvFile()` | Windows line endings |
| Edge cases | File permissions, position in file |

### Unit Tests: Graceful Shutdown (10 tests)

| Test | Description |
|------|-------------|
| `installShutdownHandler()` | Register SIGINT handler |
| `installShutdownHandler()` | Register SIGTERM handler |
| `installShutdownHandler()` | Return cleanup function |
| Ctrl+C Behavior | Display "Stopping ngaj..." |
| Ctrl+C Behavior | Run docker compose down |
| Ctrl+C Behavior | Exit code 0 on success |
| `removeShutdownHandler()` | Unregister handlers |
| `handleShutdown()` | Success result |
| `handleShutdown()` | Failure result |
| Edge cases | Multiple SIGINT, partial state |

### Integration Tests: Terminal Output (28 tests)

| Test | Description |
|------|-------------|
| `formatNetworkAccessDisplay()` | With network - all elements |
| `formatNetworkAccessDisplay()` | Without network - localhost only |
| `formatNetworkAccessDisplay()` | IP changes between runs |
| `formatStatusDisplay()` | Network + auth combined |
| `formatStatusDisplay()` | Proper spacing |
| `formatStatusDisplay()` | Without login code |
| `formatStatusDisplay()` | Without network |
| `formatLoginCodeDisplay()` | Format and hint |
| `createTerminalOutput()` | Full output creation |
| Cold start output | Message sequence |
| Edge cases | Custom ports, special characters |

### Integration Tests: File System Validation (17 tests)

| Test | Description |
|------|-------------|
| `validateMacOSAppBundle()` | Launcher exists |
| `validateMacOSAppBundle()` | Execute permission |
| `validateMacOSAppBundle()` | Info.plist valid |
| `validateMacOSAppBundle()` | Icon exists |
| `validateMacOSStartScript()` | Script exists |
| `validateMacOSStartScript()` | Contains functions |
| `validateWindowsShortcut()` | Shortcut exists |
| `validateWindowsShortcut()` | Target correct |
| `validateWindowsShortcut()` | Arguments correct |
| `validateWindowsStartScript()` | Script exists |
| `validateWindowsStartScript()` | Syntax valid |
| `parseInfoPlist()` | Parse all keys |
| Edge cases | Missing files, permissions, paths |

---

## Test Fixtures

### `tests/fixtures/launcher-fixtures.ts`

Provides:
- Valid/invalid IP addresses
- macOS network interface mocks
- Windows network interface mocks
- Docker command response mocks
- .env file content mocks
- Terminal output patterns
- File system path constants
- Factory functions for test data

---

## Dependencies Installed

None - all tests use Vitest built-in mocking (`vi.fn()`, `vi.mock()`)

---

## Implementation Order (Recommended)

1. **lan-ip-detection.ts** - No dependencies
2. **login-code-reader.ts** - No dependencies
3. **docker-manager.ts** - Core functionality
4. **shutdown-handler.ts** - Uses docker-manager
5. **terminal-output.ts** - Uses lan-ip-detection, login-code-reader
6. **file-system-validator.ts** - Can be done last

---

## Critical Tests (Must Pass)

1. `detectLanIP()` returns valid IP when network available
2. `detectLanIP()` returns empty string gracefully when no network
3. `formatNetworkAccessDisplay()` shows correct URLs
4. `checkDockerRunning()` correctly detects Docker state
5. `startServices()` runs docker compose up -d
6. `readLoginCode()` extracts LOGIN_SECRET from .env
7. `handleShutdown()` runs docker compose down

---

## Running Tests

```bash
# All launcher tests
npm test -- tests/unit/launcher tests/integration/launcher

# With watch mode
npm test -- --watch tests/unit/launcher tests/integration/launcher

# With coverage
npm test -- --coverage tests/unit/launcher tests/integration/launcher
```

---

## Expected Red Phase Output

```
FAIL tests/unit/launcher/lan-ip-detection.spec.ts
FAIL tests/unit/launcher/docker-detection.spec.ts
FAIL tests/unit/launcher/login-code-reader.spec.ts
FAIL tests/unit/launcher/graceful-shutdown.spec.ts
FAIL tests/integration/launcher/terminal-output.spec.ts
FAIL tests/integration/launcher/file-system-validation.spec.ts

Test Suites: 6 failed, 6 total
Tests:       123 failed, 123 total
```

All failures should be `Error: Not implemented` from stubs.

---

## Key Implementation Notes

### IP Validation Rules

```typescript
// Valid LAN IPs
192.168.x.x  // Private Class C
10.x.x.x     // Private Class A (including VPN)
172.16-31.x.x // Private Class B

// Invalid (exclude)
127.x.x.x    // Localhost
169.254.x.x  // APIPA (link-local)
```

### Docker Commands

```bash
# Check running
docker info

# Start services (idempotent)
docker compose up -d

# Stop services
docker compose down

# Health check
curl -s http://localhost:3000/health
```

### .env Parsing

```
# Comment lines start with #
KEY=value
KEY="quoted value"
KEY=value=with=equals
```

### Terminal Output Format

```
✓ Backend running

  Local access:   http://localhost:3000
  Network access: http://192.168.1.42:3000
  (Use this URL from your mobile device on the same WiFi)

  Login code: A1B2-C3D4-E5F6-G7H8
  (Enter this code when prompted in your browser)
```

---

## Out of Scope

- Auto-start on login
- System tray indicator
- Linux support
- QR code generation
- Web UI network display

---

## Success Criteria

- [ ] All 123 tests pass
- [ ] No linter errors
- [ ] TypeScript compiles
- [ ] Coverage > 80%
- [ ] Manual verification on macOS/Windows

---

## References

- [Test Plan](./test-plans/installation-launcher-test-plan.md)
- [ADR-011](../../docs/architecture/decisions/011-installation-and-setup.md)
- [010-network-access-display-handoff](../designer/handoffs/010-network-access-display-handoff.md)
- [012-application-launcher-handoff](../designer/handoffs/012-application-launcher-handoff.md)
