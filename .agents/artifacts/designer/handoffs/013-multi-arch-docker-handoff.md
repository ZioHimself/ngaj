# Multi-Architecture Docker Images - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-016](../../../docs/architecture/decisions/016-multi-arch-docker-images.md)
🔗 **Technical Specs**: [Design Document](../designs/multi-arch-docker-design.md)

## Overview

Verify that Docker images build and run correctly on both `linux/amd64` and `linux/arm64` architectures.

---

## 1. Test Scope

### In Scope
- ✅ Workflow file syntax and structure
- ✅ Multi-arch manifest creation
- ✅ Image pull behavior on different architectures
- ✅ Container startup on both architectures

### Out of Scope
- ❌ Build performance optimization
- ❌ Windows ARM64 support
- ❌ Native runner configuration
- ❌ Application functionality (covered by existing tests)

---

## 2. Test Scenarios

### 2.1 Integration Tests: Workflow Validation

#### Scenario: QEMU setup action is present
**Given**: The release workflow file
**When**: Parsing workflow steps
**Then**: `docker/setup-qemu-action@v3` step exists before buildx setup

**Acceptance Criteria**:
- [ ] QEMU action is present in docker job
- [ ] QEMU action comes before buildx action

---

#### Scenario: Buildx configured for multi-platform
**Given**: The release workflow file
**When**: Parsing docker/build-push-action steps
**Then**: Both backend and setup builds specify `platforms: linux/amd64,linux/arm64`

**Acceptance Criteria**:
- [ ] Backend build includes `platforms` with amd64 and arm64
- [ ] Setup build includes `platforms` with amd64 and arm64

---

### 2.2 Manual Verification (Post-Release)

These tests require a published release and should be documented for manual execution:

#### Scenario: Multi-arch manifest exists
**Given**: A released Docker image on Docker Hub
**When**: Running `docker manifest inspect ziohimself/ngaj-backend:stable`
**Then**: Manifest shows both `linux/amd64` and `linux/arm64` platforms

**Verification Command**:
```bash
docker manifest inspect ziohimself/ngaj-backend:stable | grep -A2 '"architecture"'
# Should show both: "amd64" and "arm64"
```

---

#### Scenario: Native pull on Apple Silicon
**Given**: An Apple Silicon Mac with Docker Desktop
**When**: Running `docker pull ziohimself/ngaj-backend:stable`
**Then**: Pulled image has `arm64` architecture

**Verification Command**:
```bash
docker pull ziohimself/ngaj-backend:stable
docker inspect ziohimself/ngaj-backend:stable --format '{{.Architecture}}'
# Should output: arm64
```

---

#### Scenario: Native pull on Intel/AMD
**Given**: An Intel/AMD machine with Docker
**When**: Running `docker pull ziohimself/ngaj-backend:stable`
**Then**: Pulled image has `amd64` architecture

**Verification Command**:
```bash
docker pull ziohimself/ngaj-backend:stable
docker inspect ziohimself/ngaj-backend:stable --format '{{.Architecture}}'
# Should output: amd64
```

---

#### Scenario: Container starts on arm64
**Given**: Pulled arm64 image on Apple Silicon Mac
**When**: Running `docker run --rm ziohimself/ngaj-backend:stable node --version`
**Then**: Container starts and outputs Node.js version

**Acceptance Criteria**:
- [ ] Container starts without error
- [ ] Node.js version outputs (e.g., `v20.x.x`)
- [ ] No Rosetta 2 warning in Docker Desktop

---

## 3. Edge Cases

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| QEMU action missing | Build fails with architecture error | High |
| platforms not specified | Image only available for amd64 | High |
| tiktoken build on arm64 | Prebuilt binary used, no compilation error | Medium |
| Dockerfile syntax error | Build fails early with clear error | Low |

---

## 4. Test Implementation Notes

### Workflow File Testing

Use YAML parsing to validate workflow structure:

```typescript
import { parse } from 'yaml';

describe('release.yml multi-arch support', () => {
  let workflow: any;
  
  beforeAll(() => {
    const content = fs.readFileSync('.github/workflows/release.yml', 'utf-8');
    workflow = parse(content);
  });

  it('should have QEMU setup step', () => {
    const dockerJob = workflow.jobs.docker;
    const qemuStep = dockerJob.steps.find(
      (s: any) => s.uses?.startsWith('docker/setup-qemu-action')
    );
    expect(qemuStep).toBeDefined();
  });

  it('should specify multi-arch platforms for backend', () => {
    const dockerJob = workflow.jobs.docker;
    const backendStep = dockerJob.steps.find(
      (s: any) => s.name === 'Build and push backend image'
    );
    expect(backendStep?.with?.platforms).toContain('linux/amd64');
    expect(backendStep?.with?.platforms).toContain('linux/arm64');
  });
});
```

---

## 5. Test Priorities

### Critical Path (Must Pass)
1. QEMU action present in workflow
2. Multi-platform specified for both images
3. Workflow file is valid YAML

### Important (Manual Verification)
4. Multi-arch manifest on Docker Hub
5. Native pull on Apple Silicon
6. Container startup on arm64

### Nice to Have
7. Build time monitoring (ensure <15 min)
8. Image size comparison (arm64 vs amd64)

---

## 6. Definition of Done

- [ ] Workflow file tests pass
- [ ] Release workflow executes without errors
- [ ] Docker Hub shows multi-arch manifest
- [ ] Manual verification on Apple Silicon confirms native pull
- [ ] No regressions in existing installer tests

---

## References

- **Why multi-arch**: [ADR-016](../../../docs/architecture/decisions/016-multi-arch-docker-images.md)
- **Workflow changes**: [Design Doc Section 2](../designs/multi-arch-docker-design.md#2-target-state)
- **Verification commands**: [Design Doc Section 6](../designs/multi-arch-docker-design.md#6-verification-steps)
