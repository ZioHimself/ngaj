# Installation and Setup - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-011: Installation and Setup Architecture](../../../../docs/architecture/decisions/011-installation-and-setup.md)
🔗 **Technical Specs**: [Design Document](../designs/installation-setup-design.md)

## Overview

The installation and setup system provides zero-prerequisites installation for non-technical users. Testing must verify the complete flow: Docker installation → setup container wizard → credential validation → production services startup. Focus on OS-specific scripts (macOS/Windows), containerized wizard behavior, and error handling.

**Terminology**: "Platform" = Social Network (Bluesky). "OS" = Operating System (macOS, Windows).

---

## 1. Test Scope

### In Scope
- ✅ Docker Desktop detection and installation (macOS, Windows)
- ✅ Setup container pull and execution
- ✅ Interactive CLI wizard (prompts, validation, credential writing)
- ✅ Bluesky credential validation (format, connection test)
- ✅ Claude API key validation (format, connection test)
- ✅ `.env` file creation and formatting
- ✅ Production services startup (Docker Compose)
- ✅ Health checks and service readiness
- ✅ Error handling and recovery paths
- ✅ Browser launch after successful installation

### Out of Scope (for v0.1)
- ❌ Uninstaller (manual cleanup only)
- ❌ Update mechanism (deferred to v0.2)
- ❌ Pre-flight checks (port conflicts, disk space - deferred to v0.2)
- ❌ Automatic rollback on failure
- ❌ Linux support (deferred to v0.5)
- ❌ Offline installation mode

---

## 2. Test Scenarios

### 2.1 Unit Tests: OS-Specific Scripts

See [Design Doc Section 3](../designs/installation-setup-design.md#3-platform-specific-scripts) for script responsibilities.

#### Scenario 2.1.1: Docker Detection (macOS)

**Given**: macOS system with Docker Desktop installed
**When**: Post-install script runs
**Then**: Detects Docker and skips download

**Acceptance Criteria**:
- [ ] Script checks for `docker` command
- [ ] If found, proceeds to setup container launch
- [ ] No download attempt made

**Edge Cases**:
- Docker installed but daemon not running → Wait for daemon, then proceed
- Docker command exists but not functional → Treat as missing, download

---

#### Scenario 2.1.2: Docker Installation (macOS)

**Given**: macOS system without Docker Desktop
**When**: Post-install script runs
**Then**: Downloads and installs Docker Desktop

**Acceptance Criteria**:
- [ ] Downloads Docker Desktop DMG from official source
- [ ] Mounts DMG and copies Docker.app to /Applications
- [ ] Unmounts DMG and cleans up temp files
- [ ] Waits for Docker daemon to be ready
- [ ] Verifies Docker is functional (`docker info` succeeds)

**Edge Cases**:
- Download fails (network error) → Show error with manual download link
- Installation timeout → Show error, suggest restart
- Disk space insufficient → Show error with cleanup instructions

---

#### Scenario 2.1.3: Docker Detection (Windows)

**Given**: Windows system with Docker Desktop installed
**When**: Post-install script runs
**Then**: Detects Docker and skips download

**Acceptance Criteria**:
- [ ] Script checks for `docker` command via PowerShell
- [ ] If found, proceeds to setup container launch
- [ ] No download attempt made

**Edge Cases**: Same as macOS (daemon not running, command exists but broken)

---

#### Scenario 2.1.4: Docker Installation (Windows)

**Given**: Windows system without Docker Desktop
**When**: Post-install script runs
**Then**: Downloads and installs Docker Desktop silently

**Acceptance Criteria**:
- [ ] Downloads Docker Desktop installer from official source
- [ ] Runs installer with silent flags
- [ ] Waits for Docker service to start
- [ ] Verifies Docker is functional (`docker info` succeeds)

**Edge Cases**: Same as macOS (download fails, timeout, disk space)

---

### 2.2 Integration Tests: Setup Container Wizard

See [Design Doc Section 2](../designs/installation-setup-design.md#2-setup-container-design) for wizard flow.

#### Scenario 2.2.1: Successful Credential Collection

**Given**: Setup container running with volume mount
**When**: Wizard prompts for credentials
**Then**: Collects and validates all credentials, writes `.env` file

**Acceptance Criteria**:
- [ ] Displays welcome message
- [ ] Prompts for Bluesky handle (format validation)
- [ ] Prompts for Bluesky app password (hidden input)
- [ ] Validates Bluesky credentials (connection test)
- [ ] Prompts for Claude API key (hidden input, format validation)
- [ ] Validates Claude API key (connection test)
- [ ] Writes `.env` file to mounted volume with correct format
- [ ] `.env` file appears on host at `~/.ngaj/.env`
- [ ] Container exits successfully

**File Format Verification**:
- [ ] `.env` contains `BLUESKY_HANDLE=@user.bsky.social`
- [ ] `.env` contains `BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx`
- [ ] `.env` contains `ANTHROPIC_API_KEY=sk-ant-xxxxx`
- [ ] No extra whitespace or formatting issues

---

#### Scenario 2.2.2: Bluesky Handle Format Validation

**Given**: Setup container wizard running
**When**: User enters invalid Bluesky handle
**Then**: Shows error and re-prompts

**Acceptance Criteria**:
- [ ] Invalid format (missing `@`) → Error message, re-prompt
- [ ] Invalid format (wrong domain) → Error message, re-prompt
- [ ] Valid format → Proceeds to password prompt

**Test Cases**:
- `user.bsky.social` (missing @) → Reject
- `@user` (missing domain) → Reject
- `@user.bsky.social` → Accept
- `@user-name.bsky.social` → Accept
- `@user_name.bsky.social` → Accept

---

#### Scenario 2.2.3: Bluesky Connection Validation

**Given**: Setup container wizard running, valid handle format entered
**When**: User enters app password
**Then**: Tests connection to Bluesky API

**Acceptance Criteria**:
- [ ] Valid credentials → Connection test succeeds, proceeds to Claude prompt
- [ ] Invalid credentials → Error message with help link, re-prompt
- [ ] Network error → Error message, re-prompt (retry loop)
- [ ] Timeout → Error message with troubleshooting, re-prompt

**Test Cases**:
- Valid handle + valid password → Success
- Valid handle + invalid password → Re-prompt
- Invalid handle + any password → Re-prompt (format check should catch this first)
- Network offline → Error out with message (ngaj requires internet)

---

#### Scenario 2.2.4: Claude API Key Format Validation

**Given**: Setup container wizard running
**When**: User enters Claude API key
**Then**: Validates format and tests connection

**Acceptance Criteria**:
- [ ] Invalid format (doesn't start with `sk-ant-`) → Error message, re-prompt
- [ ] Valid format → Tests connection
- [ ] Valid key → Connection test succeeds, writes to `.env`
- [ ] Invalid key → Error message, re-prompt
- [ ] Network error → Error message, re-prompt

**Test Cases**:
- `sk-ant-api03-xxxxx` → Accept format, test connection
- `sk-ant-xxxxx` → Accept format, test connection
- `invalid-key` → Reject format
- `sk-openai-xxxxx` → Reject format (wrong prefix)

---

#### Scenario 2.2.5: User Cancellation (Ctrl+C)

**Given**: Setup container wizard running
**When**: User presses Ctrl+C
**Then**: Prompts for confirmation before exiting

**Acceptance Criteria**:
- [ ] Shows "Setup incomplete. Quit? (y/n)" prompt
- [ ] If 'y' → Container exits, no `.env` file written
- [ ] If 'n' → Returns to current prompt
- [ ] No partial `.env` file created

---

#### Scenario 2.2.6: Network Offline During Setup

**Given**: System offline (no internet connection)
**When**: Setup container tries to pull image or validate credentials
**Then**: Errors out with clear message

**Acceptance Criteria**:
- [ ] Setup container pull fails → Error message: "Internet connection required"
- [ ] Credential validation fails → Error message: "Internet connection required"
- [ ] No `.env` file written
- [ ] Installation exits with non-zero status

---

### 2.3 Integration Tests: Production Services Startup

See [Design Doc Section 4](../designs/installation-setup-design.md#4-docker-compose-configuration) for service configuration.

#### Scenario 2.3.1: Successful Service Startup

**Given**: `.env` file exists, Docker Compose ready
**When**: Post-install script runs `docker-compose up -d`
**Then**: All services start and become healthy

**Acceptance Criteria**:
- [ ] MongoDB container starts
- [ ] ChromaDB container starts
- [ ] Backend container starts
- [ ] All health checks pass
- [ ] Backend accessible at `http://localhost:3000`
- [ ] Browser opens to `http://localhost:3000`

**Health Check Verification**:
- [ ] MongoDB: TCP connection on port 27017
- [ ] ChromaDB: HTTP `GET /api/v1/heartbeat` returns 200
- [ ] Backend: HTTP `GET /health` returns 200

---

#### Scenario 2.3.2: Service Startup with Missing `.env`

**Given**: Setup wizard did not complete (no `.env` file)
**When**: Post-install script tries to start services
**Then**: Services start but backend fails health check (or handles gracefully)

**Acceptance Criteria**:
- [ ] MongoDB and ChromaDB start successfully
- [ ] Backend starts but cannot read credentials
- [ ] Backend health check fails or returns error status
- [ ] User sees error in browser (or first-launch wizard handles missing credentials)

**Note**: This scenario tests resilience - services should not crash, but should indicate setup incomplete.

---

#### Scenario 2.3.3: Port 3000 Already in Use

**Given**: Another service using port 3000
**When**: Post-install script tries to start backend
**Then**: Docker Compose fails or backend cannot bind to port

**Acceptance Criteria**:
- [ ] Error message indicates port conflict
- [ ] Suggests manual docker-compose.yml edit to change port
- [ ] Lists created files for cleanup if user wants to abort

**Note**: v0.2 will auto-detect and use alternative port. For v0.1, manual edit is acceptable.

---

### 2.4 End-to-End Tests: Complete Installation Flow

#### Scenario 2.4.1: Fresh Installation (macOS)

**Given**: Clean macOS system (no Docker, no ngaj)
**When**: User runs installer
**Then**: Complete installation succeeds

**Acceptance Criteria**:
- [ ] Installer package installs to `/Applications/ngaj/`
- [ ] Post-install script runs
- [ ] Docker Desktop downloaded and installed
- [ ] Setup container pulled and executed
- [ ] Credentials collected and validated
- [ ] `.env` file created at `~/.ngaj/.env`
- [ ] Production services started
- [ ] Browser opens to `http://localhost:3000`
- [ ] User reaches first-launch wizard (ADR-012)

**Time Target**: <10 minutes (excluding Docker download)

---

#### Scenario 2.4.2: Fresh Installation (Windows)

**Given**: Clean Windows system (no Docker, no ngaj)
**When**: User runs installer
**Then**: Complete installation succeeds

**Acceptance Criteria**: Same as macOS, with Windows paths:
- [ ] Installer installs to `C:\Program Files\ngaj\`
- [ ] `.env` file created at `C:\Users\<user>\AppData\Local\ngaj\.env`
- [ ] All other criteria same as macOS

---

#### Scenario 2.4.3: Installation with Docker Already Installed

**Given**: System with Docker Desktop already installed and running
**When**: User runs installer
**Then**: Skips Docker installation, proceeds to setup wizard

**Acceptance Criteria**:
- [ ] Detects existing Docker
- [ ] No Docker download attempt
- [ ] Proceeds directly to setup container launch
- [ ] Rest of flow same as fresh installation

---

#### Scenario 2.4.4: Installation Failure Recovery

**Given**: Installation fails at any stage
**When**: Error occurs
**Then**: Shows clear error message and cleanup instructions

**Acceptance Criteria**:
- [ ] Error message explains what failed
- [ ] Lists files/directories created so far
- [ ] Provides manual cleanup instructions
- [ ] Exits with non-zero status code

**Failure Points to Test**:
- Docker download fails
- Docker installation timeout
- Setup container pull fails
- Credential validation fails (user cancels)
- Production services startup fails

---

## 3. Test Data and Fixtures

### 3.1 Valid Test Credentials

**Bluesky**:
- Handle: `@test.bsky.social` (use test account)
- App password: Valid app password from test account

**Claude**:
- API key: Valid test API key (or mock for unit tests)

### 3.2 Invalid Test Credentials

**Bluesky**:
- Invalid handle formats: `user.bsky.social`, `@user`, `@user@domain.com`
- Invalid password: `wrong-password-1234`

**Claude**:
- Invalid formats: `invalid-key`, `sk-openai-xxxxx`
- Invalid key: `sk-ant-invalid-key-12345`

### 3.3 Mock Services

For unit tests, mock:
- Docker CLI commands (detection, pull, run)
- Bluesky API (`createSession`)
- Claude API (token count or minimal call)
- File system operations (`.env` file writing)

---

## 4. Test Environment Setup

### 4.1 Unit Tests

- Mock Docker CLI
- Mock API clients (Bluesky, Claude)
- Mock file system operations
- No actual Docker daemon required

### 4.2 Integration Tests

- Docker daemon required
- Can use Docker-in-Docker or separate test environment
- Test containers should be isolated (separate network, volumes)

### 4.3 End-to-End Tests

- Clean system (or Docker-in-Docker)
- Full Docker Desktop installation (or mocked)
- Real API calls (or test accounts)
- Actual file system operations

---

## 5. Priority and Test Coverage

### Critical Path (Must Pass)
- ✅ Docker detection and installation (both platforms)
- ✅ Setup container wizard (credential collection)
- ✅ Credential validation (format + connection)
- ✅ `.env` file creation
- ✅ Production services startup
- ✅ Browser launch

### Important (Should Pass)
- ✅ Error handling (network failures, invalid credentials)
- ✅ User cancellation flow
- ✅ Service health checks
- ✅ Port conflict detection

### Nice-to-Have (Can Defer)
- ⚠️ Pre-flight checks (v0.2)
- ⚠️ Automatic rollback (v0.2)
- ⚠️ Offline mode (v0.5)

---

## 6. Acceptance Criteria Summary

Installation succeeds when:

1. ✅ Docker Desktop installed (or detected if already present)
2. ✅ Setup container pulled and executed
3. ✅ Credentials collected via interactive wizard
4. ✅ Credentials validated (format + connection tests)
5. ✅ `.env` file written to correct location with correct format
6. ✅ Production services started and healthy
7. ✅ Browser opens to `http://localhost:3000`
8. ✅ User reaches first-launch wizard (ADR-012)

**Time Target**: <10 minutes (excluding Docker Desktop download)

---

## References

- [Design Document](../designs/installation-setup-design.md) - Complete technical specifications
- [ADR-011: Installation and Setup Architecture](../../../../docs/architecture/decisions/011-installation-and-setup.md) - Decision rationale
- [ADR-012: First-Launch Setup Wizard](../../../../docs/architecture/decisions/012-first-launch-wizard.md) - Next step after installation
