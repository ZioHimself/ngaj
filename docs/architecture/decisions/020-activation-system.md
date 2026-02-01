# ADR-020: Activation System

## Status

**Accepted** - February 1, 2026

## Context

ngaj is a local-first application distributed to users without payment. However, the caretaker (project owner) wants to:

1. **Authorize installations** - Control who can use the application
2. **Prevent concurrent usage** - Ensure the same activation key isn't used on multiple devices simultaneously
3. **Protect against filesystem copying** - Prevent abuse by copying `~/.ngaj/` to another machine

**Design Constraints:**
- Application runs inside Docker containers (fingerprinting challenge)
- Local-first architecture (no cloud storage of user data)
- Must integrate with existing CLI setup wizard (ADR-011)
- Strict mode: Server must be reachable for app to start

## Options Considered

### Option A: Device-Bound Licensing (One Key = One Device)

- **Pros**: Simple, prevents any copying
- **Cons**: User can't migrate to new laptop without caretaker intervention; doesn't address "no concurrent usage" if user legitimately has two devices

### Option B: N-Device Limit (One Key = N Concurrent Devices)

- **Pros**: More user-friendly, allows multiple devices
- **Cons**: Still allows limited abuse; doesn't prevent concurrent usage within the limit

### Option C: Heartbeat-Based Activation (Active Session Tracking)

- **Pros**: Prevents concurrent usage; allows device migration naturally (just not simultaneously); copied filesystem won't work on different host
- **Cons**: More complex; requires server-side session tracking; crash recovery delay

## Decision

We will implement **heartbeat-based activation** (Option C) using:

1. **Cloudflare Workers** for the activation server (serverless, free tier)
2. **Host-injected machine ID** for device fingerprinting (works in Docker)
3. **5-minute heartbeat interval** with 10-minute stale timeout
4. **TypeScript Caretaker CLI** for key management

## Rationale

1. **Prevents concurrent usage** - Server tracks which device is active; rejects other devices attempting to start
2. **Resilient to copying** - Device fingerprint includes host machine ID, which differs when filesystem is copied
3. **Natural device migration** - User stops on old device, starts on new device (no manual transfer needed)
4. **Crash recovery** - After 10-minute timeout, another device can start (acceptable delay)
5. **Caretaker control** - Keys are issued manually, can be revoked if needed

## Consequences

### Positive

- ✅ **Abuse prevention** - Same key can't run on multiple devices simultaneously
- ✅ **Copying protection** - Filesystem copy to different host won't work
- ✅ **Flexible migration** - Users can move between devices (sequentially)
- ✅ **Caretaker control** - Manual key issuance gates all installations
- ✅ **Low cost** - Cloudflare Workers free tier sufficient for expected scale

### Negative

- ❌ **Requires internet on startup** - App won't start if server unreachable
- ❌ **Crash recovery delay** - 10 minutes before another device can take over
- ❌ **Additional infrastructure** - Cloudflare Worker must be deployed and maintained
- ❌ **Setup complexity** - Users must obtain activation key before installation

### Mitigation

- **Internet requirement**: Acceptable for v0.1; can add grace period in v0.2 if needed
- **Crash delay**: 10 minutes is reasonable; user can wait or contact caretaker
- **Infrastructure**: Cloudflare Workers are low-maintenance; Caretaker CLI simplifies key management
- **Setup complexity**: Clear instructions; activation key entry integrated into existing wizard

## Technical Details

See [Design Document](../../.agents/artifacts/designer/designs/activation-system-design.md) for complete specification including:
- Device fingerprint generation (host machine ID + salt)
- Cloudflare Worker API contracts
- Caretaker CLI structure
- Integration with ADR-011 setup flow

## Related Decisions

- [ADR-011: Installation and Setup Architecture](./011-installation-and-setup.md) - Activation key entry during CLI wizard
- [ADR-014: Simple Token Authentication](./014-simple-token-auth.md) - Similar token pattern for LOGIN_SECRET
- [ADR-002: Environment Variables for Credentials](./002-env-credentials.md) - Activation key stored in `.env`

## References

- Design Doc: `.agents/artifacts/designer/designs/activation-system-design.md`
