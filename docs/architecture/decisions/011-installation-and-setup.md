# ADR-011: Installation and Setup Architecture

## Status

**Accepted** - January 18, 2026  
**Updated** - January 24, 2026 (Added: Application Launcher for day-2 restart experience)  
**Updated** - January 26, 2026 (Changed: Named volumes for database storage, non-root backend user)
**Updated** - January 28, 2026 (Changed: DMG distribution with self-contained app bundle, Gatekeeper-friendly)
**Updated** - January 30, 2026 (Changed: Windows installer auto-elevation via UAC, improved user messaging)

## Context

ngaj's MVP (ADR-005) targets **non-technical users** who want a "consumer app" experience. Current setup requires:
- Manual Docker installation
- Manual `.env` file editing with platform credentials
- Understanding of MongoDB, ChromaDB, Docker Compose
- Command-line knowledge

This creates barriers for the target audience. We need a **self-contained installation** that:

1. **Requires zero prerequisites** - No assumptions about installed software
2. **Guides credential setup** - Interactive prompts with help links
3. **Handles dependencies** - Automatically installs Docker, databases, runtime
4. **Works cross-OS** - macOS and Windows (Linux in v0.2)
5. **Starts services automatically** - User goes from download to working app in <10 minutes

**Design Constraints:**
- Local-first architecture (no cloud dependencies)
- Docker Desktop licensing acceptable for non-commercial use
- Secrets stored in `.env` file (ADR-002, editable manually but not in GUI for v0.1)
- Must survive restarts (persistent data volumes)

## Decision

We will implement a **Docker-based self-contained installer** that downloads dependencies on-demand and runs an interactive CLI setup wizard **inside a containerized environment** to avoid Node.js runtime dependencies on the host.

### 1. Installation Package Format

**macOS**: `.dmg` disk image with self-contained `.app` bundle
- User drags `ngaj.app` to Applications folder
- Right-click → Open bypasses Gatekeeper (no code signing required for v0.1)
- App bundle contains all resources (docker-compose.yml, scripts)

**Windows**: `.msi` installer (Windows Installer format)

**macOS App Bundle Contents:**
- `Contents/MacOS/ngaj` - Launcher script
- `Contents/Resources/docker-compose.yml` - Service orchestration
- `Contents/Resources/scripts/` - Setup and start scripts
- `Contents/Resources/ngaj.icns` - App icon

**What's downloaded during installation:**
- Setup container image (`ziohimself/ngaj-setup:stable`, ~50MB) - Pulled from Docker Hub
- Production container images (~300MB) - Pulled by Docker Compose

**What's NOT bundled:**
- Docker Desktop (~500MB) - Downloaded on-demand during installation
- MongoDB/ChromaDB images (~300MB) - Pulled by Docker on first start
- Node.js runtime (runs in container, not needed on host)

### 2. Installation Flow

```
┌─────────────────────────────────────────────────┐
│ 1. User downloads ngaj-{version}.dmg (~1MB)    │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 2. User opens DMG, drags ngaj.app to /Apps     │
│    → Right-click → Open (bypass Gatekeeper)    │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 3. First launch: app bootstraps ~/.ngaj/       │
│    → Copies docker-compose.yml, scripts        │
│    → Opens Terminal for setup wizard           │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 4. Setup script runs                           │
│    → Checks for Docker Desktop                  │
│    → If missing: Downloads & installs (~500MB) │
│    → Waits for Docker daemon to start          │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 4. Launch setup container                       │
│    → docker pull ziohimself/ngaj-setup:stable (~50MB)     │
│    → docker run --rm -it \                      │
│         -v ~/.ngaj:/data \                      │
│         ziohimself/ngaj-setup:stable                       │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 5. Interactive CLI Setup Wizard (in container)  │
│    (Terminal window, Node.js + inquirer.js)      │
│                                                 │
│    Welcome to ngaj!                             │
│    Let's get you set up. This will take ~5     │
│    minutes.                                     │
│                                                 │
│    [1/2] Bluesky Credentials                    │
│    ────────────────────────────────             │
│    Your Bluesky handle:                         │
│    > @user.bsky.social                          │
│                                                 │
│    Bluesky app password:                        │
│    > **************** (hidden input)            │
│                                                 │
│    Validating... ✓ Connection successful        │
│                                                 │
│    ℹ️  Don't have an app password?              │
│       Visit: https://bsky.app/settings/app-pass │
│                                                 │
│    [2/2] Claude API Key                         │
│    ────────────────────────────────             │
│    Anthropic API key:                            │
│    > sk-ant-******************** (hidden)       │
│                                                 │
│    Validating... ✓ Connection successful        │
│                                                 │
│    ℹ️  Get your API key:                         │
│       https://console.anthropic.com              │
│                                                 │
│    ✓ Credentials saved to /data/.env            │
│       (mounted to ~/.ngaj/.env on host)         │
│                                                 │
│    Setup complete! Exiting container...         │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 6. Start production services                    │
│    → docker-compose pull (first time: ~300MB)    │
│    → docker-compose up -d                        │
│    → Wait for health checks (MongoDB, ChromaDB) │
│    ✓ Services running                            │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 6. Open web browser                             │
│    → http://localhost:3000                      │
│    → First-launch setup wizard (ADR-012)        │
└─────────────────────────────────────────────────┘
```

### 3. File System Layout

```
# macOS
/Applications/ngaj.app/                # Self-contained app bundle
  Contents/
    MacOS/ngaj                         # Launcher script (bootstraps ~/.ngaj/)
    Info.plist                         # App metadata
    Resources/
      ngaj.icns                        # App icon
      docker-compose.yml               # Bundled, copied to ~/.ngaj/ on first launch
      scripts/
        ngaj-setup.sh                  # Bundled, copied to ~/.ngaj/scripts/
        ngaj-start.sh                  # Bundled, copied to ~/.ngaj/scripts/

~/.ngaj/                               # User data directory (bootstrapped from app bundle)
  ├── docker-compose.yml               # Service orchestration (copied from app)
  ├── .env                             # Secrets (Bluesky, Claude API)
  ├── logs/                            # Application logs
  └── scripts/
      ├── ngaj-setup.sh                # Setup script (copied from app)
      └── ngaj-start.sh                # Start script (copied from app)

# Database storage: Docker named volumes (managed by Docker)
# - ngaj-mongodb (MongoDB data)
# - ngaj-chromadb (ChromaDB data)
# Location: /var/lib/docker/volumes/ (Linux/macOS) or Docker Desktop VM (Windows/macOS)
# Backup: docker run --rm -v ngaj-mongodb:/data -v $(pwd):/backup alpine tar cvf /backup/mongo.tar /data

# Windows
C:\Program Files\ngaj\                 # Application directory
  ├── docker-compose.yml               # Service orchestration
  └── scripts\
      └── postinstall.ps1               # Post-install script (Docker check, setup launch)

C:\Users\<user>\AppData\Local\ngaj\   # User data directory
  ├── .env                             # Secrets
  └── logs\                            # Application logs
```

### 4. Docker Compose Configuration

**Services:**
- `mongodb` (official MongoDB image)
- `chromadb` (official ChromaDB image)
- `ngaj-backend` (Node.js + Express, built image)
- `ngaj-frontend` (Served as static files by backend in production)

**Setup Container (separate, not in docker-compose):**
- `ziohimself/ngaj-setup:stable` (pre-built on Docker Hub)
  - Node.js runtime
  - inquirer.js for prompts
  - Bluesky/Claude API clients for validation
  - Runs temporarily during installation, then destroyed

**Volume Mounts:**
- `ngaj-mongodb:/data/db` (MongoDB persistence, Docker named volume)
- `ngaj-chromadb:/chroma/chroma` (ChromaDB persistence, Docker named volume)
- `~/.ngaj/.env` (environment variables, injected by Docker at container start)

**Why Named Volumes (not bind mounts):**
- Better performance on macOS/Windows (avoids osxfs/grpcfuse overhead)
- No UID permission mismatches between host and container
- Docker handles permissions automatically
- Cleaner for non-technical users (no visible data directories)

**Network:**
- Internal Docker network for service communication
- Backend exposes port 3000 to host

**Health Checks:**
- MongoDB: TCP connection check
- ChromaDB: HTTP `/api/v1/heartbeat`
- Backend: HTTP `/health`

### 5. CLI Setup Wizard Details

**Prompts:**

| Prompt | Input Type | Validation | Help Link |
|--------|-----------|-----------|----------|
| Bluesky handle | Text | Format: `@*.bsky.social` | https://bsky.app |
| Bluesky app password | Hidden text | Min 20 chars | https://bsky.app/settings/app-passwords |
| Claude API key | Hidden text | Format: `sk-ant-*` | https://console.anthropic.com |

**Validation:**
- Handle format check (regex: `^@[\w\-\.]+\.bsky\.social$`)
- API key format check (starts with `sk-ant-`)
- Test Bluesky connection before proceeding
- Test Claude API before proceeding

**Error Handling:**
- Invalid format → Show error, re-prompt immediately (nothing written yet)
- Connection test fails → Show error with troubleshooting steps, re-prompt (retry loop)
- Network offline → Error out with clear message (ngaj requires internet)
- Ctrl+C during wizard → Prompt "Setup incomplete. Quit? (y/n)" (container exits, no .env written)

**Output:**
- Writes to `~/.ngaj/.env` in format:
  ```
  BLUESKY_HANDLE=@user.bsky.social
  BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
  ANTHROPIC_API_KEY=sk-ant-xxxxx
  LOGIN_SECRET=A1B2-C3D4-E5F6-G7H8
  ```

**Login Secret** (see [ADR-014](./014-simple-token-auth.md)):
- Generated automatically (16 alphanumeric chars with dashes)
- Displayed in terminal for user to access dashboard from mobile

### 6. Network Access Display (v0.1)

After services start, the post-install script detects and displays the host's LAN IP address, enabling access from mobile devices on the same network.

**Flow**:
```
Backend starts → Health check passes → Detect host LAN IP → Display in terminal
```

**Terminal Output**:
```
✓ Backend running

  Local access:   http://localhost:3000
  Network access: http://192.168.1.42:3000
  (Use this URL from your mobile device on the same WiFi)
```

**Detection Strategy**:
- macOS: `ipconfig getifaddr en0` (WiFi) with fallbacks
- Windows: `Get-NetIPAddress` filtering for DHCP/Manual, non-localhost
- If no valid IP found: Skip network URL, show localhost only

**v0.2 Enhancement**: Persist IP to `.env` as `HOST_LAN_IP`, expose via backend API `/api/system/info`, display in web UI settings.

### 7. Error Handling & Recovery (v0.1)

**Fail-Loud Strategy:**

When installation fails:
1. Display clear error message
2. List files/directories created so far
3. Provide manual cleanup instructions
4. Exit with non-zero status code

**No automatic rollback** - User handles cleanup manually with provided instructions.

**Example Error Message:**
```
❌ Installation failed: Docker Desktop installation timeout

Files created:
  - /Applications/ngaj/
  - ~/.ngaj/

To clean up manually:
  1. rm -rf /Applications/ngaj
  2. rm -rf ~/.ngaj

For support, visit: https://github.com/ziohimself/ngaj/issues
```

**Common Failure Scenarios:**
- Docker Desktop download fails → Show link to manual download
- Docker daemon won't start → Check system requirements, suggest restart
- Port 3000 already in use → Detect conflict, suggest changing port (manual docker-compose edit)
- Credential validation fails → Re-prompt with clearer instructions

## Rationale

### Why Docker Desktop (vs. Colima, Native Binaries)?

**Decision:** Use Docker Desktop

**Alternatives Considered:**

1. **Colima (lightweight Docker for macOS)**
   - ❌ macOS only (no Windows support)
   - ❌ Requires homebrew or manual installation
   - ✅ Lighter weight, faster startup
   
2. **Native MongoDB + ChromaDB binaries**
   - ❌ Platform-specific builds needed (macOS arm64, x64, Windows)
   - ❌ More complex uninstall/cleanup
   - ❌ Harder to isolate/update components
   - ✅ Faster, no container overhead

3. **Podman (Docker alternative)**
   - ❌ Less mature on macOS/Windows
   - ❌ Compatibility issues with docker-compose
   - ✅ Open-source, no licensing concerns

**Chosen approach: Docker Desktop** because:
- Cross-platform support (macOS + Windows)
- Standard, well-supported tooling
- Easy isolation and cleanup
- Licensing acceptable for non-commercial single-user use
- Future-ready for v0.2+ multi-platform complexity

### Why Download Docker During Install (vs. Bundling)?

**Decision:** Download Docker Desktop on-demand

**Alternatives Considered:**

1. **Bundle Docker Desktop in installer**
   - ❌ 550MB installer download (vs. 50MB)
   - ❌ Must update installer for every Docker release
   - ❌ May violate Docker redistribution terms
   
2. **Assume Docker already installed**
   - ❌ Breaks "zero prerequisites" goal
   - ❌ User must follow separate installation guide

**Chosen approach: Download on-demand** because:
- Smaller initial download (better UX)
- Always gets latest Docker Desktop version
- Standard approach (e.g., Node.js installers)

### Why Containerized CLI Wizard (vs. Host Binary, vs. GUI Wizard)?

**Decision:** Interactive CLI wizard running inside a temporary Docker container

**Alternatives Considered:**

1. **Standalone Node.js binary (pkg/nexe) on host**
   - ❌ Requires bundling Node.js runtime (~50MB per architecture)
   - ❌ Architecture explosion (macOS arm64, x64, Windows x64 = 3 builds)
   - ❌ Different tech stack (Rust/Go for orchestration)
   - ✅ Can write directly to host filesystem
   
2. **GUI wizard (Electron window) for credential collection**
   - ❌ Requires bundling Electron (~200MB)
   - ❌ More complex to build and maintain
   - ❌ Services must start without credentials (SETUP_MODE)
   
3. **Pure shell scripts (bash/PowerShell)**
   - ❌ Platform-specific code (2x maintenance)
   - ❌ Poor UX (basic prompts, no colors, hard async validation)
   - ✅ Smallest installer size
   
4. **Web UI wizard (defer to ADR-012)**
   - ❌ Services must start in setup mode (complex backend logic)
   - ❌ Can't validate before services start
   - ✅ Consistent UX with main app

**Chosen approach: Containerized CLI wizard** because:
- ✅ Small installer (~10MB, no Node.js bundled)
- ✅ Consistent tech stack (Node.js + Docker, no Rust/Go)
- ✅ Minimal platform-specific code (only Docker installation check)
- ✅ Validates credentials before production services start
- ✅ Credentials written to host via mounted volume
- ✅ Pre-built image on Docker Hub (always up-to-date Node.js)

### Why Fail-Loud (vs. Automatic Rollback)?

**Decision:** Display error, list created files, defer cleanup to user

**Alternatives Considered:**

1. **Automatic rollback on failure**
   - ❌ Complex (Docker half-installed, data partially written)
   - ❌ Risk of making things worse (deleting wrong files)
   
2. **Pre-flight checks (validate everything before starting)**
   - ✅ Better UX (fail fast)
   - ❌ Still need post-failure cleanup strategy
   - 🔄 Deferred to v0.2 (can add without breaking v0.1)

**Chosen approach: Fail-loud** because:
- Simpler to implement
- Safer (no risk of deleting wrong files)
- Transparent (user sees what happened)
- Good enough for v0.1 MVP

## Consequences

### Positive

- ✅ **Zero prerequisites**: User doesn't need Docker, npm, homebrew pre-installed
- ✅ **Consumer-friendly**: Download, install, follow prompts, done
- ✅ **Validates credentials**: Setup wizard tests connections immediately
- ✅ **Cross-platform**: Same experience on macOS and Windows
- ✅ **Persistent data**: Survives restarts (Docker volumes)
- ✅ **Isolated**: Easy to uninstall (delete app + ~/.ngaj)
- ✅ **Developer escape hatch**: Advanced users can edit .env, docker-compose.yml manually

### Negative

- ❌ **Large download**: 10MB installer + 500MB Docker + 50MB setup image + 300MB production images = ~860MB total
- ❌ **Manual uninstall**: No automatic uninstaller in v0.1
- ❌ **No secrets editing UI**: Must edit .env manually (deferred to v0.2)
- ❌ **Docker Desktop licensing**: May require paid license for commercial use
- ❌ **Port conflicts**: If port 3000 in use, must manually edit docker-compose
- ❌ **No automatic updates**: User must download new installer for updates

### Mitigation

- **Large download**: Progressive (10MB installer first, Docker + images in background); show progress bars for each phase
- **Manual uninstall**: Provide clear instructions in docs
- **Secrets editing**: Document manual .env editing with examples
- **Licensing**: Clearly state "for non-commercial use" in docs
- **Port conflicts**: Pre-flight check in v0.2; for v0.1, document troubleshooting
- **Updates**: Defer to v0.2; for v0.1, announce updates via in-app banner

## Implementation Notes

### macOS .dmg Structure

- Use `hdiutil` to create DMG with app bundle + Applications alias
- Self-contained `ngaj.app` bundle includes all resources
- No post-install script needed - app bootstraps on first launch

**App Launcher Behavior (Contents/MacOS/ngaj):**
1. Resolve app bundle location from `$0`
2. Bootstrap `~/.ngaj/` by copying from `Contents/Resources/`
3. Determine script: setup (if no `.env`) or start (if `.env` exists)
4. Open Terminal and run the appropriate script

**Gatekeeper Bypass:**
- Users right-click → Open to bypass unsigned app warning
- No code signing required for v0.1 (optional enhancement for v0.2)

### Windows Installer (ZIP Distribution)

**v0.1 Approach:** ZIP archive with self-elevating batch file (simpler than MSI, no WiX dependency)

**Package Contents:**
- `install.bat` - Self-elevating installer entry point
- `uninstall.bat` - Cleanup script
- `docker-compose.yml` - Service orchestration
- `scripts/` - PowerShell scripts for setup and runtime
- `resources/` - Icons

**UAC Auto-Elevation:**

The `install.bat` uses a self-elevation pattern so non-technical users don't need to know about "Run as Administrator":

```batch
@echo off
title ngaj Installer

REM Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator privileges...
    echo A Windows prompt will appear - please click "Yes"
    powershell -Command "Start-Process -Verb RunAs -FilePath '%~f0' -ArgumentList 'elevated'"
    exit /b
)

REM ... installation proceeds with admin rights ...
```

**User Experience:**
1. User double-clicks `install.bat`
2. Script detects non-admin, shows friendly message
3. Windows UAC dialog appears ("Do you want to allow this app to make changes?")
4. User clicks "Yes"
5. New elevated window opens with step-by-step progress
6. Post-install script launches setup wizard in separate PowerShell window

**Post-Install Script (`scripts/postinstall.ps1`):**
- Check for Docker Desktop (`Get-Command docker`)
- Download if missing (Invoke-WebRequest + silent install)
- Wait for Docker service (`while (!(docker info 2>$null)) { Start-Sleep 1 }`)
- Pull setup container (`docker pull ziohimself/ngaj-setup:stable`)
- Run setup container with volume mount
- Start production services (`docker-compose up -d`)
- Open browser (`Start-Process "http://localhost:3000"`)

**Future (v0.2+):** Use WiX Toolset to create proper `.msi` installer with native Windows Installer UI

### Setup Container Implementation

**Technology:** Node.js CLI app (inquirer.js for prompts)

**Type Definitions:** `packages/shared/src/types/setup.ts` - Platform-abstracted credential types

**Image:** Pre-built `ziohimself/ngaj-setup:stable` on Docker Hub
- Base: `node:20-alpine` (~50MB)
- Dependencies: inquirer.js, @atproto/api, @anthropic-ai/sdk
- Entrypoint: `/app/setup.js` (interactive wizard)
- Volume mount: `/data` → `~/.ngaj` on host (writes `.env` file)

**Platform Abstraction:**
- `PlatformCredentials` union type enables multi-platform support (v0.2+)
- v0.1: Only `BlueskyCredentials` implemented
- v0.2+: Add `LinkedInCredentials`, `RedditCredentials`
- `AICredentials` abstraction for future AI provider support

**Workflow:**
1. Prompt for credentials (uses `SetupWizardStep` types)
2. Validate format (uses `CREDENTIAL_PATTERNS` constants)
3. Test connections (returns `CredentialValidationResult`)
4. Write to `/data/.env` (uses `PLATFORM_ENV_VARS` mapping)
5. Exit (container destroyed, credentials remain on host)

## Success Criteria

v0.1 installation succeeds if:

1. ✅ Non-technical user can install without external help
2. ✅ Installation completes in <10 minutes (excluding Docker download time)
3. ✅ Credential validation catches invalid inputs before starting services
4. ✅ Services start automatically and survive restarts
5. ✅ LAN IP displayed in terminal for mobile device access (if network available)
6. ✅ User reaches working web UI without touching terminal/config files
7. ✅ Clear error messages guide recovery on failures
8. ✅ User can restart ngaj after laptop reboot via clickable app icon

## Application Launcher (Day-2 Experience)

### Problem

After initial installation, how does a user **restart ngaj** on subsequent uses?

- When user shuts down their laptop, Docker Desktop stops
- On next boot, Docker Desktop may not auto-start
- Even if Docker starts, ngaj services need to be brought up
- User has no obvious way to "launch ngaj" like other apps

### Decision

Provide a **clickable application launcher** that:
1. Opens a Terminal window showing startup progress
2. Ensures Docker Desktop is running
3. Starts ngaj services
4. Displays login code and network address (always visible)
5. Opens browser to network address
6. Keeps terminal open until user closes it or presses Ctrl+C

### User Experience

**Click ngaj icon → Terminal opens with status:**
```
✅ ngaj is running!

Dashboard:    http://192.168.1.42:3000
Login code:   A1B2-C3D4-E5F6-G7H8

(Use login code from any device on your WiFi)

Press Ctrl+C to stop ngaj
```

**Browser auto-opens** to the network address.

**To stop**: Close terminal window, press Ctrl+C, or shut down laptop.

### Implementation

**macOS**: Create `/Applications/ngaj.app` bundle
- App icon visible in Dock, Launchpad, Spotlight
- Launches Terminal with start script
- Script: `~/.ngaj/scripts/ngaj-start.sh`

**Windows**: Create Start Menu shortcut
- Points to `ngaj-start.ps1` script
- Opens PowerShell window with status display
- Script: `%LOCALAPPDATA%\ngaj\scripts\ngaj-start.ps1`

### Files Created by Installation

```
# macOS (user drags from DMG)
/Applications/ngaj.app/           # Self-contained clickable app bundle
  Contents/
    MacOS/ngaj                    # Launcher (bootstraps ~/.ngaj/, runs scripts)
    Info.plist                    # App metadata
    Resources/
      ngaj.icns                   # App icon
      docker-compose.yml          # Bundled, copied to ~/.ngaj/
      scripts/                    # Bundled, copied to ~/.ngaj/scripts/
        ngaj-setup.sh
        ngaj-start.sh

# Bootstrapped on first launch
~/.ngaj/
  docker-compose.yml              # Copied from app bundle
  scripts/
    ngaj-setup.sh                 # Copied from app bundle
    ngaj-start.sh                 # Copied from app bundle

# Windows
%LOCALAPPDATA%\ngaj\scripts\
  ngaj-start.ps1                  # Start script

Start Menu shortcut → ngaj-start.ps1
```

### Behavior Matrix

| Scenario | Action |
|----------|--------|
| First click after laptop reboot | Docker starts → containers start → browser opens |
| Click while already running | Containers already up (fast) → browser opens |
| Click after Ctrl+C stopped it | Containers restart → browser opens |
| Close terminal window | Containers continue running (detached) |
| Ctrl+C in terminal | Containers stop gracefully |

### Rationale

**Why Terminal window (not background)?**
- Shows login code (needed for mobile access)
- Shows network URL (not localhost)
- Familiar pattern for developer tools
- User can see if something went wrong
- Simple to implement (shell scripts)

**Why not auto-start on login?**
- Not necessary for v0.1
- Can be added later as user preference
- Keeps initial experience simple

## Future Enhancements

### v0.2: Installation Improvements
- Pre-flight checks (port conflicts, disk space, system requirements)
- Automatic rollback on installation failure
- GUI-based uninstaller
- Homebrew/Chocolatey distribution (for technical users)

### v0.3: Secrets Management
- Edit secrets in Settings UI (no manual .env editing)
- Encrypted .env file (master password or system keychain)
- Credential rotation workflow

### v0.4: Updates
- Automatic update checks (in-app notification)
- One-click update (download + restart services)
- Version rollback

### v0.5: Distribution
- Linux support (AppImage, Snap, or .deb)
- Portable version (USB stick, no installation)

## References

- [ADR-002: Environment Variables for Credentials](./002-env-credentials.md) - Secrets storage strategy
- [ADR-005: MVP Scope](./005-mvp-scope.md) - v0.1 feature scope and target audience
- [ADR-012: First-Launch Setup Wizard](./012-first-launch-wizard.md) - Web UI setup after installation
- [ADR-014: Simple Token Authentication](./014-simple-token-auth.md) - Login secret generated during setup
- [ADR-021: Installation Clipboard Experience](./021-installation-clipboard-experience.md) - Clipboard UX improvements
- [Docker Desktop Licensing](https://www.docker.com/pricing/faq/) - Commercial use requires license

## Related Documentation

- Design Doc: `.agents/artifacts/designer/designs/installation-setup-design.md`
- Handoff Doc (Installation): `.agents/artifacts/designer/handoffs/006-installation-setup-handoff.md`
- Handoff Doc (Network Access): `.agents/artifacts/designer/handoffs/010-network-access-display-handoff.md`
- Handoff Doc (Application Launcher): `.agents/artifacts/designer/handoffs/012-application-launcher-handoff.md`
- Handoff Doc (Clipboard UX): `.agents/artifacts/designer/handoffs/018-installation-clipboard-experience-handoff.md`
- Type Definitions: `packages/shared/src/types/setup.ts`
- GitHub Issue: [#10 - Installation and Setup](https://github.com/ZioHimself/ngaj/issues/10)

## Project Structure Notes

The installation feature requires restructuring to npm workspaces:
- `packages/setup/` - Setup wizard CLI (separate deps, clean Docker image)
- `packages/shared/` - Types used by backend, frontend, and setup
- `installer/` - OS-specific packaging (macOS .pkg, Windows .msi)

See Design Doc Section 10 for complete structure.
