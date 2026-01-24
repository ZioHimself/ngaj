# Application Launcher - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-011: Installation and Setup Architecture](../../../docs/architecture/decisions/011-installation-and-setup.md) (Section: Application Launcher)
🔗 **Technical Specs**: [Design Document Section 7](../designs/installation-setup-design.md#7-application-launcher-day-2-restart)

**Date**: 2026-01-24
**Feature**: Application Launcher for Day-2 Restart Experience

---

## Overview

The application launcher enables users to restart ngaj after installation (e.g., after laptop reboot) via a clickable app icon, similar to other desktop applications.

**User Flow**: Click ngaj icon → Terminal opens with status → Browser opens to dashboard

---

## Test Categories

### 1. Start Script Logic (Unit Tests)

Test the core logic of the start scripts. These can be tested via shell/PowerShell unit testing or by extracting testable functions.

#### 1.1 Docker Detection

| Test | Input | Expected |
|------|-------|----------|
| Docker running | `docker info` succeeds | Skip Docker Desktop launch, proceed |
| Docker not running | `docker info` fails | Launch Docker Desktop, wait for daemon |
| Docker daemon timeout | Daemon doesn't start in 60s | Show error message |

#### 1.2 Service Startup

| Test | Input | Expected |
|------|-------|----------|
| Services not running | Fresh start | `docker compose up -d` starts all containers |
| Services already running | Re-click while running | `docker compose up -d` is idempotent, no restart |
| Partial services running | Some containers stopped | Missing containers start |

#### 1.3 LAN IP Detection (macOS)

| Test | Scenario | Expected |
|------|----------|----------|
| WiFi connected (en0) | `ipconfig getifaddr en0` returns IP | Use WiFi IP |
| Ethernet only (en1) | en0 fails, en1 returns IP | Use Ethernet IP |
| No network | All interfaces fail | Fall back to "localhost" |
| VPN active | VPN interface returns 10.x.x.x | Use VPN IP (acceptable) |

#### 1.4 LAN IP Detection (Windows)

| Test | Scenario | Expected |
|------|----------|----------|
| WiFi connected | Get-NetIPAddress returns Wi-Fi IP | Use WiFi IP |
| Ethernet only | No Wi-Fi, Ethernet available | Use Ethernet IP |
| APIPA only | Only 169.254.x.x available | Fall back to "localhost" |
| Multiple interfaces | WiFi + Ethernet | Prefer WiFi |

#### 1.5 Login Code Reading

| Test | .env Content | Expected |
|------|--------------|----------|
| Valid .env | `LOGIN_SECRET=A1B2-C3D4` | Display "A1B2-C3D4" |
| Missing LOGIN_SECRET | Other vars but no LOGIN_SECRET | Display empty or skip line |
| Missing .env file | File doesn't exist | Display empty or skip line |
| Malformed .env | Invalid format | Handle gracefully |

---

### 2. Graceful Shutdown (Unit Tests)

#### 2.1 Ctrl+C Handler

| Test | Action | Expected |
|------|--------|----------|
| User presses Ctrl+C | SIGINT received | Display "Stopping ngaj...", run `docker compose down`, exit 0 |
| Containers fail to stop | `docker compose down` times out | Show error, exit non-zero |

#### 2.2 Terminal Close (macOS)

| Test | Action | Expected |
|------|--------|----------|
| User closes Terminal window | Window closed | Script terminates (containers continue in background) |

---

### 3. End-to-End Scenarios (Integration/E2E Tests)

These require actual Docker environment and may be manual or CI-specific.

#### 3.1 Cold Start (After Laptop Reboot)

**Preconditions**: Docker Desktop not running, ngaj containers stopped

**Steps**:
1. Click ngaj.app icon (macOS) or Start Menu shortcut (Windows)
2. Observe Terminal window opens
3. Wait for startup sequence

**Expected**:
- Terminal shows "Starting Docker Desktop..."
- Terminal shows "Waiting for Docker daemon..."
- Terminal shows "✓ Docker is ready"
- Terminal shows "Waiting for services..."
- Terminal clears and shows status block with Dashboard URL and Login code
- Browser opens to network URL (not localhost)

#### 3.2 Warm Start (Services Already Running)

**Preconditions**: Docker running, ngaj containers running

**Steps**:
1. Click ngaj.app icon

**Expected**:
- No "Starting Docker Desktop..." message
- Fast startup (< 3 seconds)
- Browser opens
- Status display shows same info

#### 3.3 Restart After Ctrl+C

**Preconditions**: Previous session stopped via Ctrl+C

**Steps**:
1. Click ngaj.app icon

**Expected**:
- Containers restart
- Full status display
- Browser opens

---

### 4. File System Validation (Integration Tests)

#### 4.1 macOS App Bundle

**Test**: Verify app bundle structure after installation

```
/Applications/ngaj.app/
  Contents/
    MacOS/ngaj-launcher     # Exists, executable
    Info.plist              # Valid plist, correct CFBundleName
    Resources/icon.icns     # Exists, valid icns format
```

**Assertions**:
- `ngaj-launcher` has execute permission (`chmod +x`)
- `Info.plist` is valid XML
- App appears in Launchpad/Spotlight

#### 4.2 Start Script

**Test**: Verify start script exists and is valid

**macOS**:
- `~/.ngaj/scripts/ngaj-start.sh` exists
- Has execute permission
- Contains required functions (detect_lan_ip, cleanup)

**Windows**:
- `%LOCALAPPDATA%\ngaj\scripts\ngaj-start.ps1` exists
- PowerShell syntax is valid

#### 4.3 Windows Start Menu Shortcut

**Test**: Verify shortcut exists and points correctly

- Shortcut at `%APPDATA%\Microsoft\Windows\Start Menu\Programs\ngaj.lnk`
- Target: `powershell.exe` with correct arguments
- Icon: Points to valid .ico file

---

### 5. Error Handling (Unit Tests)

#### 5.1 Docker Desktop Not Installed

| Test | Scenario | Expected |
|------|----------|----------|
| Docker binary missing | `command -v docker` fails | Show error: "Docker not found. Please install Docker Desktop." |

#### 5.2 Health Check Timeout

| Test | Scenario | Expected |
|------|----------|----------|
| Backend never healthy | `/health` returns non-200 for 60s | Show error: "Services failed to start. Check logs." |

#### 5.3 Port Conflict

| Test | Scenario | Expected |
|------|----------|----------|
| Port 3000 in use | Another app on 3000 | `docker compose up` fails, error displayed |

---

## Acceptance Criteria

### Must Pass (P0)

1. ✅ Clicking ngaj icon opens Terminal window
2. ✅ Docker Desktop starts if not running
3. ✅ All containers start successfully
4. ✅ Browser opens to correct URL
5. ✅ Login code displayed in Terminal
6. ✅ Network IP displayed (not just localhost)
7. ✅ Ctrl+C stops containers gracefully
8. ✅ Re-clicking while running is fast and idempotent

### Should Pass (P1)

1. ✅ App appears in Launchpad/Spotlight (macOS)
2. ✅ App appears in Start Menu search (Windows)
3. ✅ Graceful handling when no network available
4. ✅ Clear error message if Docker not installed

### Nice to Have (P2)

1. ✅ Works with VPN active (uses VPN IP)
2. ✅ Handles multiple network interfaces correctly

---

## Test Environment Requirements

- **macOS**: macOS 10.15+ with Docker Desktop installed
- **Windows**: Windows 10+ with Docker Desktop installed
- **Docker**: Docker Desktop 4.x with Docker Compose v2

---

## Dependencies to Mock

For unit tests that don't require real Docker:

| Dependency | Mock Strategy |
|------------|---------------|
| `docker info` | Exit code 0 (running) or non-zero (not running) |
| `docker compose up -d` | Exit code 0 (success) |
| `docker compose down` | Exit code 0 (success) |
| `curl /health` | HTTP 200 (healthy) or timeout |
| `ipconfig getifaddr` | Return mock IP or empty |
| File reads (`.env`) | Provide test fixture |

---

## Out of Scope for v0.1

- Auto-start on login
- Menu bar / system tray status indicator
- GUI-based stop button
- Linux launcher (.desktop file)
