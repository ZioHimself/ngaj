# Installation and Setup - Design Document

📋 **Decision Context**: [ADR-011: Installation and Setup Architecture](../../../../docs/architecture/decisions/011-installation-and-setup.md) - Read this first to understand **why** we chose this architecture.

**Date**: 2026-01-18  
**Designer**: Designer Agent  
**Status**: Approved

---

## Overview

The installation and setup system provides a zero-prerequisites installation experience for non-technical users. It automatically handles Docker Desktop installation, credential collection via a containerized CLI wizard, and production service startup. The design prioritizes small installer size, consistent technology stack (Node.js + Docker), and minimal platform-specific code.

**Key Components**:
- Platform-specific installer scripts (macOS bash, Windows PowerShell)
- Pre-built setup container (`ngaj/setup:latest`) with Node.js CLI wizard
- Docker Compose configuration for production services
- Volume-mounted credential storage

---

## 1. Installation Architecture

### 1.1 Three-Phase Flow

**Phase 1: Native Installer Scripts** (Platform-Specific)
- Check for Docker Desktop
- Download and install Docker if missing
- Wait for Docker daemon to be ready
- Launch setup container

**Phase 2: Containerized Setup Wizard** (Platform-Agnostic)
- Pull `ngaj/setup:latest` from Docker Hub
- Run interactive CLI wizard inside container
- Collect and validate credentials
- Write `.env` file to mounted volume (`~/.ngaj/.env` on host)
- Exit (container destroyed)

**Phase 3: Production Services** (Platform-Agnostic)
- Pull production images (MongoDB, ChromaDB, ngaj-backend, ngaj-frontend)
- Start services via `docker-compose up -d`
- Wait for health checks
- Open browser to `http://localhost:3000`

### 1.2 File System Layout

**Installation Directory** (Platform-Specific):
- macOS: `/Applications/ngaj/`
- Windows: `C:\Program Files\ngaj\`
- Contents: `docker-compose.yml`, `scripts/postinstall.{sh|ps1}`

**User Data Directory** (Platform-Specific):
- macOS: `~/.ngaj/`
- Windows: `C:\Users\<user>\AppData\Local\ngaj\`
- Contents: `.env` (credentials), `data/` (MongoDB, ChromaDB volumes), `logs/`

---

## 2. Setup Container Design

### 2.1 Container Specification

**Image**: `ngaj/setup:latest` (pre-built on Docker Hub)
- Base: `node:20-alpine` (~50MB)
- Dependencies: `inquirer.js`, `@atproto/api`, `@anthropic-ai/sdk`
- Entrypoint: Interactive Node.js CLI script
- Volume mount: `/data` → `~/.ngaj` on host

### 2.2 Wizard Flow

1. **Welcome message** - Brief introduction, estimated time
2. **Bluesky credentials**:
   - Prompt: Handle (format: `@*.bsky.social`)
   - Prompt: App password (hidden input)
   - Validate format (regex)
   - Test connection (Bluesky `createSession` API)
   - Re-prompt on failure (retry loop)
3. **Claude API key**:
   - Prompt: API key (hidden input, format: `sk-ant-*`)
   - Validate format
   - Test connection (minimal API call)
   - Re-prompt on failure (retry loop)
4. **Write credentials**:
   - Format `.env` file content
   - Write to `/data/.env` (mounted volume)
   - Verify file exists
5. **Exit** - Container destroyed, credentials remain on host

### 2.3 Validation Logic

**Bluesky Handle**:
- Format: `^@[\w\-\.]+\.bsky\.social$`
- Connection test: Attempt `createSession` with handle + app password
- Error handling: Show clear message, re-prompt

**Claude API Key**:
- Format: Must start with `sk-ant-`
- Connection test: Minimal API call (e.g., token count)
- Error handling: Show clear message, re-prompt

**Network Errors**:
- Offline → Error out with message (ngaj requires internet)
- Timeout → Show troubleshooting steps, allow retry
- Invalid credentials → Re-prompt with help links

---

## 3. Platform-Specific Scripts

### 3.1 macOS Post-Install Script (`scripts/postinstall.sh`)

**Responsibilities**:
- Check for Docker (`command -v docker`)
- Download Docker Desktop if missing (curl + dmg mount)
- Wait for Docker daemon (`until docker info &> /dev/null; do sleep 1; done`)
- Pull setup container (`docker pull ngaj/setup:latest`)
- Run setup container with volume mount
- Start production services (`docker-compose up -d`)
- Open browser (`open http://localhost:3000`)

**Error Handling**:
- Docker download fails → Show manual download link
- Docker daemon timeout → Suggest restart
- Setup container fails → List created files, cleanup instructions

### 3.2 Windows Post-Install Script (`scripts/postinstall.ps1`)

**Responsibilities**:
- Check for Docker (`Get-Command docker`)
- Download Docker Desktop if missing (Invoke-WebRequest + silent install)
- Wait for Docker service (`while (!(docker info 2>$null)) { Start-Sleep 1 }`)
- Pull setup container (`docker pull ngaj/setup:latest`)
- Run setup container with volume mount
- Start production services (`docker-compose up -d`)
- Open browser (`Start-Process "http://localhost:3000"`)

**Error Handling**: Same as macOS (platform-agnostic error messages)

---

## 4. Docker Compose Configuration

### 4.1 Production Services

**Services**:
- `mongodb` - Official MongoDB image, port 27017
- `chromadb` - Official ChromaDB image, port 8000
- `ngaj-backend` - Built Node.js + Express image, port 3000
- `ngaj-frontend` - Static files served by backend

**Volume Mounts**:
- `~/.ngaj/data/mongodb:/data/db` - MongoDB persistence
- `~/.ngaj/data/chromadb:/chroma/chroma` - ChromaDB persistence
- `~/.ngaj/.env:/app/.env` - Environment variables (read-only in container)

**Network**: Internal Docker network, backend exposes port 3000 to host

**Health Checks**:
- MongoDB: TCP connection check
- ChromaDB: HTTP `GET /api/v1/heartbeat`
- Backend: HTTP `GET /health`

### 4.2 Startup Sequence

1. Start MongoDB → Wait for health check
2. Start ChromaDB → Wait for health check
3. Start backend → Wait for health check
4. Frontend served by backend (no separate container)

---

## 5. Error Handling Strategy

### 5.1 Fail-Loud Approach (v0.1)

**On Failure**:
1. Display clear error message
2. List files/directories created
3. Provide manual cleanup instructions
4. Exit with non-zero status code

**No Automatic Rollback** - User handles cleanup manually

### 5.2 Common Failure Scenarios

**Docker Desktop Installation**:
- Download fails → Show manual download link
- Installation timeout → Suggest restart, check system requirements
- Daemon won't start → Check Docker Desktop app status

**Network Issues**:
- Offline during setup → Error out (ngaj requires internet)
- Setup container pull fails → Check internet, retry
- Credential validation timeout → Show troubleshooting, allow retry

**Port Conflicts**:
- Port 3000 in use → Detect conflict, suggest manual docker-compose edit (v0.2: auto-detect and use alternative port)

**Credential Validation**:
- Invalid format → Re-prompt immediately
- Connection test fails → Show error, re-prompt with help links
- User cancels (Ctrl+C) → Prompt "Setup incomplete. Quit? (y/n)"

---

## 6. Success Criteria

Installation succeeds when:

1. ✅ Docker Desktop installed and running
2. ✅ Setup container pulled and executed
3. ✅ Credentials collected and validated
4. ✅ `.env` file written to `~/.ngaj/.env`
5. ✅ Production services started and healthy
6. ✅ Browser opens to `http://localhost:3000`
7. ✅ User reaches first-launch wizard (ADR-012)

**Time Target**: <10 minutes (excluding Docker Desktop download time)

---

## 7. Future Enhancements (Out of Scope for v0.1)

- Pre-flight checks (port conflicts, disk space, system requirements)
- Automatic rollback on failure
- GUI-based uninstaller
- Automatic update mechanism
- Linux support (AppImage, Snap, or .deb)
- Offline mode (bundle setup container image)

---

## References

- [ADR-002: Environment Variables for Credentials](../../../../docs/architecture/decisions/002-env-credentials.md) - Secrets storage strategy
- [ADR-005: MVP Scope](../../../../docs/architecture/decisions/005-mvp-scope.md) - v0.1 feature scope
- [ADR-012: First-Launch Setup Wizard](../../../../docs/architecture/decisions/012-first-launch-wizard.md) - Web UI setup after installation
