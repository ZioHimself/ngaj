# Installation and Setup - Design Document

📋 **Decision Context**: [ADR-011: Installation and Setup Architecture](../../../../docs/architecture/decisions/011-installation-and-setup.md) - Read this first to understand **why** we chose this architecture.

**Date**: 2026-01-18  
**Designer**: Designer Agent  
**Status**: Approved

---

## Overview

The installation and setup system provides a zero-prerequisites installation experience for non-technical users. It automatically handles Docker Desktop installation, credential collection via a containerized CLI wizard, and production service startup. The design prioritizes small installer size, consistent technology stack (Node.js + Docker), and minimal platform-specific code.

**Key Components**:
- OS-specific installer scripts (macOS bash, Windows PowerShell)
- Pre-built setup container (`ngaj/setup:latest`) with Node.js CLI wizard
- Docker Compose configuration for production services
- Volume-mounted credential storage

**Type Definitions**: `packages/shared/src/types/setup.ts` — Platform-abstracted credential types for multi-platform support (v0.2+)

**Terminology Note**: "Platform" = Social Network (Bluesky, LinkedIn). "OS" = Operating System (macOS, Windows).

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

Steps map to `SetupWizardStep` type in `src/shared/types/setup.ts`.

1. **Welcome message** (`welcome`) - Brief introduction, estimated time
2. **Platform credentials** (`platform_credentials`):
   - v0.1: Bluesky only (uses `BlueskyCredentials` type)
   - v0.2+: Multiple platforms (uses `PlatformCredentials` union type)
   - Prompt: Handle (format validation via `CREDENTIAL_PATTERNS`)
   - Prompt: App password/token (hidden input)
   - Validate format (regex)
   - Test connection (platform-specific API call)
   - Re-prompt on failure (retry loop, uses `CredentialValidationResult`)
3. **AI credentials** (`ai_credentials`):
   - v0.1: Anthropic only (uses `AnthropicCredentials` type)
   - Prompt: API key (hidden input, format: `sk-ant-*`)
   - Validate format
   - Test connection (minimal API call)
   - Re-prompt on failure (retry loop)
4. **Validation** (`validation`):
   - Generate `LOGIN_SECRET` (16 alphanumeric chars with dashes, see [ADR-014](../../../../docs/architecture/decisions/014-simple-token-auth.md))
   - Format `.env` file content (uses `PLATFORM_ENV_VARS`, `AI_PROVIDER_ENV_VARS`)
   - Write to `/data/.env` (mounted volume)
   - Verify file exists
5. **Complete** (`complete`):
   - Display generated `LOGIN_SECRET` to user
   - Container destroyed, credentials remain on host

### 2.3 Validation Logic

Validation patterns and help URLs defined in `src/shared/types/setup.ts`.

**Bluesky Handle** (uses `CREDENTIAL_PATTERNS.blueskyHandle`):
- Format: `^@[\w\-\.]+\.bsky\.social$`
- Connection test: Attempt `createSession` with handle + app password
- Error handling: Show clear message, re-prompt
- Help URL: `CREDENTIAL_HELP_URLS.blueskyAppPassword`

**Claude API Key** (uses `CREDENTIAL_PATTERNS.anthropicApiKey`):
- Format: Must start with `sk-ant-`
- Connection test: Minimal API call (e.g., token count)
- Error handling: Show clear message, re-prompt
- Help URL: `CREDENTIAL_HELP_URLS.anthropicApiKey`

**Error Codes** (uses `CredentialValidationErrorCode`):
- `INVALID_FORMAT` → Re-prompt with format hint
- `AUTH_FAILED` → Re-prompt with help link
- `NETWORK_ERROR` → Error out (ngaj requires internet)
- `TIMEOUT` → Show troubleshooting steps, allow retry

---

## 3. OS-Specific Scripts

### 3.1 macOS Post-Install Script (`installer/scripts/postinstall.sh`)

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

### 3.2 Windows Post-Install Script (`installer/scripts/postinstall.ps1`)

**Responsibilities**:
- Check for Docker (`Get-Command docker`)
- Download Docker Desktop if missing (Invoke-WebRequest + silent install)
- Wait for Docker service (`while (!(docker info 2>$null)) { Start-Sleep 1 }`)
- Pull setup container (`docker pull ngaj/setup:latest`)
- Run setup container with volume mount
- Start production services (`docker-compose up -d`)
- Open browser (`Start-Process "http://localhost:3000"`)

**Error Handling**: Same as macOS (OS-agnostic error messages)

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
- `~/.ngaj/.env:/app/.env` - Environment variables (includes `LOGIN_SECRET` for auth)

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

## 6. Network Access Display

### 6.1 Purpose

Enable access to the ngaj dashboard from mobile devices on the same local network. After services start successfully, the post-install script detects and displays the host's LAN IP address.

### 6.2 Implementation (v0.1 - Terminal Only)

**macOS** (`installer/scripts/postinstall.sh`):

```bash
# After docker-compose up -d and health check...

# Detect LAN IP (prefer WiFi interface, then any non-localhost)
detect_lan_ip() {
  # Try common WiFi interfaces first
  for iface in en0 en1; do
    ip=$(ipconfig getifaddr "$iface" 2>/dev/null)
    if [ -n "$ip" ]; then
      echo "$ip"
      return
    fi
  done
  # Fallback: first non-localhost IPv4 from hostname
  hostname -I 2>/dev/null | awk '{print $1}'
}

LAN_IP=$(detect_lan_ip)

echo "✓ Backend running"
echo ""
echo "  Local access:   http://localhost:3000"
if [ -n "$LAN_IP" ]; then
  echo "  Network access: http://${LAN_IP}:3000"
  echo "  (Use this URL from your mobile device on the same WiFi)"
fi
```

**Windows** (`installer/scripts/postinstall.ps1`):

```powershell
# After docker-compose up -d and health check...

function Get-LanIP {
    # Get IPv4 addresses that are DHCP or Manual (not APIPA, not loopback)
    $addresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        ($_.PrefixOrigin -eq 'Dhcp' -or $_.PrefixOrigin -eq 'Manual') -and
        $_.IPAddress -notlike '127.*' -and
        $_.IPAddress -notlike '169.254.*'
    }
    # Prefer WiFi, then Ethernet
    $wifi = $addresses | Where-Object { $_.InterfaceAlias -like '*Wi-Fi*' } | Select-Object -First 1
    if ($wifi) { return $wifi.IPAddress }
    
    $ethernet = $addresses | Where-Object { $_.InterfaceAlias -like '*Ethernet*' } | Select-Object -First 1
    if ($ethernet) { return $ethernet.IPAddress }
    
    # Fallback to any valid address
    return ($addresses | Select-Object -First 1).IPAddress
}

$LAN_IP = Get-LanIP

Write-Host "✓ Backend running"
Write-Host ""
Write-Host "  Local access:   http://localhost:3000"
if ($LAN_IP) {
    Write-Host "  Network access: http://${LAN_IP}:3000"
    Write-Host "  (Use this URL from your mobile device on the same WiFi)"
}
```

### 6.3 Edge Cases

| Scenario | Behavior |
|----------|----------|
| No network interfaces | Skip network URL, show localhost only |
| VPN active | May show VPN IP (e.g., `10.8.x.x`) - functional, acceptable |
| Multiple interfaces (WiFi + Ethernet) | Prefer WiFi on macOS, WiFi then Ethernet on Windows |
| APIPA address only (`169.254.x.x`) | Skip (no valid network), show localhost only |
| IP changes between runs | Re-detect on every startup (script runs each time) |

### 6.4 Future Enhancement (v0.2)

To display the network URL in the web UI:

1. **Persist IP to `.env`**: After detection, append `HOST_LAN_IP=192.168.1.x` to `.env`
2. **Backend reads `.env`**: On startup, backend reads `HOST_LAN_IP` environment variable
3. **API endpoint**: Backend exposes `GET /api/system/info` returning:
   ```json
   {
     "localUrl": "http://localhost:3000",
     "networkUrl": "http://192.168.1.42:3000"
   }
   ```
4. **Web UI**: Settings page displays both URLs

This approach keeps the container unaware of host networking - it just reads what the host script wrote.

---

## 7. Success Criteria

Installation succeeds when:

1. ✅ Docker Desktop installed and running
2. ✅ Setup container pulled and executed
3. ✅ Credentials collected and validated
4. ✅ `.env` file written to `~/.ngaj/.env`
5. ✅ Production services started and healthy
6. ✅ LAN IP detected and displayed in terminal (if network available)
7. ✅ Browser opens to `http://localhost:3000`
8. ✅ User reaches first-launch wizard (ADR-012)

**Time Target**: <10 minutes (excluding Docker Desktop download time)

---

## 8. Future Enhancements (Out of Scope for v0.1)

- Pre-flight checks (port conflicts, disk space, system requirements)
- Automatic rollback on failure
- GUI-based uninstaller
- Automatic update mechanism
- Linux support (AppImage, Snap, or .deb)
- Offline mode (bundle setup container image)
- Web UI display of network URL (see Section 6.4)

---

## 9. Project Structure

### 8.1 Package Layout

```
ngaj/
├── packages/                    # npm workspaces (separate deps per package)
│   ├── backend/                 # @ngaj/backend
│   │   ├── src/
│   │   ├── Dockerfile           # Backend production image
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── frontend/                # @ngaj/frontend
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── setup/                   # @ngaj/setup (Setup Wizard CLI)
│   │   ├── src/
│   │   │   ├── index.ts         # CLI entry point
│   │   │   ├── prompts/         # inquirer.js prompts
│   │   │   ├── validators/      # Credential validators
│   │   │   └── writers/         # .env file generation
│   │   ├── Dockerfile           # Setup wizard image
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                  # @ngaj/shared (types, errors)
│       ├── src/
│       │   ├── types/
│       │   │   └── setup.ts     # Credential types
│       │   └── errors/
│       ├── package.json
│       └── tsconfig.json
│
├── installer/                   # Native installer packaging
│   ├── scripts/                 # OS-specific post-install scripts
│   │   ├── postinstall.sh       # macOS (bash)
│   │   └── postinstall.ps1      # Windows (PowerShell)
│   │
│   ├── macos/                   # macOS .pkg packaging
│   │   ├── ngaj.pkgproj         # Packages app config (or pkgbuild)
│   │   └── resources/
│   │       ├── ngaj.icns        # App icon (Apple format)
│   │       ├── license.txt      # License text
│   │       └── welcome.html     # Installer welcome screen
│   │
│   └── windows/                 # Windows .msi packaging
│       ├── ngaj.wxs             # WiX main config
│       ├── ui.wxs               # WiX UI customization
│       └── resources/
│           ├── ngaj.ico         # App icon (Windows format)
│           ├── license.rtf      # License (RTF for WiX)
│           ├── banner.bmp       # WiX banner (493x58)
│           └── dialog.bmp       # WiX dialog (493x312)
│
├── .github/
│   └── workflows/
│       ├── ci.yml               # Lint, test, build
│       ├── release.yml          # Build installers on tag
│       └── docker-publish.yml   # Push images to Docker Hub
│
├── docker-compose.yml           # Production services
├── docker-compose.dev.yml       # Development overrides
├── package.json                 # Root workspace config
└── turbo.json                   # Turborepo config (optional, for build orchestration)
```

### 8.2 Package Dependencies

```
@ngaj/shared ─────────────────────────────────┐
     │                                         │
     ├─────────────> @ngaj/backend             │
     │                    │                    │
     │                    └─── depends on ─────┤
     │                                         │
     ├─────────────> @ngaj/frontend            │
     │                                         │
     └─────────────> @ngaj/setup               │
                          │                    │
                          └─── depends on ─────┘
```

### 8.3 Docker Images

| Image | Source | Size | Purpose |
|-------|--------|------|---------|
| `ngaj/setup` | `packages/setup/Dockerfile` | ~50MB | Setup wizard (temporary) |
| `ngaj/backend` | `packages/backend/Dockerfile` | ~150MB | Production backend |

### 8.4 Build Commands

```json
{
  "scripts": {
    "build": "turbo run build",
    "build:backend": "npm -w @ngaj/backend run build",
    "build:frontend": "npm -w @ngaj/frontend run build",
    "build:setup": "npm -w @ngaj/setup run build",
    "build:shared": "npm -w @ngaj/shared run build",
    
    "docker:build": "npm run docker:build:backend && npm run docker:build:setup",
    "docker:build:backend": "docker build -t ngaj/backend -f packages/backend/Dockerfile .",
    "docker:build:setup": "docker build -t ngaj/setup -f packages/setup/Dockerfile .",
    "docker:push": "docker push ngaj/backend && docker push ngaj/setup",
    
    "installer:macos": "cd installer/macos && ./build.sh",
    "installer:windows": "cd installer/windows && ./build.ps1"
  }
}
```

---

## 10. CI/CD Workflow Outline

### 9.1 On Push/PR (`ci.yml`)

1. Checkout code
2. Setup Node.js
3. Install dependencies (`npm ci`)
4. Lint (`npm run lint`)
5. Type check (`npm run typecheck`)
6. Unit tests (`npm run test:unit`)
7. Build all packages (`npm run build`)
8. Integration tests (`npm run test:integration`)

### 9.2 On Release Tag (`release.yml`)

1. Build Docker images
2. Push to Docker Hub (`ngaj/setup`, `ngaj/backend`)
3. Build macOS installer (macOS runner)
4. Build Windows installer (Windows runner)
5. Upload installers to GitHub Release
6. Update release notes

### 9.3 Matrix Strategy

```yaml
jobs:
  build-installer:
    strategy:
      matrix:
        include:
          - os: macos-latest
            script: installer/macos/build.sh
            artifact: ngaj-*.pkg
          - os: windows-latest
            script: installer/windows/build.ps1
            artifact: ngaj-*.msi
```

---

## References

- [ADR-002: Environment Variables for Credentials](../../../../docs/architecture/decisions/002-env-credentials.md) - Secrets storage strategy
- [ADR-005: MVP Scope](../../../../docs/architecture/decisions/005-mvp-scope.md) - v0.1 feature scope
- [ADR-012: First-Launch Setup Wizard](../../../../docs/architecture/decisions/012-first-launch-wizard.md) - Web UI setup after installation
- [Type Definitions](../../../../packages/shared/src/types/setup.ts) - Platform-abstracted credential types