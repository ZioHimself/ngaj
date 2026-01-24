# Simple Token Authentication - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-014: Simple Token Authentication](../../../../docs/architecture/decisions/014-simple-token-auth.md)
🔗 **Technical Specs**: [Design Document](../designs/simple-token-auth-design.md)

## Overview

Simple token authentication protects the ngaj dashboard using a pre-generated secret code. Testing must verify token generation, session management, route protection, and the login UI. Focus on security boundaries, edge cases, and UX flows.

---

## 1. Test Scope

### In Scope
- ✅ Token generation (format, randomness)
- ✅ `.env` file integration (write during setup, read by backend)
- ✅ Session middleware (cookie management)
- ✅ Auth middleware (route protection)
- ✅ Login endpoint (validation, session creation)
- ✅ Logout endpoint (session destruction)
- ✅ Login page UI (form, error handling)
- ✅ Terminal display (login code shown on start)

### Out of Scope (v0.1)
- ❌ Rate limiting (deferred to v0.2)
- ❌ Brute-force protection (deferred to v0.2)
- ❌ Secret regeneration from UI (deferred to v0.2)
- ❌ HTTPS/TLS (local network trust model)

---

## 2. Test Scenarios

### 2.1 Unit Tests: Token Generation

See [Design Doc Section 1](../designs/simple-token-auth-design.md#1-token-generation) for implementation.

#### Scenario 2.1.1: Token Format

**Given**: Token generation function called
**When**: `generateLoginSecret()` executes
**Then**: Returns token in correct format

**Acceptance Criteria**:
- [ ] Returns string matching pattern `^[A-Z0-9_.+:,@]{4}-[A-Z0-9_.+:,@]{4}-[A-Z0-9_.+:,@]{4}-[A-Z0-9_.+:,@]{4}$`
- [ ] Total length is 19 characters (16 from charset + 3 dashes)
- [ ] Contains only uppercase letters, digits, and safe special chars (`_`, `.`, `+`, `:`, `,`, `@`)

**Test Cases**:
```typescript
const token = generateLoginSecret();
expect(token).toMatch(/^[A-Z0-9_.+:,@]{4}-[A-Z0-9_.+:,@]{4}-[A-Z0-9_.+:,@]{4}-[A-Z0-9_.+:,@]{4}$/);
expect(token.length).toBe(19);
```

---

#### Scenario 2.1.2: Token Randomness

**Given**: Token generation function called multiple times
**When**: 100 tokens are generated
**Then**: All tokens are unique

**Acceptance Criteria**:
- [ ] No duplicate tokens in 100 generations
- [ ] Tokens are not sequential or predictable

---

### 2.2 Unit Tests: Auth Middleware

See [Design Doc Section 2.3](../designs/simple-token-auth-design.md#23-auth-middleware) for implementation.

#### Scenario 2.2.1: Public Route - Health Check

**Given**: Request to `/health` without session
**When**: Auth middleware processes request
**Then**: Request passes through (no redirect)

**Acceptance Criteria**:
- [ ] `/health` returns 200 without authentication
- [ ] No redirect to `/login`
- [ ] No 401 response

---

#### Scenario 2.2.2: Public Route - Login Page

**Given**: Request to `/login` without session
**When**: Auth middleware processes request
**Then**: Request passes through (no redirect)

**Acceptance Criteria**:
- [ ] `/login` is accessible without authentication
- [ ] Login page renders correctly

---

#### Scenario 2.2.3: Public Route - Login API

**Given**: POST request to `/api/auth/login` without session
**When**: Auth middleware processes request
**Then**: Request passes through to login handler

**Acceptance Criteria**:
- [ ] Login endpoint accepts requests without session
- [ ] Can submit login code without prior authentication

---

#### Scenario 2.2.4: Protected Route - Dashboard (No Session)

**Given**: Request to `/dashboard` without session
**When**: Auth middleware processes request
**Then**: Redirects to `/login`

**Acceptance Criteria**:
- [ ] Response is 302 redirect
- [ ] Redirect location is `/login`
- [ ] No access to dashboard content

---

#### Scenario 2.2.5: Protected Route - API (No Session)

**Given**: Request to `/api/opportunities` without session
**When**: Auth middleware processes request
**Then**: Returns 401 Unauthorized

**Acceptance Criteria**:
- [ ] Response status is 401
- [ ] Response body contains `{ error: 'Unauthorized' }`
- [ ] No redirect (API responses don't redirect)

---

#### Scenario 2.2.6: Protected Route - With Valid Session

**Given**: Request to `/dashboard` with valid session cookie
**When**: Auth middleware processes request
**Then**: Request passes through (access granted)

**Acceptance Criteria**:
- [ ] Request proceeds to route handler
- [ ] No redirect
- [ ] Dashboard content accessible

---

### 2.3 Integration Tests: Login Flow

See [Design Doc Section 2.4](../designs/simple-token-auth-design.md#24-auth-routes) for implementation.

#### Scenario 2.3.1: Successful Login

**Given**: Login page displayed, `LOGIN_SECRET=A1B2-C3D4-E5F6-G7H8` in env
**When**: User enters `A1B2-C3D4-E5F6-G7H8` and submits
**Then**: Session created, redirected to dashboard

**Acceptance Criteria**:
- [ ] POST `/api/auth/login` returns `{ success: true }`
- [ ] Response sets `ngaj.sid` session cookie
- [ ] Cookie has `HttpOnly` flag
- [ ] Cookie has `SameSite=Strict`
- [ ] User redirected to `/` (dashboard)
- [ ] Subsequent requests to protected routes succeed

---

#### Scenario 2.3.2: Failed Login - Invalid Code

**Given**: Login page displayed, `LOGIN_SECRET=A1B2-C3D4-E5F6-G7H8` in env
**When**: User enters `WRONG-CODE-HERE-1234` and submits
**Then**: Error displayed, no session created

**Acceptance Criteria**:
- [ ] POST `/api/auth/login` returns 401
- [ ] Response body contains error message
- [ ] No session cookie set
- [ ] User remains on login page
- [ ] Error message displayed in UI

---

#### Scenario 2.3.3: Failed Login - Empty Code

**Given**: Login page displayed
**When**: User submits without entering code
**Then**: Form validation prevents submission or API returns error

**Acceptance Criteria**:
- [ ] Login button disabled when input empty, OR
- [ ] API returns 401 with appropriate message
- [ ] No session created

---

#### Scenario 2.3.4: Login Code Normalization

**Given**: `LOGIN_SECRET=A1B2-C3D4-E5F6-G7H8` in env
**When**: User enters `a1b2-c3d4-e5f6-g7h8` (lowercase)
**Then**: Login succeeds (case-insensitive)

**Acceptance Criteria**:
- [ ] Input normalized to uppercase before comparison
- [ ] Lowercase input accepted
- [ ] Mixed case input accepted

---

#### Scenario 2.3.5: Login Code with Extra Whitespace

**Given**: `LOGIN_SECRET=A1B2-C3D4-E5F6-G7H8` in env
**When**: User enters `  A1B2-C3D4-E5F6-G7H8  ` (with spaces)
**Then**: Login succeeds (whitespace trimmed)

**Acceptance Criteria**:
- [ ] Leading/trailing whitespace trimmed
- [ ] Login succeeds with trimmed input

---

### 2.4 Integration Tests: Logout Flow

#### Scenario 2.4.1: Successful Logout

**Given**: User is logged in with valid session
**When**: User calls POST `/api/auth/logout`
**Then**: Session destroyed, cookie cleared

**Acceptance Criteria**:
- [ ] POST `/api/auth/logout` returns `{ success: true }`
- [ ] Session cookie cleared
- [ ] Subsequent requests to protected routes fail (401 or redirect)

---

#### Scenario 2.4.2: Logout Without Session

**Given**: No active session
**When**: POST `/api/auth/logout` called
**Then**: Returns success (idempotent) or appropriate response

**Acceptance Criteria**:
- [ ] Does not error
- [ ] Returns 200 or 401 (implementation choice)

---

### 2.5 Integration Tests: Session Persistence

#### Scenario 2.5.1: Session Persists Across Requests

**Given**: User logged in successfully
**When**: User navigates to multiple protected pages
**Then**: Remains authenticated

**Acceptance Criteria**:
- [ ] Session cookie sent with each request
- [ ] No re-authentication required
- [ ] All protected routes accessible

---

#### Scenario 2.5.2: Session Lost on Browser Close

**Given**: User logged in, session cookie is session-scoped
**When**: Browser closed and reopened
**Then**: Session invalid, must re-authenticate

**Acceptance Criteria**:
- [ ] Session cookie has no `Max-Age` or `Expires`
- [ ] New browser session has no valid cookie
- [ ] Access to protected routes redirects to login

**Note**: This test may require manual verification or browser automation.

---

#### Scenario 2.5.3: Session Lost on Backend Restart

**Given**: User logged in, backend using in-memory sessions
**When**: Backend restarts
**Then**: Session invalid (in-memory storage cleared)

**Acceptance Criteria**:
- [ ] After restart, existing session cookies invalid
- [ ] User must re-authenticate
- [ ] No error (graceful handling)

---

### 2.6 Unit Tests: Login Page UI

See [Design Doc Section 3](../designs/simple-token-auth-design.md#3-frontend-login-page) for implementation.

#### Scenario 2.6.1: Login Page Renders

**Given**: User navigates to `/login`
**When**: Page loads
**Then**: Login form displayed correctly

**Acceptance Criteria**:
- [ ] Title "ngaj" displayed
- [ ] Subtitle "Enter your access code to continue" displayed
- [ ] Input field with placeholder `XXXX-XXXX-XXXX-XXXX`
- [ ] Login button present
- [ ] Hint text about finding code in terminal

---

#### Scenario 2.6.2: Input Auto-Uppercase

**Given**: Login form displayed
**When**: User types lowercase characters
**Then**: Input converted to uppercase

**Acceptance Criteria**:
- [ ] `a1b2` displays as `A1B2`
- [ ] Real-time conversion as user types

---

#### Scenario 2.6.3: Error Message Display

**Given**: User submitted invalid code
**When**: API returns 401
**Then**: Error message displayed

**Acceptance Criteria**:
- [ ] Error message visible below input
- [ ] Error styled in error color
- [ ] Input remains editable for retry

---

#### Scenario 2.6.4: Loading State

**Given**: User submits login form
**When**: Waiting for API response
**Then**: Loading state displayed

**Acceptance Criteria**:
- [ ] Button shows "Verifying..." text
- [ ] Button disabled during request
- [ ] Input disabled during request

---

### 2.7 Integration Tests: Setup Wizard

#### Scenario 2.7.1: Token Generated During Setup

**Given**: Setup wizard running in container
**When**: Setup completes successfully
**Then**: `LOGIN_SECRET` written to `.env`

**Acceptance Criteria**:
- [ ] `.env` file contains `LOGIN_SECRET=XXXX-XXXX-XXXX-XXXX`
- [ ] Token matches expected format
- [ ] Token displayed in wizard completion message

---

### 2.8 Integration Tests: Terminal Display

#### Scenario 2.8.1: Login Code Shown on Backend Start

**Given**: Backend starting, `.env` contains `LOGIN_SECRET`
**When**: Backend becomes healthy
**Then**: Login code displayed in terminal

**Acceptance Criteria**:
- [ ] Terminal output includes "Login code: XXXX-XXXX-XXXX-XXXX"
- [ ] Hint text about entering code in browser

---

## 3. Test Data and Fixtures

### 3.1 Valid Test Credentials

```typescript
const TEST_LOGIN_SECRET = 'TEST-1234-ABCD-5678';

// Set in test environment
process.env.LOGIN_SECRET = TEST_LOGIN_SECRET;
```

### 3.2 Invalid Test Inputs

```typescript
const INVALID_CODES = [
  '',                           // Empty
  'wrong',                      // Too short
  'XXXX-XXXX-XXXX-XXX',        // Missing character
  'XXXX-XXXX-XXXX-XXXXX',      // Extra character
  'XXXX XXXX XXXX XXXX',       // Spaces instead of dashes
  '1234-5678-9012-345!',       // Special character
];
```

### 3.3 Mock Session Store

For unit tests, mock the session middleware:

```typescript
const mockSession = {
  authenticated: false,
  destroy: jest.fn((cb) => cb()),
};
```

---

## 4. Test Environment Setup

### 4.1 Unit Tests

- Mock `express-session` middleware
- Mock environment variables
- No actual HTTP requests

### 4.2 Integration Tests

- In-memory session store (default)
- Test `.env` file with known `LOGIN_SECRET`
- Supertest for HTTP requests

### 4.3 E2E Tests

- Full backend running
- Browser automation (Playwright/Cypress)
- Real session cookies

---

## 5. Priority and Test Coverage

### Critical Path (Must Pass)
- ✅ Token generation format
- ✅ Auth middleware route protection
- ✅ Login with valid code succeeds
- ✅ Login with invalid code fails
- ✅ Session cookie set correctly
- ✅ Protected routes require authentication

### Important (Should Pass)
- ✅ Code normalization (case, whitespace)
- ✅ Logout clears session
- ✅ Login page UI renders correctly
- ✅ Error messages display

### Nice-to-Have (Can Defer)
- ⚠️ Session lost on browser close (manual test)
- ⚠️ Session lost on backend restart
- ⚠️ Token randomness verification

---

## 6. Acceptance Criteria Summary

Authentication succeeds when:

1. ✅ `LOGIN_SECRET` generated in correct format (XXXX-XXXX-XXXX-XXXX)
2. ✅ `LOGIN_SECRET` written to `.env` during setup
3. ✅ Login code displayed in terminal on backend start
4. ✅ `/health` accessible without authentication
5. ✅ `/login` accessible without authentication
6. ✅ All other routes require authentication
7. ✅ Valid code creates session and grants access
8. ✅ Invalid code returns error, no session created
9. ✅ Session persists across page navigations
10. ✅ Logout destroys session

---

## References

- [Design Document](../designs/simple-token-auth-design.md) - Complete technical specifications
- [ADR-014: Simple Token Authentication](../../../../docs/architecture/decisions/014-simple-token-auth.md) - Decision rationale
- [ADR-011: Installation and Setup](../../../../docs/architecture/decisions/011-installation-and-setup.md) - Setup wizard context
