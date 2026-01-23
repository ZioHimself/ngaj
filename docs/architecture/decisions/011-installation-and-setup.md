# ADR-011: Installation and Setup Architecture

## Status

**Accepted** - January 18, 2026  
**Updated** - January 18, 2026 (Refined: Containerized Setup Wizard approach)

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

**macOS**: `.pkg` installer (Apple Installer format)
**Windows**: `.msi` installer (Windows Installer format)

**Package Contents (~10MB):**
- Docker Compose configuration files
- Installation scripts (pre/post-install hooks, OS-specific)
- Uninstall instructions (manual for v0.1)

**What's downloaded during installation:**
- Setup container image (`ngaj/setup:latest`, ~50MB) - Pulled from Docker Hub
- Production container images (~300MB) - Pulled by Docker Compose

**What's NOT bundled:**
- Docker Desktop (~500MB) - Downloaded on-demand during installation
- MongoDB/ChromaDB images (~300MB) - Pulled by Docker on first start
- Node.js runtime (runs in container, not needed on host)

### 2. Installation Flow

```
┌─────────────────────────────────────────────────┐
│ 1. User downloads ngaj-installer.pkg (~50MB)   │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 2. User double-clicks installer                │
│    → Installs to /Applications/ngaj (macOS)    │
│    → Installs to C:\Program Files\ngaj (Win)   │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 3. Post-install script runs                    │
│    → Checks for Docker Desktop                  │
│    → If missing: Downloads & installs (~500MB) │
│    → Waits for Docker daemon to start          │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 4. Launch setup container                       │
│    → docker pull ngaj/setup:latest (~50MB)     │
│    → docker run --rm -it \                      │
│         -v ~/.ngaj:/data \                      │
│         ngaj/setup:latest                       │
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
/Applications/ngaj/                    # Application bundle
  ├── docker-compose.yml               # Service orchestration
  └── scripts/
      └── postinstall.sh               # Post-install script (Docker check, setup launch)

~/.ngaj/                               # User data directory
  ├── .env                             # Secrets (Bluesky, Claude API)
  ├── data/
  │   ├── mongodb/                     # Persistent MongoDB data
  │   └── chromadb/                    # Persistent ChromaDB data
  └── logs/                            # Application logs

# Windows
C:\Program Files\ngaj\                 # Application directory
  ├── docker-compose.yml               # Service orchestration
  └── scripts\
      └── postinstall.ps1               # Post-install script (Docker check, setup launch)

C:\Users\<user>\AppData\Local\ngaj\   # User data directory
  ├── .env                             # Secrets
  ├── data\
  │   ├── mongodb\                     # Persistent MongoDB data
  │   └── chromadb\                    # Persistent ChromaDB data
  └── logs\                            # Application logs
```

### 4. Docker Compose Configuration

**Services:**
- `mongodb` (official MongoDB image)
- `chromadb` (official ChromaDB image)
- `ngaj-backend` (Node.js + Express, built image)
- `ngaj-frontend` (Served as static files by backend in production)

**Setup Container (separate, not in docker-compose):**
- `ngaj/setup:latest` (pre-built on Docker Hub)
  - Node.js runtime
  - inquirer.js for prompts
  - Bluesky/Claude API clients for validation
  - Runs temporarily during installation, then destroyed

**Volume Mounts:**
- `~/.ngaj/data/mongodb:/data/db` (MongoDB persistence)
- `~/.ngaj/data/chromadb:/chroma/chroma` (ChromaDB persistence)
- `~/.ngaj/.env` (environment variables, read by backend)

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
  ```

### 6. Error Handling & Recovery

**Fail-Loud Strategy (v0.1):**

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

### macOS .pkg Structure

- Use `pkgbuild` to create installer
- Post-install script: `scripts/postinstall.sh` (bash, ~30 lines)
  - Check for Docker Desktop (`command -v docker`)
  - Download if missing (curl + dmg mount + copy to /Applications)
  - Wait for Docker daemon (`until docker info &> /dev/null; do sleep 1; done`)
  - Pull setup container (`docker pull ngaj/setup:latest`)
  - Run setup container with volume mount:
    ```bash
    docker run --rm -it \
      -v ~/.ngaj:/data \
      ngaj/setup:latest
    ```
  - Start production services (`cd /Applications/ngaj && docker-compose up -d`)
  - Open browser (`open http://localhost:3000`)

### Windows .msi Structure

- Use WiX Toolset to create installer
- Custom action: PowerShell script (`scripts/postinstall.ps1`, ~30 lines)
  - Check for Docker Desktop (`Get-Command docker`)
  - Download if missing (Invoke-WebRequest + silent install)
  - Wait for Docker service (`while (!(docker info 2>$null)) { Start-Sleep 1 }`)
  - Pull setup container (`docker pull ngaj/setup:latest`)
  - Run setup container with volume mount:
    ```powershell
    docker run --rm -it `
      -v "$env:USERPROFILE\.ngaj:/data" `
      ngaj/setup:latest
    ```
  - Start production services (`cd "C:\Program Files\ngaj"; docker-compose up -d`)
  - Open browser (`Start-Process "http://localhost:3000"`)

### Setup Container Implementation

**Technology:** Node.js CLI app (inquirer.js for prompts)

**Type Definitions:** `packages/shared/src/types/setup.ts` - Platform-abstracted credential types

**Image:** Pre-built `ngaj/setup:latest` on Docker Hub
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
5. ✅ User reaches working web UI without touching terminal/config files
6. ✅ Clear error messages guide recovery on failures

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
- [Docker Desktop Licensing](https://www.docker.com/pricing/faq/) - Commercial use requires license

## Related Documentation

- Design Doc: `.agents/artifacts/designer/designs/installation-setup-design.md`
- Handoff Doc: `.agents/artifacts/designer/handoffs/006-installation-setup-handoff.md`
- Type Definitions: `packages/shared/src/types/setup.ts`
- GitHub Issue: [#10 - Installation and Setup](https://github.com/ZioHimself/ngaj/issues/10)

## Project Structure Notes

The installation feature requires restructuring to npm workspaces:
- `packages/setup/` - Setup wizard CLI (separate deps, clean Docker image)
- `packages/shared/` - Types used by backend, frontend, and setup
- `installer/` - OS-specific packaging (macOS .pkg, Windows .msi)

See Design Doc Section 8 for complete structure.
