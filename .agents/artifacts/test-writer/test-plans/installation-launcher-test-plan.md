# Installation and Launcher Test Plan

**Handoff Number**: 010/012 (Combined)
**Date**: 2026-01-24
**Feature**: Network Access Display & Application Launcher
**Status**: Red Phase (Tests Written, Implementation Pending)

---

## Overview

This test plan covers two related installation and setup features:

1. **Network Access Display (010)** - LAN IP detection and display for mobile access
2. **Application Launcher (012)** - Day-2 restart experience with clickable app icon

Both features share common infrastructure (start scripts, terminal output) and are tested together.

---

## Test Coverage Summary

### Statistics

| Category | Tests | Files |
|----------|-------|-------|
| Unit Tests | 78 | 4 |
| Integration Tests | 45 | 2 |
| **Total** | **123** | **6** |

### Test Categories

#### Unit Tests (`tests/unit/launcher/`)

1. **lan-ip-detection.spec.ts** (28 tests)
   - IP validation (valid LAN, localhost, APIPA exclusion)
   - IP filtering logic
   - Interface preference (WiFi over Ethernet)
   - macOS detection (en0/en1 interfaces)
   - Windows detection (Get-NetIPAddress)
   - Edge cases (VPN, multiple interfaces, no network)

2. **docker-detection.spec.ts** (22 tests)
   - Docker running check
   - Docker not installed handling
   - Docker Desktop launch (macOS/Windows)
   - Wait for Docker daemon with timeout
   - Service startup (docker compose up -d)
   - Port conflict detection
   - Health check waiting

3. **login-code-reader.spec.ts** (18 tests)
   - Reading LOGIN_SECRET from .env
   - Missing .env handling
   - Missing LOGIN_SECRET handling
   - Malformed .env handling
   - .env parsing (comments, quotes, special characters)

4. **graceful-shutdown.spec.ts** (10 tests)
   - SIGINT/SIGTERM handler installation
   - Ctrl+C shutdown sequence
   - docker compose down execution
   - Exit codes
   - Terminal close behavior

#### Integration Tests (`tests/integration/launcher/`)

1. **terminal-output.spec.ts** (28 tests)
   - Network access display formatting
   - Login code display formatting
   - Combined output (network + auth)
   - Output consistency across runs
   - Cold start message sequence

2. **file-system-validation.spec.ts** (17 tests)
   - macOS app bundle structure
   - macOS start script validation
   - Windows Start Menu shortcut
   - Windows start script validation
   - Info.plist parsing

---

## Mock Strategy

### External Dependencies Mocked

| Dependency | Mock Strategy | Rationale |
|------------|---------------|-----------|
| `docker info` | Exit code simulation | Test Docker detection without Docker |
| `docker compose` | Exit code + output | Test service lifecycle |
| `ipconfig getifaddr` | Return mock IPs | Test macOS IP detection |
| `Get-NetIPAddress` | Mock address array | Test Windows IP detection |
| File system | Mock read/write/exists | Test file operations |
| `curl /health` | Mock responses | Test health check logic |
| Process signals | `vi.spyOn(process, 'on')` | Test shutdown handlers |

### Test Data

All test data is centralized in `tests/fixtures/launcher-fixtures.ts`:
- Valid/invalid IP addresses
- Mock network interface data (macOS/Windows)
- Docker command responses
- .env file content variations
- Terminal output patterns
- File system paths

---

## Test Priorities

### Critical Path (Must Pass - P0)

1. ✅ LAN IP detection returns valid IP when network available
2. ✅ Graceful handling when no network (no crash, empty string)
3. ✅ Terminal output displays network URL correctly
4. ✅ Docker running detection works
5. ✅ Service startup via docker compose up -d
6. ✅ Login code reading from .env
7. ✅ Ctrl+C triggers graceful shutdown
8. ✅ Browser opens to correct URL

### Important (Should Pass - P1)

1. ✅ WiFi preferred over Ethernet
2. ✅ APIPA addresses excluded (169.254.x.x)
3. ✅ Localhost addresses excluded (127.x.x.x)
4. ✅ Detection runs on every backend start
5. ✅ App bundle structure valid (macOS)
6. ✅ Start Menu shortcut correct (Windows)
7. ✅ docker compose up -d is idempotent

### Nice to Have (P2)

1. ✅ VPN IP handling (acceptable to show VPN IP)
2. ✅ Multiple interface selection
3. ✅ Info.plist parsing
4. ✅ PowerShell syntax validation

---

## Test Organization

```
tests/
├── fixtures/
│   └── launcher-fixtures.ts          # Test data for all launcher tests
├── unit/
│   └── launcher/
│       ├── lan-ip-detection.spec.ts  # IP detection logic
│       ├── docker-detection.spec.ts  # Docker management
│       ├── login-code-reader.spec.ts # .env reading
│       └── graceful-shutdown.spec.ts # Shutdown handling
└── integration/
    └── launcher/
        ├── terminal-output.spec.ts   # Output formatting
        └── file-system-validation.spec.ts # File structure
```

---

## Implementation Stubs Created

All stubs are in `packages/setup/src/utils/`:

1. **lan-ip-detection.ts**
   - `isValidLanIP()` - IP validation
   - `filterInvalidIPs()` - IP filtering
   - `preferWiFiOverEthernet()` - Interface preference
   - `detectLanIP()` - Main detection function

2. **docker-manager.ts**
   - `checkDockerRunning()` - Docker status check
   - `startDockerDesktop()` - Launch Docker Desktop
   - `waitForDockerDaemon()` - Wait with timeout
   - `startServices()` - docker compose up
   - `stopServices()` - docker compose down
   - `waitForHealthCheck()` - Health check polling

3. **login-code-reader.ts**
   - `readLoginCode()` - Read from .env
   - `parseEnvFile()` - Parse .env content

4. **shutdown-handler.ts**
   - `installShutdownHandler()` - Register signal handlers
   - `removeShutdownHandler()` - Cleanup handlers
   - `handleShutdown()` - Shutdown logic

5. **terminal-output.ts**
   - `formatNetworkAccessDisplay()` - Network section
   - `formatLoginCodeDisplay()` - Login code section
   - `formatStatusDisplay()` - Combined output
   - `createTerminalOutput()` - Full output creation

6. **file-system-validator.ts**
   - `validateMacOSAppBundle()` - App bundle validation
   - `validateMacOSStartScript()` - Script validation
   - `validateWindowsShortcut()` - Shortcut validation
   - `validateWindowsStartScript()` - Script validation
   - `parseInfoPlist()` - Plist parsing

---

## Running Tests

### All Launcher Tests

```bash
npm test -- tests/unit/launcher tests/integration/launcher
```

### Individual Test Files

```bash
# LAN IP detection
npm test -- tests/unit/launcher/lan-ip-detection.spec.ts

# Docker management
npm test -- tests/unit/launcher/docker-detection.spec.ts

# Login code
npm test -- tests/unit/launcher/login-code-reader.spec.ts

# Shutdown handling
npm test -- tests/unit/launcher/graceful-shutdown.spec.ts

# Terminal output
npm test -- tests/integration/launcher/terminal-output.spec.ts

# File system validation
npm test -- tests/integration/launcher/file-system-validation.spec.ts
```

### With Coverage

```bash
npm test -- --coverage tests/unit/launcher tests/integration/launcher
```

---

## Expected Red Phase Output

All tests should fail with "Not implemented" errors:

```
FAIL tests/unit/launcher/lan-ip-detection.spec.ts
  ✗ isValidLanIP() should return true for valid WiFi IP
      Error: Not implemented
  ✗ detectLanIP() should detect IP from en0 interface
      Error: Not implemented
  ...

Test Suites: 6 failed, 6 total
Tests:       123 failed, 123 total
```

---

## Implementation Order (Recommended)

For the Implementer Agent:

1. **lan-ip-detection.ts** (Standalone, no dependencies)
   - Implement `isValidLanIP()` first
   - Then `filterInvalidIPs()`
   - Then `preferWiFiOverEthernet()`
   - Finally `detectLanIP()` with platform switching

2. **login-code-reader.ts** (Standalone)
   - Implement `parseEnvFile()` first
   - Then `readLoginCode()`

3. **docker-manager.ts** (Core functionality)
   - Start with `checkDockerRunning()`
   - Then `startDockerDesktop()`
   - Then `waitForDockerDaemon()`
   - Then `startServices()` / `stopServices()`
   - Finally `waitForHealthCheck()`

4. **shutdown-handler.ts** (Depends on docker-manager)
   - Implement all functions together

5. **terminal-output.ts** (Depends on lan-ip-detection, login-code-reader)
   - Implement formatting functions
   - Then `createTerminalOutput()`

6. **file-system-validator.ts** (Can be done last)
   - Implement validation functions
   - Then `parseInfoPlist()`

---

## Known Limitations

### Out of Scope (v0.1)

- Auto-start on login
- Menu bar / system tray status indicator
- GUI-based stop button
- Linux launcher (.desktop file)
- QR code generation for network URL
- Web UI display of network URL

### Test Environment Notes

- Shell script testing is limited to logic extraction
- PowerShell syntax validation requires PowerShell parser
- E2E tests with real Docker require CI environment
- File system tests use mocks (no real file operations)

---

## Success Criteria

Implementation is complete when:

1. ✅ All 123 tests pass (Green phase)
2. ✅ No linter errors in implementation files
3. ✅ TypeScript compiles without errors
4. ✅ Test coverage > 80% for new code
5. ✅ Manual testing confirms:
   - Clicking app icon opens Terminal (macOS)
   - Clicking shortcut opens PowerShell (Windows)
   - Network URL displayed correctly
   - Login code displayed correctly
   - Ctrl+C stops containers gracefully

---

## References

- [ADR-011: Installation and Setup Architecture](../../../docs/architecture/decisions/011-installation-and-setup.md)
- [Design Document](../designer/designs/installation-setup-design.md)
- [010-network-access-display-handoff.md](../designer/handoffs/010-network-access-display-handoff.md)
- [012-application-launcher-handoff.md](../designer/handoffs/012-application-launcher-handoff.md)
- [Type Definitions](../../../packages/shared/src/types/setup.ts)
