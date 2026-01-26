# ADR-016: Multi-Architecture Docker Images

## Status

**Accepted** - January 26, 2026

## Context

ngaj's Docker images (`ngaj-backend`, `ngaj-setup`) are currently built on GitHub Actions `ubuntu-latest` runners, producing **x86_64 (amd64) only** images. This creates issues for:

1. **Apple Silicon Mac users**: Docker Desktop runs images via Rosetta 2 emulation (~30% slower, higher battery usage)
2. **ARM Linux servers**: Cannot run the images at all (AWS Graviton, Oracle ARM, Raspberry Pi)

The installers (`.pkg` for macOS, `.zip` for Windows) are architecture-agnostic—they contain only shell scripts and `docker-compose.yml`. The architecture concern is **exclusively** about Docker images.

### Native Dependencies

The backend uses `tiktoken` which has native bindings (Rust compiled). The package provides prebuilt binaries for both `linux/amd64` and `linux/arm64`, so multi-arch builds work out of the box.

## Options Considered

### Option A: Multi-Arch via Docker Buildx + QEMU

Use Docker Buildx with QEMU emulation to build both architectures on a single runner.

- **Pros**: Minimal workflow changes (~10 lines), single job, automatic manifest creation
- **Cons**: Build time ~2x slower (cross-compilation via QEMU)

### Option B: Matrix Build with Native Runners

Use architecture-specific GitHub Actions runners (`ubuntu-latest` for amd64, `ubuntu-24.04-arm` for arm64).

- **Pros**: Native build speed, parallel execution
- **Cons**: More complex workflow, requires manifest merging, ARM runner availability varies

### Option C: Separate Image Tags

Build separate images: `ngaj-backend:amd64`, `ngaj-backend:arm64`.

- **Pros**: Simpler workflow, explicit architecture selection
- **Cons**: Poor UX (users must know their architecture), breaks `docker pull` simplicity

## Decision

We will use **Option A: Multi-Arch via Docker Buildx + QEMU**.

The release workflow will build Docker images for `linux/amd64` and `linux/arm64` using Docker Buildx. Docker Hub receives a multi-architecture manifest, allowing `docker pull` to automatically select the correct architecture.

## Rationale

1. **Simplicity**: Minimal changes to existing workflow—just add `platforms` parameter
2. **User Experience**: `docker pull ziohimself/ngaj-backend` works on any architecture
3. **Build time acceptable**: ~10 min builds (vs. ~5 min) are acceptable for releases
4. **Maintenance**: Single job, no manifest merging complexity
5. **Future-ready**: Same approach works if we add more architectures later

## Consequences

### Positive

- ✅ **Native performance on Apple Silicon**: No more Rosetta 2 emulation overhead
- ✅ **ARM server support**: Can deploy to AWS Graviton, Oracle ARM, Raspberry Pi
- ✅ **Transparent to users**: No changes needed to installation or docker-compose
- ✅ **Automatic architecture selection**: Docker manifest handles platform detection

### Negative

- ❌ **Longer build times**: Release builds take ~2x longer (QEMU overhead)
- ❌ **Larger registry storage**: Two image layers per release (amd64 + arm64)

### Mitigation

- **Build time**: Acceptable for releases (not blocking development)
- **Storage**: Minimal cost concern; can optimize with layer caching if needed

## Implementation

### Workflow Changes

```yaml
# .github/workflows/release.yml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3

- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push backend image
  uses: docker/build-push-action@v5
  with:
    platforms: linux/amd64,linux/arm64
    # ... rest unchanged
```

### Verification

After release, verify both architectures:

```bash
docker manifest inspect ziohimself/ngaj-backend:latest
# Should show: linux/amd64, linux/arm64
```

## Out of Scope (v0.1)

- **Windows ARM64**: Docker Desktop for Windows ARM64 is maturing; revisit in v0.2
- **Native runners for faster builds**: Not necessary unless build times become blocking
- **linux/arm/v7**: Older ARM devices (32-bit) not targeted

## Related Decisions

- [ADR-011: Installation and Setup](./011-installation-and-setup.md) - Docker-based installation architecture
- [ADR-005: MVP Scope](./005-mvp-scope.md) - v0.1 platform constraints

## References

- [Docker Buildx Multi-Platform](https://docs.docker.com/build/building/multi-platform/)
- [GitHub Actions: docker/build-push-action](https://github.com/docker/build-push-action)
- Design Doc: `.agents/artifacts/designer/designs/multi-arch-docker-design.md`
