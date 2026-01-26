# Multi-Architecture Docker Images - Design Document

📋 **Decision Context**: [ADR-016](../../../docs/architecture/decisions/016-multi-arch-docker-images.md)

## Overview

Add multi-architecture support to Docker image builds, targeting `linux/amd64` and `linux/arm64`. This enables native performance on Apple Silicon Macs and ARM servers.

**Scope**: Release workflow changes only. No changes to Dockerfiles, installers, or application code.

---

## 1. Current State

### Release Workflow (Relevant Section)

```yaml
# .github/workflows/release.yml (current)
docker:
  name: Docker Images
  runs-on: ubuntu-latest
  steps:
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Build and push backend image
      uses: docker/build-push-action@v5
      with:
        context: .
        file: packages/backend/Dockerfile
        push: true
        tags: |
          ziohimself/ngaj-backend:stable
          ziohimself/ngaj-backend:${{ steps.version.outputs.VERSION }}
```

**Problem**: No `platforms` specified → builds only for runner architecture (amd64).

---

## 2. Target State

### Workflow Changes

```yaml
# .github/workflows/release.yml (updated)
docker:
  name: Docker Images
  runs-on: ubuntu-latest
  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build all packages
      run: npm run build

    # NEW: QEMU for cross-platform emulation
    - name: Set up QEMU
      uses: docker/setup-qemu-action@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Login to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}

    - name: Extract version from tag
      id: version
      run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

    - name: Build and push backend image
      uses: docker/build-push-action@v5
      with:
        context: .
        file: packages/backend/Dockerfile
        push: true
        platforms: linux/amd64,linux/arm64  # NEW
        tags: |
          ziohimself/ngaj-backend:stable
          ziohimself/ngaj-backend:${{ steps.version.outputs.VERSION }}

    - name: Build and push setup image
      uses: docker/build-push-action@v5
      with:
        context: .
        file: packages/setup/Dockerfile
        push: true
        platforms: linux/amd64,linux/arm64  # NEW
        tags: |
          ziohimself/ngaj-setup:stable
          ziohimself/ngaj-setup:${{ steps.version.outputs.VERSION }}
```

### Key Changes

| Change | Purpose |
|--------|---------|
| Add `docker/setup-qemu-action@v3` | Enables cross-architecture emulation |
| Add `platforms: linux/amd64,linux/arm64` | Build for both architectures |

---

## 3. How Multi-Arch Works

### Build Process

```
┌─────────────────────────────────────────────────┐
│ GitHub Actions Runner (ubuntu-latest, amd64)    │
└─────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ QEMU User-Space Emulation                       │
│ - Translates arm64 instructions to amd64        │
│ - ~2x slower than native                        │
└─────────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────────┐    ┌───────────────────┐
│ Build linux/amd64 │    │ Build linux/arm64 │
│ (native, fast)    │    │ (emulated, slow)  │
└───────────────────┘    └───────────────────┘
        │                         │
        └────────────┬────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│ Docker Hub: Multi-Arch Manifest                 │
│                                                 │
│ ziohimself/ngaj-backend:stable                  │
│   ├── linux/amd64 → sha256:abc...               │
│   └── linux/arm64 → sha256:def...               │
└─────────────────────────────────────────────────┘
```

### Pull Behavior

```bash
# On Intel/AMD Mac or x64 Linux:
docker pull ziohimself/ngaj-backend:stable
# → Automatically pulls linux/amd64 image

# On Apple Silicon Mac or ARM Linux:
docker pull ziohimself/ngaj-backend:stable
# → Automatically pulls linux/arm64 image
```

---

## 4. Dockerfile Compatibility

Both Dockerfiles use `node:20-alpine` which supports multi-arch:

```dockerfile
# packages/backend/Dockerfile
FROM node:20-alpine AS builder
# ... build steps ...
FROM node:20-alpine
# ... runtime setup ...
```

**Native dependencies**: `tiktoken` provides prebuilt binaries for both architectures. No Dockerfile changes needed.

---

## 5. Build Time Impact

| Metric | Current (amd64 only) | After (amd64 + arm64) |
|--------|----------------------|-----------------------|
| Backend build | ~3 min | ~6 min |
| Setup build | ~2 min | ~4 min |
| Total Docker job | ~5 min | ~10 min |

**Note**: QEMU emulation for arm64 is the bottleneck. Native arm64 build would be ~3 min, but that requires ARM runners.

---

## 6. Verification Steps

After deployment, verify multi-arch support:

```bash
# Check manifest
docker manifest inspect ziohimself/ngaj-backend:stable

# Expected output includes both:
# "platform": { "architecture": "amd64", "os": "linux" }
# "platform": { "architecture": "arm64", "os": "linux" }

# Test on Apple Silicon Mac (native pull)
docker pull ziohimself/ngaj-backend:stable
docker inspect ziohimself/ngaj-backend:stable | grep Architecture
# → "Architecture": "arm64"
```

---

## 7. Future Considerations

### If Build Time Becomes Blocking

Switch to matrix strategy with native runners:

```yaml
docker:
  strategy:
    matrix:
      include:
        - platform: linux/amd64
          runner: ubuntu-latest
        - platform: linux/arm64
          runner: ubuntu-24.04-arm  # ARM runner
  runs-on: ${{ matrix.runner }}
```

This requires an additional manifest merge step but provides native build speeds.

### Additional Architectures

To add more architectures (e.g., `linux/arm/v7` for Raspberry Pi):

```yaml
platforms: linux/amd64,linux/arm64,linux/arm/v7
```

Requires verifying all dependencies have arm/v7 support.

---

## 8. References

- **Decision Rationale**: [ADR-016](../../../docs/architecture/decisions/016-multi-arch-docker-images.md)
- **Test Guidance**: [Handoff Document](../handoffs/013-multi-arch-docker-handoff.md)
- **Docker Buildx Docs**: https://docs.docker.com/build/building/multi-platform/
- **QEMU Setup Action**: https://github.com/docker/setup-qemu-action
