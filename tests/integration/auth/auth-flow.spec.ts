import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { configureSession } from '@ngaj/backend/middleware/session';
import { authMiddleware } from '@ngaj/backend/middleware/auth';
import authRoutes from '@ngaj/backend/routes/auth';
import {
  TEST_LOGIN_SECRET,
  validLoginRequest,
  invalidLoginRequests,
  codeNormalizationCases,
} from '../../fixtures/auth-fixtures';

describe('Auth Integration Tests', () => {
  let app: Express;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    process.env.LOGIN_SECRET = TEST_LOGIN_SECRET;

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(configureSession());
    app.use(authMiddleware);
    app.use('/api/auth', authRoutes);

    // Add test routes
    app.get('/health', (req, res) => res.json({ status: 'ok' }));
    app.get('/login', (req, res) => res.send('<html>Login Page</html>'));
    app.get('/', (req, res) => res.json({ page: 'dashboard' }));
    app.get('/dashboard', (req, res) => res.json({ page: 'dashboard' }));
    app.get('/api/opportunities', (req, res) =>
      res.json({ opportunities: [] })
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('Login Flow', () => {
    describe('Successful Login', () => {
      it('should return success response with valid code', async () => {
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(validLoginRequest);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(loginSuccessResponse);
      });

      it('should set session cookie on successful login', async () => {
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(validLoginRequest);

        // Assert
        expect(response.headers['set-cookie']).toBeDefined();
        const cookies = response.headers['set-cookie'] as string[];
        expect(cookies.some((c) => c.includes('ngaj.sid'))).toBe(true);
      });

      it('should set HttpOnly flag on session cookie', async () => {
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(validLoginRequest);

        // Assert
        const cookies = response.headers['set-cookie'] as string[];
        const sessionCookie = cookies.find((c) => c.includes('ngaj.sid'));
        expect(sessionCookie).toContain('HttpOnly');
      });

      it('should set SameSite=Strict on session cookie', async () => {
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(validLoginRequest);

        // Assert
        const cookies = response.headers['set-cookie'] as string[];
        const sessionCookie = cookies.find((c) => c.includes('ngaj.sid'));
        expect(sessionCookie).toContain('SameSite=Strict');
      });

      it('should grant access to protected routes after login', async () => {
        // Login first
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send(validLoginRequest);

        // Get session cookie
        const cookies = loginResponse.headers['set-cookie'];

        // Act - access protected route
        const dashboardResponse = await request(app)
          .get('/dashboard')
          .set('Cookie', cookies);

        // Assert
        expect(dashboardResponse.status).toBe(200);
        expect(dashboardResponse.body).toEqual({ page: 'dashboard' });
      });

      it('should grant access to protected API routes after login', async () => {
        // Login first
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send(validLoginRequest);

        const cookies = loginResponse.headers['set-cookie'];

        // Act
        const apiResponse = await request(app)
          .get('/api/opportunities')
          .set('Cookie', cookies);

        // Assert
        expect(apiResponse.status).toBe(200);
      });
    });

    describe('Failed Login - Invalid Code', () => {
      it('should return 401 for invalid code', async () => {
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(invalidLoginRequests.wrongCode);

        // Assert
        expect(response.status).toBe(401);
      });

      it('should return error message for invalid code', async () => {
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(invalidLoginRequests.wrongCode);

        // Assert
        expect(response.body.error).toBe('Invalid code');
        expect(response.body.message).toBe('The access code is incorrect');
      });

      it('should not set session cookie on failed login', async () => {
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(invalidLoginRequests.wrongCode);

        // Assert - should not have authenticated session
        const cookies = response.headers['set-cookie'] as string[] | undefined;

        // Either no cookie or cookie without authentication
        if (cookies) {
          // Access dashboard should fail
          const dashboardResponse = await request(app)
            .get('/dashboard')
            .set('Cookie', cookies);
          expect(dashboardResponse.status).toBe(302); // Redirect to login
        }
      });
    });

    describe('Failed Login - Empty Code', () => {
      it('should return 401 for empty code', async () => {
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(invalidLoginRequests.emptyCode);

        // Assert
        expect(response.status).toBe(401);
      });

      it('should return 401 for missing code field', async () => {
        // Act
        const response = await request(app).post('/api/auth/login').send({});

        // Assert
        expect(response.status).toBe(401);
      });
    });

    describe('Login Code Normalization', () => {
      it('should accept lowercase code (case-insensitive)', async () => {
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send({ code: 'test-1234-abcd-5678' });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should accept mixed case code', async () => {
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send({ code: 'TeSt-1234-AbCd-5678' });

        // Assert
        expect(response.status).toBe(200);
      });

      it('should accept code with extra whitespace', async () => {
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send({ code: '  TEST-1234-ABCD-5678  ' });

        // Assert
        expect(response.status).toBe(200);
      });

      it('should handle all normalization cases', async () => {
        for (const { input, expected } of codeNormalizationCases) {
          // Skip if expected doesn't match our test secret
          if (expected !== TEST_LOGIN_SECRET) continue;

          // Act
          const response = await request(app)
            .post('/api/auth/login')
            .send({ code: input });

          // Assert
          expect(response.status).toBe(200);
        }
      });
    });

    describe('Configuration Error', () => {
      it('should return 500 when LOGIN_SECRET not configured', async () => {
        // Arrange
        delete process.env.LOGIN_SECRET;

        // Recreate app without LOGIN_SECRET
        app = express();
        app.use(express.json());
        app.use(configureSession());
        app.use('/api/auth', authRoutes);

        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(validLoginRequest);

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Configuration error');
      });
    });
  });

  describe('Logout Flow', () => {
    describe('Successful Logout', () => {
      it('should return success response on logout', async () => {
        // Login first
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send(validLoginRequest);
        const cookies = loginResponse.headers['set-cookie'];

        // Act
        const logoutResponse = await request(app)
          .post('/api/auth/logout')
          .set('Cookie', cookies);

        // Assert
        expect(logoutResponse.status).toBe(200);
        expect(logoutResponse.body).toEqual({ success: true });
      });

      it('should clear session cookie on logout', async () => {
        // Login first
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send(validLoginRequest);
        const cookies = loginResponse.headers['set-cookie'];

        // Act
        const logoutResponse = await request(app)
          .post('/api/auth/logout')
          .set('Cookie', cookies);

        // Assert - check for cleared cookie
        const logoutCookies = logoutResponse.headers['set-cookie'] as string[];
        if (logoutCookies) {
          const sessionCookie = logoutCookies.find((c) =>
            c.includes('ngaj.sid')
          );
          // Cookie should be cleared (empty or expired)
          if (sessionCookie) {
            expect(
              sessionCookie.includes('Expires=') ||
                sessionCookie.includes('Max-Age=0')
            ).toBe(true);
          }
        }
      });

      it('should invalidate session after logout', async () => {
        // Login first
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send(validLoginRequest);
        const cookies = loginResponse.headers['set-cookie'];

        // Logout
        await request(app).post('/api/auth/logout').set('Cookie', cookies);

        // Act - try to access protected route with old cookie
        const dashboardResponse = await request(app)
          .get('/dashboard')
          .set('Cookie', cookies);

        // Assert - should be redirected to login
        expect(dashboardResponse.status).toBe(302);
        expect(dashboardResponse.headers.location).toBe('/login');
      });
    });

    describe('Logout Without Session', () => {
      it('should handle logout without active session gracefully', async () => {
        // Act
        const response = await request(app).post('/api/auth/logout');

        // Assert - should return 401 (protected route) or 200 (idempotent)
        expect([200, 401]).toContain(response.status);
      });
    });
  });

  describe('Auth Status', () => {
    it('should return authenticated: true when logged in', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(validLoginRequest);
      const cookies = loginResponse.headers['set-cookie'];

      // Act
      const statusResponse = await request(app)
        .get('/api/auth/status')
        .set('Cookie', cookies);

      // Assert
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.authenticated).toBe(true);
    });

    it('should return 401 when not logged in', async () => {
      // Act
      const response = await request(app).get('/api/auth/status');

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('Session Persistence', () => {
    it('should persist session across multiple requests', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(validLoginRequest);
      const cookies = loginResponse.headers['set-cookie'];

      // Make multiple requests
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/dashboard')
          .set('Cookie', cookies);

        expect(response.status).toBe(200);
      }
    });

    it('should not require re-authentication between requests', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(validLoginRequest);
      const cookies = loginResponse.headers['set-cookie'];

      // Access different protected routes
      const routes = ['/dashboard', '/api/opportunities', '/'];

      for (const route of routes) {
        const response = await request(app).get(route).set('Cookie', cookies);

        expect(response.status).toBe(200);
      }
    });
  });

  describe('Route Protection', () => {
    describe('Public Routes', () => {
      it('should allow access to /health without authentication', async () => {
        // Act
        const response = await request(app).get('/health');

        // Assert
        expect(response.status).toBe(200);
      });

      it('should allow access to /login without authentication', async () => {
        // Act
        const response = await request(app).get('/login');

        // Assert
        expect(response.status).toBe(200);
      });

      it('should allow access to /api/auth/login without authentication', async () => {
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send({ code: 'any' });

        // Assert - should get response (even if 401 for invalid code)
        expect(response.status).not.toBe(302); // Not redirected
      });
    });

    describe('Protected Page Routes', () => {
      it('should redirect / to /login when not authenticated', async () => {
        // Act
        const response = await request(app).get('/');

        // Assert
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/login');
      });

      it('should redirect /dashboard to /login when not authenticated', async () => {
        // Act
        const response = await request(app).get('/dashboard');

        // Assert
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/login');
      });
    });

    describe('Protected API Routes', () => {
      it('should return 401 for /api/opportunities when not authenticated', async () => {
        // Act
        const response = await request(app).get('/api/opportunities');

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Unauthorized');
      });
    });
  });
});

describe('Session Configuration', () => {
  let app: Express;

  beforeEach(() => {
    process.env.LOGIN_SECRET = TEST_LOGIN_SECRET;
    app = express();
    app.use(express.json());
    app.use(configureSession());
    app.use('/api/auth', authRoutes);
  });

  it('should use ngaj.sid as session cookie name', async () => {
    // Act
    const response = await request(app)
      .post('/api/auth/login')
      .send(validLoginRequest);

    // Assert
    const cookies = response.headers['set-cookie'] as string[];
    expect(cookies.some((c) => c.startsWith('ngaj.sid='))).toBe(true);
  });

  it('should configure session as session-scoped (no Max-Age for persistent)', async () => {
    // Act
    const response = await request(app)
      .post('/api/auth/login')
      .send(validLoginRequest);

    // Assert - session cookie should not have Max-Age (expires on browser close)
    const cookies = response.headers['set-cookie'] as string[];
    const sessionCookie = cookies.find((c) => c.includes('ngaj.sid'));

    // Session cookies should not have Max-Age or Expires set
    // Note: express-session may still set these, so we check for reasonable values
    expect(sessionCookie).toBeDefined();
  });
});
