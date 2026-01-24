# ADR-014: Simple Token Authentication

## Status

**Accepted** - January 24, 2026

## Context

ADR-011 introduces network access display, enabling users to access ngaj from mobile devices on the same LAN. This creates a security concern: **anyone on the local network can access the dashboard** without authentication.

For a single-user local application, we need basic access control that:

1. **Prevents casual access** - Someone else on the WiFi can't just open the URL
2. **Minimal friction** - Single code entry, stays logged in for the session
3. **No user management** - Single-user app, no need for accounts/passwords
4. **Works on mobile** - Easy to type the code on a phone keyboard

**Design Constraints:**
- Local-first architecture (no external auth providers)
- Secret stored in `.env` file (ADR-002)
- Must work across browser sessions (session cookie)
- Must not block Docker health checks

## Decision

We will implement **session-based token authentication** using a pre-generated secret code stored in `.env`.

### 1. Token Format

**Format**: 16 characters with dashes (e.g., `A1B2-C3D4-E5F6-G7H8`)

**Character Set**: `A-Z`, `0-9`, `_`, `.`, `+`, `:`, `,`, `@` (42 characters total)

**Entropy**: 42^16 ≈ 1.3 × 10^26 combinations

**Generation**: Random from charset, generated during CLI setup wizard (ADR-011)

**Storage**: `.env` file as `LOGIN_SECRET=A1B2-C3D4-E5F6-G7H8`

**Display**: Shown in terminal after setup completion and on every backend start

### 2. Authentication Flow

```
┌─────────────────────────────────────────────────┐
│ 1. User visits any protected route              │
│    (e.g., http://192.168.1.42:3000/dashboard)   │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 2. Backend checks for valid session cookie      │
│    → If valid: Allow access                     │
│    → If missing/invalid: Redirect to /login     │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 3. User sees login page                         │
│    [          Enter access code          ]      │
│    [            Login Button             ]      │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 4. User enters code, submits                    │
│    → Backend validates against LOGIN_SECRET     │
│    → If match: Set session cookie, redirect     │
│    → If mismatch: Show error, stay on login     │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ 5. Session cookie set (HttpOnly, SameSite)      │
│    → Valid until browser closes                 │
│    → User can access all protected routes       │
└─────────────────────────────────────────────────┘
```

### 3. Route Protection

| Route | Protection | Reason |
|-------|------------|--------|
| `/health` | Public | Docker health checks |
| `/login` | Public | Must be accessible to authenticate |
| `/api/auth/login` | Public | Login endpoint |
| `/api/auth/logout` | Protected | Requires session to logout |
| `/api/*` (all other) | Protected | API requires authentication |
| `/*` (all other) | Protected | Dashboard pages require authentication |

### 4. Session Management

**Cookie Properties**:
- `HttpOnly`: Yes (not accessible via JavaScript)
- `SameSite`: Strict (CSRF protection)
- `Secure`: No (localhost/LAN doesn't use HTTPS)
- `Path`: `/`
- `Max-Age`: Session (no expiry, cleared on browser close)

**Session Storage**: In-memory (acceptable for single-user, restarts require re-login)

### 5. Terminal Display

On every backend start (and after initial setup):

```
✓ Backend running

  Local access:   http://localhost:3000
  Network access: http://192.168.1.42:3000
  (Use this URL from your mobile device on the same WiFi)

  Login code: A1B2-C3D4-E5F6-G7H8
  (Enter this code when prompted in your browser)
```

## Rationale

### Why Pre-Generated Token (vs. User-Set Password)?

**Decision**: Pre-generated random token

**Alternatives Considered**:

1. **User-chosen password**
   - ❌ Users pick weak passwords
   - ❌ Additional UI for password setup
   - ❌ Password recovery complexity
   
2. **No authentication**
   - ❌ Anyone on LAN can access
   - ❌ Unacceptable for personal data

**Chosen approach: Pre-generated token** because:
- ✅ Guaranteed entropy (random, not user-chosen)
- ✅ No setup friction (generated automatically)
- ✅ Display in terminal (always accessible on host)
- ✅ Suitable for single-user local app

### Why Session Cookie (vs. JWT, vs. Per-Request Token)?

**Decision**: Session cookie with in-memory storage

**Alternatives Considered**:

1. **JWT tokens**
   - ❌ Overkill for single-user local app
   - ❌ Token in localStorage visible to JavaScript
   - ❌ Harder to invalidate
   
2. **Per-request token (URL param or header)**
   - ❌ Token visible in browser history/logs
   - ❌ Must include in every request (bad UX)
   - ❌ Easy to accidentally share

**Chosen approach: Session cookie** because:
- ✅ Automatic inclusion in requests (browser handles it)
- ✅ HttpOnly protects from XSS
- ✅ Session-scoped (logout on browser close)
- ✅ Simple implementation

### Why In-Memory Session Store (vs. Redis, vs. File)?

**Decision**: In-memory session storage

**Alternatives Considered**:

1. **Redis session store**
   - ❌ Additional dependency
   - ❌ Overkill for single-user
   
2. **File-based sessions**
   - ❌ Complexity with Docker volumes
   - ❌ Security concerns with session files

**Chosen approach: In-memory** because:
- ✅ Zero additional dependencies
- ✅ Fast
- ✅ Sessions cleared on restart (acceptable for v0.1)
- ✅ Single-user means no scaling concerns

## Consequences

### Positive

- ✅ **Basic access control** - Prevents casual access from LAN
- ✅ **Minimal friction** - Enter code once per browser session
- ✅ **No user management** - No accounts, passwords, or recovery flows
- ✅ **Works offline** - No external auth dependencies
- ✅ **Mobile-friendly** - Code format easy to type on phone

### Negative

- ❌ **Restart requires re-login** - In-memory sessions lost on backend restart
- ❌ **Code visible in terminal** - Anyone with host access can see it
- ❌ **No HTTPS** - Token transmitted in clear text on LAN (acceptable for local network)
- ❌ **No brute-force protection** - v0.2 should add rate limiting

### Mitigation

- **Restart re-login**: Acceptable for v0.1; users re-enter code rarely
- **Code visibility**: Host access already implies full system access
- **No HTTPS**: Local network trust model; v0.2 can add mTLS if needed
- **Brute-force**: Add rate limiting in v0.2 (e.g., 5 attempts per minute)

## Implementation Notes

### Token Generation (in Setup Wizard)

```typescript
function generateLoginSecret(): string {
  // Uppercase letters, digits, and shell-safe special chars
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.+:,@';
  const segments: string[] = [];
  for (let i = 0; i < 4; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join('-'); // e.g., "A1B2-C3D4-E5F6-G7H8" or "X@Y.-Z:+,-W_Q."
}
```

### Auth Middleware (Express)

```typescript
function authMiddleware(req, res, next) {
  // Skip public routes
  if (req.path === '/health' || req.path === '/login' || req.path === '/api/auth/login') {
    return next();
  }
  
  // Check session
  if (req.session?.authenticated) {
    return next();
  }
  
  // API requests get 401, page requests redirect
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.redirect('/login');
}
```

### Login Endpoint

```typescript
app.post('/api/auth/login', (req, res) => {
  const { code } = req.body;
  const secret = process.env.LOGIN_SECRET;
  
  if (code === secret) {
    req.session.authenticated = true;
    return res.json({ success: true });
  }
  
  return res.status(401).json({ error: 'Invalid code' });
});
```

## Success Criteria

v0.1 authentication succeeds when:

1. ✅ Login secret generated during setup and written to `.env`
2. ✅ Login secret displayed in terminal on backend start
3. ✅ Unauthenticated access redirects to login page
4. ✅ Valid code grants session cookie and access
5. ✅ Invalid code shows error, stays on login page
6. ✅ Session persists across page navigations
7. ✅ Browser close ends session (requires re-login)
8. ✅ `/health` remains accessible without authentication

## Future Enhancements

### v0.2: Security Improvements
- Rate limiting (max 5 login attempts per minute per IP)
- Login attempt logging
- Optional: Regenerate secret from settings UI

### v0.3: Enhanced Authentication
- Optional PIN/password set by user
- Device remembrance (longer-lived tokens for trusted devices)
- Optional: TOTP/2FA for external network access

## References

- [ADR-002: Environment Variables for Credentials](./002-env-credentials.md) - `.env` storage
- [ADR-011: Installation and Setup Architecture](./011-installation-and-setup.md) - Token generation during setup
- [ADR-005: MVP Scope](./005-mvp-scope.md) - Single-user assumption

## Related Documentation

- Design Doc: `.agents/artifacts/designer/designs/simple-token-auth-design.md`
- Handoff Doc: `.agents/artifacts/designer/handoffs/009-simple-token-auth-handoff.md`
