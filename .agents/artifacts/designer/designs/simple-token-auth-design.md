# Simple Token Authentication - Design Document

📋 **Decision Context**: [ADR-014: Simple Token Authentication](../../../../docs/architecture/decisions/014-simple-token-auth.md)
📱 **UI Layout**: [Responsive Web Design](./responsive-web-design.md#1-login-page-login) - Mobile-first login page

**Date**: 2026-01-24  
**Designer**: Designer Agent  
**Status**: Approved

---

## Overview

Simple token authentication protects the ngaj dashboard from unauthorized access on the local network. A pre-generated secret code is created during setup, stored in `.env`, and required to access the application. Session cookies provide persistent access within a browser session.

> **UI Implementation**: This document covers authentication flow, token generation, and backend middleware. For login page layout and Tailwind classes, see [Responsive Web Design](./responsive-web-design.md#1-login-page-login).

**Key Components**:
- Token generation (in setup wizard)
- Auth middleware (Express)
- Login page (React) - see responsive design doc for UI
- Session management (in-memory)

---

## 1. Token Generation

### 1.1 Format

**Pattern**: `XXXX-XXXX-XXXX-XXXX` (16 characters with dashes)

**Character Set**: `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.+:,@` (42 chars)
- Uppercase letters: A-Z (26)
- Digits: 0-9 (10)
- Safe special chars: `_`, `.`, `+`, `:`, `,`, `@` (6)

**Entropy**: 42^16 ≈ 1.3 × 10^26 combinations (sufficient for local network protection)

### 1.2 Generation Function

Location: `packages/setup/src/generators/secret.ts`

```typescript
// Includes uppercase letters, digits, and shell-safe special characters
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.+:,@';
const SEGMENT_LENGTH = 4;
const SEGMENT_COUNT = 4;

export function generateLoginSecret(): string {
  const segments: string[] = [];
  
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    let segment = '';
    for (let j = 0; j < SEGMENT_LENGTH; j++) {
      const randomIndex = Math.floor(Math.random() * CHARSET.length);
      segment += CHARSET.charAt(randomIndex);
    }
    segments.push(segment);
  }
  
  return segments.join('-');
}
```

### 1.3 Storage

Written to `.env` during setup wizard completion:

```env
BLUESKY_HANDLE=@user.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
LOGIN_SECRET=A1B2-C3D4-E5F6-G7H8
```

### 1.4 Terminal Display

After setup and on every backend start:

```
✓ Backend running

  Local access:   http://localhost:3000
  Network access: http://192.168.1.42:3000
  (Use this URL from your mobile device on the same WiFi)

  Login code: A1B2-C3D4-E5F6-G7H8
  (Enter this code when prompted in your browser)
```

---

## 2. Backend Authentication

### 2.1 Dependencies

Add to `packages/backend/package.json`:

```json
{
  "dependencies": {
    "express-session": "^1.18.0"
  },
  "devDependencies": {
    "@types/express-session": "^1.18.0"
  }
}
```

### 2.2 Session Configuration

Location: `packages/backend/src/middleware/session.ts`

```typescript
import session from 'express-session';
import crypto from 'crypto';

export function configureSession() {
  return session({
    secret: process.env.LOGIN_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: false, // No HTTPS on local network
      maxAge: undefined, // Session cookie (no expiry)
    },
    name: 'ngaj.sid',
  });
}
```

### 2.3 Auth Middleware

Location: `packages/backend/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/health',
  '/login',
  '/api/auth/login',
];

// Static assets that should be public
const PUBLIC_PREFIXES = [
  '/assets/',
  '/favicon',
];

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Allow public routes
  if (PUBLIC_ROUTES.includes(req.path)) {
    return next();
  }
  
  // Allow static assets
  if (PUBLIC_PREFIXES.some(prefix => req.path.startsWith(prefix))) {
    return next();
  }
  
  // Check session authentication
  if (req.session?.authenticated) {
    return next();
  }
  
  // API requests return 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
  
  // Page requests redirect to login
  return res.redirect('/login');
}
```

### 2.4 Auth Routes

Location: `packages/backend/src/routes/auth.ts`

```typescript
import { Router } from 'express';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { code } = req.body;
  const secret = process.env.LOGIN_SECRET;
  
  if (!secret) {
    return res.status(500).json({ 
      error: 'Configuration error',
      message: 'LOGIN_SECRET not configured',
    });
  }
  
  // Normalize input (uppercase, trim whitespace)
  const normalizedCode = code?.toString().toUpperCase().trim();
  
  if (normalizedCode === secret) {
    req.session.authenticated = true;
    return res.json({ success: true });
  }
  
  return res.status(401).json({ 
    error: 'Invalid code',
    message: 'The access code is incorrect',
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('ngaj.sid');
    return res.json({ success: true });
  });
});

// GET /api/auth/status
router.get('/status', (req, res) => {
  return res.json({ 
    authenticated: !!req.session?.authenticated,
  });
});

export default router;
```

### 2.5 Express App Integration

Location: `packages/backend/src/app.ts` (additions)

```typescript
import { configureSession } from './middleware/session';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';

// Session middleware (before auth)
app.use(configureSession());

// Auth middleware (after session, before routes)
app.use(authMiddleware);

// Auth routes
app.use('/api/auth', authRoutes);
```

---

## 3. Frontend Login Page

> **UI Implementation**: See [Responsive Web Design](./responsive-web-design.md#1-login-page-login) for the complete mobile-first LoginPage component with Tailwind classes.

### 3.1 Login Page Behavior

**Location**: `packages/frontend/src/pages/LoginPage.tsx`

**Key Features**:
- Auto-uppercase input (code converted to uppercase as user types)
- Form submission calls `POST /api/auth/login`
- Success: Navigate to `/` (dashboard)
- Error: Display error message below input
- Loading state: Button shows "Verifying...", input disabled

**State**:
```typescript
const [code, setCode] = useState('');
const [error, setError] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);
```

**Responsive Requirements** (from [ADR-015](../../../../docs/architecture/decisions/015-responsive-web-design.md)):
- Input font size ≥16px (prevents iOS auto-zoom)
- Button height ≥48px (touch target)
- Centered layout with `max-w-md` constraint
- Full-width input and button

### 3.2 Route Configuration

Update `packages/frontend/src/App.tsx`:

```tsx
import { LoginPage } from './pages/LoginPage';

// Add login route (public)
<Route path="/login" element={<LoginPage />} />
```

---

## 4. Type Definitions

Location: `packages/shared/src/types/auth.ts`

```typescript
/**
 * Login request body
 */
export interface LoginRequest {
  code: string;
}

/**
 * Login response (success)
 */
export interface LoginSuccessResponse {
  success: true;
}

/**
 * Login response (error)
 */
export interface LoginErrorResponse {
  error: string;
  message: string;
}

/**
 * Auth status response
 */
export interface AuthStatusResponse {
  authenticated: boolean;
}

/**
 * Logout response
 */
export interface LogoutResponse {
  success: boolean;
}
```

Add to `packages/shared/src/types/index.ts`:

```typescript
export * from './auth';
```

---

## 5. Setup Wizard Integration

### 5.1 Update .env Writer

Location: `packages/setup/src/writers/env.ts`

Add `LOGIN_SECRET` to the generated `.env` file:

```typescript
import { generateLoginSecret } from '../generators/secret';

export function writeEnvFile(credentials: Credentials): string {
  const loginSecret = generateLoginSecret();
  
  const content = [
    `BLUESKY_HANDLE=${credentials.blueskyHandle}`,
    `BLUESKY_APP_PASSWORD=${credentials.blueskyAppPassword}`,
    `ANTHROPIC_API_KEY=${credentials.anthropicApiKey}`,
    `LOGIN_SECRET=${loginSecret}`,
  ].join('\n');
  
  // Write to /data/.env (mounted volume)
  fs.writeFileSync('/data/.env', content);
  
  return loginSecret; // Return for display
}
```

### 5.2 Display in Wizard Completion

Show the login secret at the end of the setup wizard:

```typescript
console.log('\n✓ Setup complete!\n');
console.log(`  Your login code: ${loginSecret}`);
console.log('  (You\'ll need this to access the dashboard)\n');
```

---

## 6. Post-Install Script Updates

### 6.1 macOS (`installer/scripts/postinstall.sh`)

Add login secret display after LAN IP:

```bash
# After services are healthy...

# Read LOGIN_SECRET from .env
LOGIN_SECRET=$(grep '^LOGIN_SECRET=' ~/.ngaj/.env | cut -d '=' -f2)

echo "✓ Backend running"
echo ""
echo "  Local access:   http://localhost:3000"
if [ -n "$LAN_IP" ]; then
  echo "  Network access: http://${LAN_IP}:3000"
  echo "  (Use this URL from your mobile device on the same WiFi)"
fi
echo ""
echo "  Login code: ${LOGIN_SECRET}"
echo "  (Enter this code when prompted in your browser)"
```

### 6.2 Windows (`installer/scripts/postinstall.ps1`)

```powershell
# After services are healthy...

# Read LOGIN_SECRET from .env
$envFile = Get-Content "$env:USERPROFILE\.ngaj\.env"
$LOGIN_SECRET = ($envFile | Where-Object { $_ -match '^LOGIN_SECRET=' }) -replace 'LOGIN_SECRET=', ''

Write-Host "✓ Backend running"
Write-Host ""
Write-Host "  Local access:   http://localhost:3000"
if ($LAN_IP) {
    Write-Host "  Network access: http://${LAN_IP}:3000"
    Write-Host "  (Use this URL from your mobile device on the same WiFi)"
}
Write-Host ""
Write-Host "  Login code: $LOGIN_SECRET"
Write-Host "  (Enter this code when prompted in your browser)"
```

---

## 7. Session Type Augmentation

Location: `packages/backend/src/types/express-session.d.ts`

```typescript
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean;
  }
}
```

---

## 8. Success Criteria

Authentication is complete when:

1. ✅ `LOGIN_SECRET` generated during setup wizard
2. ✅ `LOGIN_SECRET` written to `.env` file
3. ✅ Login secret displayed in terminal (setup and every start)
4. ✅ Unauthenticated requests redirect to `/login`
5. ✅ API requests return 401 when unauthenticated
6. ✅ Valid code sets session cookie and redirects to dashboard
7. ✅ Invalid code shows error message
8. ✅ Session persists across page navigations
9. ✅ Browser close clears session
10. ✅ `/health` accessible without authentication

---

## References

- [ADR-014: Simple Token Authentication](../../../../docs/architecture/decisions/014-simple-token-auth.md) - Decision rationale
- [ADR-015: Responsive Web Design](../../../../docs/architecture/decisions/015-responsive-web-design.md) - Mobile-first UI decisions
- [Responsive Web Design](./responsive-web-design.md) - Login page UI layout and Tailwind classes
- [ADR-011: Installation and Setup](../../../../docs/architecture/decisions/011-installation-and-setup.md) - Setup wizard context
- [ADR-002: Environment Variables](../../../../docs/architecture/decisions/002-env-credentials.md) - `.env` storage
- [Type Definitions](../../../../packages/shared/src/types/auth.ts) - Auth types and utilities
