# Simple Token Authentication - Test Plan

**Handoff Number**: 009
**Feature**: Simple Token Authentication
**Date**: 2026-01-24
**Based on**: [Designer Handoff](../../designer/handoffs/009-simple-token-auth-handoff.md)
**Design Rationale**: [ADR-014](../../../../docs/architecture/decisions/014-simple-token-auth.md)

---

## 1. Test Coverage Summary

| Category | Tests | Focus |
|----------|-------|-------|
| Unit: Token Generation | 10 | Format, randomness, charset validation |
| Unit: Auth Middleware | 25 | Route protection, public/protected routes |
| Unit: Login Page UI | 25 | Form behavior, error handling, loading states |
| Integration: Auth Flow | 30 | Login, logout, session persistence |
| **Total** | **90** | |

---

## 2. Test Categories

### 2.1 Unit Tests: Token Generation (`tests/unit/auth/token-generation.spec.ts`)

**Focus**: Token format validation, randomness, charset correctness

| Test | Description | Priority |
|------|-------------|----------|
| Token format | Returns `XXXX-XXXX-XXXX-XXXX` pattern | Critical |
| Token length | Total 19 chars (16 + 3 dashes) | Critical |
| Valid charset | Only A-Z, 0-9, _, ., +, :, ,, @ | Critical |
| Segment structure | 4 segments of 4 characters | Critical |
| Uniqueness | 100 tokens all unique | Important |
| Non-sequential | Tokens not predictable | Important |
| Randomness distribution | Reasonable char distribution | Nice-to-have |

**Validation Functions**:
| Test | Description | Priority |
|------|-------------|----------|
| isValidLoginSecretFormat | Valid format returns true | Critical |
| Invalid formats | Empty, too short, wrong pattern | Critical |
| normalizeLoginCode | Uppercase and trim | Critical |
| Normalization cases | All edge cases handled | Important |

### 2.2 Unit Tests: Auth Middleware (`tests/unit/auth/auth-middleware.spec.ts`)

**Focus**: Route protection logic, session checking

| Test | Description | Priority |
|------|-------------|----------|
| Public /health | Allows access without session | Critical |
| Public /login | Allows access without session | Critical |
| Public /api/auth/login | Allows POST without session | Critical |
| Public /assets/* | Allows static assets | Important |
| Public /favicon* | Allows favicon | Important |
| Protected / (no session) | Redirects to /login | Critical |
| Protected /dashboard (no session) | Redirects to /login | Critical |
| Protected /api/* (no session) | Returns 401 JSON | Critical |
| Protected with valid session | Allows access | Critical |
| API routes no redirect | Returns JSON error, not redirect | Important |

### 2.3 Unit Tests: Login Page UI (`tests/unit/components/auth/login-page.spec.tsx`)

**Focus**: Component rendering, user interactions, state management

| Test | Description | Priority |
|------|-------------|----------|
| Renders title | Shows "ngaj" | Critical |
| Renders subtitle | Shows instructions | Critical |
| Renders input | Shows placeholder | Critical |
| Renders button | Shows login button | Critical |
| Auto-uppercase | Lowercase → uppercase | Important |
| Form submission | Sends POST request | Critical |
| Success redirect | Navigates to / | Critical |
| Error display | Shows error message | Critical |
| Loading state | Shows "Verifying..." | Important |
| Button disabled | Disabled during load | Important |
| Empty code | Button disabled | Important |
| Error styling | Red color for errors | Nice-to-have |
| Retry after error | Can resubmit | Important |

### 2.4 Integration Tests: Auth Flow (`tests/integration/auth/auth-flow.spec.ts`)

**Focus**: End-to-end authentication flows

**Login Flow**:
| Test | Description | Priority |
|------|-------------|----------|
| Valid code success | Returns 200 + success | Critical |
| Session cookie set | Sets ngaj.sid cookie | Critical |
| HttpOnly flag | Cookie has HttpOnly | Critical |
| SameSite=Strict | Cookie has SameSite | Critical |
| Access after login | Protected routes work | Critical |
| Invalid code 401 | Returns 401 error | Critical |
| Empty code 401 | Returns 401 error | Critical |
| Case insensitive | Lowercase accepted | Important |
| Whitespace trimmed | Spaces trimmed | Important |
| Config error 500 | Missing LOGIN_SECRET | Important |

**Logout Flow**:
| Test | Description | Priority |
|------|-------------|----------|
| Logout success | Returns 200 | Critical |
| Cookie cleared | Session cookie removed | Critical |
| Session invalidated | Can't access protected | Critical |
| Logout without session | Graceful handling | Important |

**Session Persistence**:
| Test | Description | Priority |
|------|-------------|----------|
| Multiple requests | Session persists | Critical |
| No re-auth needed | Cookie sufficient | Critical |

---

## 3. Mock Strategy

### 3.1 Unit Tests

**Token Generation**:
- No mocking needed (pure functions)

**Auth Middleware**:
- Mock `Request`, `Response`, `NextFunction` from Express
- Mock `req.session` with `{ authenticated: boolean }`
- Mock `res.status()`, `res.json()`, `res.redirect()`

**Login Page**:
- Mock `fetch` globally with `vi.fn()`
- Mock `useNavigate` from react-router-dom
- Use `@testing-library/react` for rendering

### 3.2 Integration Tests

**Auth Flow**:
- Use `supertest` with real Express app
- Use `express-session` with in-memory store
- Set `process.env.LOGIN_SECRET` for each test

---

## 4. Test Organization

```
tests/
├── fixtures/
│   └── auth-fixtures.ts          # Shared test data
├── unit/
│   ├── auth/
│   │   ├── token-generation.spec.ts   # Token utils
│   │   └── auth-middleware.spec.ts    # Middleware
│   └── components/
│       └── auth/
│           └── login-page.spec.tsx    # Login UI
└── integration/
    └── auth/
        └── auth-flow.spec.ts          # Full auth flow
```

---

## 5. Dependencies Required

Add to `package.json` devDependencies:

```json
{
  "@testing-library/user-event": "^14.5.0",
  "supertest": "^7.0.0",
  "@types/supertest": "^6.0.0",
  "express-session": "^1.18.0",
  "@types/express-session": "^1.18.0"
}
```

---

## 6. Test Data (Fixtures)

### 6.1 Valid Login Secrets

```typescript
const TEST_LOGIN_SECRET = 'TEST-1234-ABCD-5678';
const validLoginSecrets = [
  'A1B2-C3D4-E5F6-G7H8',
  'XXXX-YYYY-ZZZZ-0000',
  '_.+:-,.@-_.+:-,.@',  // Special chars only
];
```

### 6.2 Invalid Login Secrets

```typescript
const invalidLoginSecrets = {
  empty: '',
  tooShort: 'A1B2-C3D4',
  missingDashes: 'A1B2C3D4E5F6G7H8',
  lowercase: 'a1b2-c3d4-e5f6-g7h8',
  invalidChars: 'A1B!-C3D4-E5F6-G7H8',
};
```

### 6.3 Route Test Data

```typescript
const publicRoutes = ['/health', '/login', '/api/auth/login'];
const protectedRoutes = ['/', '/dashboard', '/settings'];
const protectedApiRoutes = ['/api/opportunities', '/api/accounts'];
```

---

## 7. Test Priorities

### Critical Path (Must Pass)
1. Token format validation
2. Auth middleware route protection
3. Login with valid code succeeds
4. Login with invalid code fails
5. Session cookie set correctly
6. Protected routes require authentication

### Important (Should Pass)
1. Code normalization (case, whitespace)
2. Logout clears session
3. Login page UI renders correctly
4. Error messages display
5. Loading states work

### Nice-to-Have (Can Defer)
1. Token randomness verification (statistical)
2. Error message styling
3. Session lost on browser close (requires E2E)

---

## 8. Known Limitations

1. **Session persistence across restarts**: Not testable in unit tests (in-memory store)
2. **Browser close behavior**: Requires E2E testing with Playwright
3. **Rate limiting**: Deferred to v0.2 (not tested)
4. **HTTPS/TLS**: Not applicable for local network

---

## 9. Running Tests

```bash
# All auth tests
npm test -- tests/unit/auth tests/integration/auth tests/unit/components/auth

# Unit tests only
npm test -- tests/unit/auth tests/unit/components/auth

# Integration tests only
npm test -- tests/integration/auth

# With coverage
npm test -- --coverage tests/unit/auth tests/integration/auth tests/unit/components/auth
```

---

## 10. Success Criteria

- [ ] All 90 tests implemented
- [ ] All tests fail initially (Red phase)
- [ ] Clear error messages on failure
- [ ] No linter errors in test code
- [ ] Test run time < 30 seconds

---

## References

- [Designer Handoff](../../designer/handoffs/009-simple-token-auth-handoff.md)
- [Design Document](../../designer/designs/simple-token-auth-design.md)
- [ADR-014: Simple Token Authentication](../../../../docs/architecture/decisions/014-simple-token-auth.md)
- [Auth Types](../../../../packages/shared/src/types/auth.ts)
