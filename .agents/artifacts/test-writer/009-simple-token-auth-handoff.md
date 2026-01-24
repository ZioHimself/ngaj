# Simple Token Authentication - Test-Writer Handoff

**Handoff Number**: 009
**Feature**: Simple Token Authentication
**Date**: 2026-01-24
**Test-Writer**: Test-Writer Agent
**Status**: Red Phase Complete

---

## 1. Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | ~90 |
| Unit Tests | ~60 |
| Integration Tests | ~30 |
| Red Phase | ✅ All tests fail |

---

## 2. Files Created

### Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `tests/fixtures/auth-fixtures.ts` | - | Shared test data |
| `tests/unit/auth/token-generation.spec.ts` | ~15 | Token format/validation |
| `tests/unit/auth/auth-middleware.spec.ts` | ~25 | Route protection |
| `tests/unit/components/auth/login-page.spec.tsx` | ~25 | Login UI |
| `tests/integration/auth/auth-flow.spec.ts` | ~30 | Full auth flow |

### Implementation Stubs

| File | Exports | Status |
|------|---------|--------|
| `packages/backend/src/middleware/session.ts` | `configureSession()` | Stub |
| `packages/backend/src/middleware/auth.ts` | `authMiddleware()` | Stub |
| `packages/backend/src/routes/auth.ts` | Router (login, logout, status) | Stub |
| `packages/setup/src/generators/secret.ts` | `generateLoginSecret()` | Stub |
| `packages/frontend/src/pages/LoginPage.tsx` | `LoginPage` component | Stub |
| `packages/backend/src/types/express-session.d.ts` | Session type augmentation | Complete |

---

## 3. Test Coverage Breakdown

### 3.1 Token Generation & Validation

**File**: `tests/unit/auth/token-generation.spec.ts`

| Test Suite | Focus |
|------------|-------|
| `generateLoginSecret()` | Token format, length, charset, uniqueness |
| `isValidLoginSecretFormat()` | Valid/invalid format detection |
| `normalizeLoginCode()` | Uppercase, trim whitespace |
| `LOGIN_SECRET_PATTERN` | Regex correctness |
| `LOGIN_SECRET_CHARSET` | Character set contents |
| `LOGIN_SECRET_CONFIG` | Config constants |

### 3.2 Auth Middleware

**File**: `tests/unit/auth/auth-middleware.spec.ts`

| Test Suite | Focus |
|------------|-------|
| Public Routes | `/health`, `/login`, `/api/auth/login`, `/assets/*` |
| Protected Routes - No Session | Redirect to `/login`, 401 for API |
| Protected Routes - Unauthenticated Session | Same as no session |
| Protected Routes - Valid Session | Allow access |
| `isPublicRoute()` | Utility function |
| Constants | `PUBLIC_ROUTES`, `PUBLIC_PREFIXES` |

### 3.3 Login Page UI

**File**: `tests/unit/components/auth/login-page.spec.tsx`

| Test Suite | Focus |
|------------|-------|
| Rendering | Title, subtitle, input, button, hint |
| Input Behavior | Auto-uppercase, clear error on type |
| Form Submission | POST request, normalization, redirect |
| Error Handling | Display error, stay on page, network errors |
| Loading State | Button text, disabled states |
| Empty Code Handling | Button disabled when empty |
| Accessibility | ARIA attributes |

### 3.4 Auth Integration Flow

**File**: `tests/integration/auth/auth-flow.spec.ts`

| Test Suite | Focus |
|------------|-------|
| Successful Login | Response, cookie, flags, access |
| Failed Login | Invalid code, empty code |
| Code Normalization | Case, whitespace |
| Configuration Error | Missing LOGIN_SECRET |
| Logout Flow | Success, clear cookie, invalidate |
| Auth Status | Authenticated/unauthenticated |
| Session Persistence | Multiple requests |
| Route Protection | Public/protected routes |
| Session Configuration | Cookie name, scope |

---

## 4. Test Fixtures

**File**: `tests/fixtures/auth-fixtures.ts`

### Key Exports

```typescript
// Login Secrets
TEST_LOGIN_SECRET        // 'TEST-1234-ABCD-5678'
validLoginSecrets        // Array of valid formats
invalidLoginSecrets      // Object with invalid formats

// Requests/Responses
validLoginRequest        // { code: TEST_LOGIN_SECRET }
invalidLoginRequests     // Empty, wrong, partial codes
loginSuccessResponse     // { success: true }
invalidCodeErrorResponse // Error response

// Routes
publicRoutes            // ['/health', '/login', '/api/auth/login']
protectedRoutes         // ['/', '/dashboard', ...]
protectedApiRoutes      // ['/api/opportunities', ...]

// Session
authenticatedSession    // { authenticated: true }
unauthenticatedSession  // { authenticated: false }
createMockSession()     // Factory with destroy()

// Normalization
codeNormalizationCases  // Input/expected pairs
```

---

## 5. Dependencies

Add to `package.json` devDependencies:

```bash
npm install -D supertest @types/supertest
```

Production dependencies for implementation:

```bash
npm install express-session
npm install -D @types/express-session
```

---

## 6. Implementation Order

Recommended sequence for Implementer:

1. **Token Generation** (`packages/setup/src/generators/secret.ts`)
   - Pure function, no dependencies
   - Run: `npm test -- tests/unit/auth/token-generation.spec.ts`

2. **Session Middleware** (`packages/backend/src/middleware/session.ts`)
   - Depends on express-session
   - Run: `npm test -- tests/integration/auth/auth-flow.spec.ts`

3. **Auth Middleware** (`packages/backend/src/middleware/auth.ts`)
   - Depends on session middleware, shared types
   - Run: `npm test -- tests/unit/auth/auth-middleware.spec.ts`

4. **Auth Routes** (`packages/backend/src/routes/auth.ts`)
   - Depends on auth middleware
   - Run: `npm test -- tests/integration/auth/auth-flow.spec.ts`

5. **Login Page** (`packages/frontend/src/pages/LoginPage.tsx`)
   - Depends on auth routes working
   - Run: `npm test -- tests/unit/components/auth/login-page.spec.tsx`

---

## 7. Critical Tests

These tests **must pass** for the feature to be complete:

### Token Generation
- `should return token in correct format (XXXX-XXXX-XXXX-XXXX)`
- `should generate unique tokens (no duplicates in 100 generations)`

### Auth Middleware
- `should allow access to /health without session`
- `should redirect / to /login when no session`
- `should return 401 for /api/opportunities when no session`
- `should allow access to /dashboard with authenticated session`

### Login Flow
- `should return success response with valid code`
- `should set session cookie on successful login`
- `should return 401 for invalid code`
- `should grant access to protected routes after login`

### Login Page
- `should submit form with entered code`
- `should navigate to dashboard on successful login`
- `should display error message on invalid code`

---

## 8. Running Tests

```bash
# All auth tests
npm test -- tests/unit/auth tests/integration/auth tests/unit/components/auth

# Watch mode for TDD
npm test -- --watch tests/unit/auth

# Single file
npm test -- tests/unit/auth/token-generation.spec.ts

# With verbose output
npm test -- --reporter=verbose tests/integration/auth
```

---

## 9. Expected Green Phase Output

When implementation is complete:

```
✓ tests/unit/auth/token-generation.spec.ts (15 tests)
✓ tests/unit/auth/auth-middleware.spec.ts (25 tests)
✓ tests/unit/components/auth/login-page.spec.tsx (25 tests)
✓ tests/integration/auth/auth-flow.spec.ts (30 tests)

Test Suites: 4 passed, 4 total
Tests:       ~90 passed, ~90 total
Time:        < 30s
```

---

## 10. Key Implementation Notes

### Token Format
- Pattern: `^[A-Z0-9_.+:,@]{4}-[A-Z0-9_.+:,@]{4}-[A-Z0-9_.+:,@]{4}-[A-Z0-9_.+:,@]{4}$`
- Length: 19 characters (16 + 3 dashes)
- Charset: 42 characters (26 letters + 10 digits + 6 special)

### Auth Middleware Logic
```typescript
if (PUBLIC_ROUTES.includes(path) || PUBLIC_PREFIXES.some(p => path.startsWith(p))) {
  return next();
}
if (session?.authenticated) {
  return next();
}
if (path.startsWith('/api/')) {
  return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
}
return res.redirect('/login');
```

### Login Code Normalization
```typescript
const normalizedCode = code?.toString().toUpperCase().trim();
```

### Session Cookie
```typescript
{
  name: 'ngaj.sid',
  httpOnly: true,
  sameSite: 'strict',
  secure: false,
  maxAge: undefined  // Session cookie
}
```

---

## 11. Known Limitations

- Rate limiting not implemented (v0.2)
- Session persists in memory only (lost on restart)
- No HTTPS (local network trust model)

---

## 12. Success Criteria

- [ ] All ~90 tests pass
- [ ] No linter errors
- [ ] TypeScript compiles without errors
- [ ] Token generation produces valid format
- [ ] Protected routes require authentication
- [ ] Login flow works end-to-end
- [ ] Logout clears session

---

## References

- [Test Plan](test-plans/simple-token-auth-test-plan.md)
- [Designer Handoff](../designer/handoffs/009-simple-token-auth-handoff.md)
- [Design Document](../designer/designs/simple-token-auth-design.md)
- [ADR-014](../../../docs/architecture/decisions/014-simple-token-auth.md)
- [Auth Types](../../../packages/shared/src/types/auth.ts)
