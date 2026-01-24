import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '@ngaj/backend/middleware/auth';
import { isPublicRoute, PUBLIC_ROUTES, PUBLIC_PREFIXES } from '@ngaj/shared';
import {
  publicRoutes,
  publicAssetPaths,
  protectedRoutes,
  protectedApiRoutes,
  authenticatedSession,
  unauthenticatedSession,
} from '../../fixtures/auth-fixtures';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/',
      session: undefined,
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('Public Routes', () => {
    describe('Health Check', () => {
      it('should allow access to /health without session', () => {
        // Arrange
        mockReq.path = '/health';
        mockReq.session = undefined;

        // Act
        authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledOnce();
        expect(mockRes.redirect).not.toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should allow access to /health with unauthenticated session', () => {
        // Arrange
        mockReq.path = '/health';
        mockReq.session = unauthenticatedSession as any;

        // Act
        authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledOnce();
      });
    });

    describe('Login Page', () => {
      it('should allow access to /login without session', () => {
        // Arrange
        mockReq.path = '/login';
        mockReq.session = undefined;

        // Act
        authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledOnce();
        expect(mockRes.redirect).not.toHaveBeenCalled();
      });

      it('should allow access to /login with unauthenticated session', () => {
        // Arrange
        mockReq.path = '/login';
        mockReq.session = unauthenticatedSession as any;

        // Act
        authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledOnce();
      });
    });

    describe('Login API', () => {
      it('should allow access to /api/auth/login without session', () => {
        // Arrange
        mockReq.path = '/api/auth/login';
        mockReq.session = undefined;

        // Act
        authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledOnce();
        expect(mockRes.status).not.toHaveBeenCalled();
      });
    });

    describe('Static Assets', () => {
      it('should allow access to /assets/* without session', () => {
        // Arrange
        mockReq.path = '/assets/logo.png';
        mockReq.session = undefined;

        // Act
        authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledOnce();
      });

      it('should allow access to /favicon* without session', () => {
        // Arrange
        mockReq.path = '/favicon.ico';
        mockReq.session = undefined;

        // Act
        authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledOnce();
      });

      it('should allow all public asset paths', () => {
        // Act & Assert
        for (const path of publicAssetPaths) {
          mockReq.path = path;
          mockReq.session = undefined;
          mockNext = vi.fn();

          authMiddleware(mockReq as Request, mockRes as Response, mockNext);

          expect(mockNext, `Failed for path: ${path}`).toHaveBeenCalledOnce();
        }
      });
    });

    it('should allow all configured public routes', () => {
      // Act & Assert
      for (const route of publicRoutes) {
        mockReq.path = route;
        mockReq.session = undefined;
        mockNext = vi.fn();

        authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext, `Failed for route: ${route}`).toHaveBeenCalledOnce();
      }
    });
  });

  describe('Protected Routes - No Session', () => {
    describe('Page Routes', () => {
      it('should redirect / to /login when no session', () => {
        // Arrange
        mockReq.path = '/';
        mockReq.session = undefined;

        // Act
        authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        // Assert
        expect(mockRes.redirect).toHaveBeenCalledWith('/login');
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should redirect /dashboard to /login when no session', () => {
        // Arrange
        mockReq.path = '/dashboard';
        mockReq.session = undefined;

        // Act
        authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        // Assert
        expect(mockRes.redirect).toHaveBeenCalledWith('/login');
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should redirect all protected page routes to /login', () => {
        // Act & Assert
        for (const route of protectedRoutes) {
          mockReq.path = route;
          mockReq.session = undefined;
          mockRes.redirect = vi.fn().mockReturnThis();
          mockNext = vi.fn();

          authMiddleware(mockReq as Request, mockRes as Response, mockNext);

          expect(
            mockRes.redirect,
            `Failed for route: ${route}`
          ).toHaveBeenCalledWith('/login');
          expect(mockNext, `next() called for: ${route}`).not.toHaveBeenCalled();
        }
      });
    });

    describe('API Routes', () => {
      it('should return 401 for /api/opportunities when no session', () => {
        // Arrange
        mockReq.path = '/api/opportunities';
        mockReq.session = undefined;

        // Act
        authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 for all protected API routes', () => {
        // Act & Assert
        for (const route of protectedApiRoutes) {
          mockReq.path = route;
          mockReq.session = undefined;
          mockRes.status = vi.fn().mockReturnThis();
          mockRes.json = vi.fn().mockReturnThis();
          mockNext = vi.fn();

          authMiddleware(mockReq as Request, mockRes as Response, mockNext);

          expect(
            mockRes.status,
            `Failed for route: ${route}`
          ).toHaveBeenCalledWith(401);
          expect(mockNext, `next() called for: ${route}`).not.toHaveBeenCalled();
        }
      });

      it('should not redirect API routes (return JSON error instead)', () => {
        // Arrange
        mockReq.path = '/api/accounts';
        mockReq.session = undefined;

        // Act
        authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        // Assert
        expect(mockRes.redirect).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
      });
    });
  });

  describe('Protected Routes - Unauthenticated Session', () => {
    it('should redirect page route when session.authenticated is false', () => {
      // Arrange
      mockReq.path = '/dashboard';
      mockReq.session = { authenticated: false } as any;

      // Act
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith('/login');
    });

    it('should return 401 for API route when session.authenticated is false', () => {
      // Arrange
      mockReq.path = '/api/opportunities';
      mockReq.session = { authenticated: false } as any;

      // Act
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Protected Routes - With Valid Session', () => {
    it('should allow access to / with authenticated session', () => {
      // Arrange
      mockReq.path = '/';
      mockReq.session = authenticatedSession as any;

      // Act
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledOnce();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should allow access to /dashboard with authenticated session', () => {
      // Arrange
      mockReq.path = '/dashboard';
      mockReq.session = authenticatedSession as any;

      // Act
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledOnce();
    });

    it('should allow access to all protected routes with authenticated session', () => {
      // Act & Assert
      for (const route of [...protectedRoutes, ...protectedApiRoutes]) {
        mockReq.path = route;
        mockReq.session = authenticatedSession as any;
        mockNext = vi.fn();

        authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext, `Failed for route: ${route}`).toHaveBeenCalledOnce();
      }
    });

    it('should allow access to API routes with authenticated session', () => {
      // Arrange
      mockReq.path = '/api/opportunities';
      mockReq.session = authenticatedSession as any;

      // Act
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledOnce();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});

describe('isPublicRoute()', () => {
  it('should return true for /health', () => {
    expect(isPublicRoute('/health')).toBe(true);
  });

  it('should return true for /login', () => {
    expect(isPublicRoute('/login')).toBe(true);
  });

  it('should return true for /api/auth/login', () => {
    expect(isPublicRoute('/api/auth/login')).toBe(true);
  });

  it('should return true for /assets/* paths', () => {
    expect(isPublicRoute('/assets/logo.png')).toBe(true);
    expect(isPublicRoute('/assets/styles.css')).toBe(true);
    expect(isPublicRoute('/assets/nested/file.js')).toBe(true);
  });

  it('should return true for /favicon* paths', () => {
    expect(isPublicRoute('/favicon.ico')).toBe(true);
    expect(isPublicRoute('/favicon.png')).toBe(true);
  });

  it('should return false for protected routes', () => {
    expect(isPublicRoute('/')).toBe(false);
    expect(isPublicRoute('/dashboard')).toBe(false);
    expect(isPublicRoute('/api/opportunities')).toBe(false);
  });

  it('should return false for partial matches', () => {
    // /health is public, but /healthcheck is not
    expect(isPublicRoute('/healthcheck')).toBe(false);
    // /login is public, but /login-history is not
    expect(isPublicRoute('/login-history')).toBe(false);
  });
});

describe('PUBLIC_ROUTES constant', () => {
  it('should contain /health', () => {
    expect(PUBLIC_ROUTES).toContain('/health');
  });

  it('should contain /login', () => {
    expect(PUBLIC_ROUTES).toContain('/login');
  });

  it('should contain /api/auth/login', () => {
    expect(PUBLIC_ROUTES).toContain('/api/auth/login');
  });

  it('should have exactly 3 public routes', () => {
    expect(PUBLIC_ROUTES).toHaveLength(3);
  });
});

describe('PUBLIC_PREFIXES constant', () => {
  it('should contain /assets/', () => {
    expect(PUBLIC_PREFIXES).toContain('/assets/');
  });

  it('should contain /favicon', () => {
    expect(PUBLIC_PREFIXES).toContain('/favicon');
  });

  it('should have exactly 2 public prefixes', () => {
    expect(PUBLIC_PREFIXES).toHaveLength(2);
  });
});
