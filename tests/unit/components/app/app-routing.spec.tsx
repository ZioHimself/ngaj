/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '@ngaj/frontend/App';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock responses
const createAuthResponse = (authenticated: boolean) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ authenticated }),
});

const createProfileCheckResponse = (hasProfile: boolean) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ hasProfile }),
});

const createUnauthorizedResponse = () => ({
  ok: false,
  status: 401,
  json: () => Promise.resolve({ error: 'Unauthorized' }),
});

describe('App Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Reset URL to root
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Load - Unauthenticated', () => {
    it('should show loading state initially', () => {
      // Arrange - make fetch hang
      mockFetch.mockImplementation(() => new Promise(() => {}));

      // Act
      render(<App />);

      // Assert - loading state shows logo and spinner
      expect(screen.getByAltText('ngaj')).toBeInTheDocument();
      // Check for the spinner element (animate-spin class)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should redirect to login when not authenticated (401)', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createUnauthorizedResponse());

      // Act
      render(<App />);

      // Assert
      await waitFor(() => {
        expect(screen.getByAltText('ngaj')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX')).toBeInTheDocument();
      });
    });

    it('should redirect to login when auth check returns not authenticated', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createAuthResponse(false));

      // Act
      render(<App />);

      // Assert
      await waitFor(() => {
        expect(screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX')).toBeInTheDocument();
      });
    });
  });

  describe('Initial Load - Authenticated without Profile', () => {
    it('should redirect to setup when authenticated but no profile exists', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce(createAuthResponse(true)) // /api/auth/status
        .mockResolvedValueOnce(createProfileCheckResponse(false)) // /api/wizard/check
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(null) }); // /api/wizard/existing

      // Act
      render(<App />);

      // Assert - should see setup wizard
      await waitFor(() => {
        expect(screen.getByAltText('ngaj')).toBeInTheDocument();
        expect(screen.getByText('Setup')).toBeInTheDocument();
      });
    });

    it('should call /api/wizard/check when authenticated', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce(createAuthResponse(true))
        .mockResolvedValueOnce(createProfileCheckResponse(false))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(null) });

      // Act
      render(<App />);

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/wizard/check');
      });
    });
  });

  describe('Initial Load - Authenticated with Profile', () => {
    it('should redirect to opportunities when authenticated with profile', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce(createAuthResponse(true)) // /api/auth/status
        .mockResolvedValueOnce(createProfileCheckResponse(true)) // /api/wizard/check
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ opportunities: [] }) }); // /api/opportunities

      // Act
      window.history.pushState({}, '', '/');
      render(<App />);

      // Assert - should see opportunities page (not setup wizard)
      await waitFor(() => {
        // Should NOT see setup wizard "Setup" label
        expect(screen.queryByText('Setup')).not.toBeInTheDocument();
      });
    });
  });

  describe('Login Success - Profile Check', () => {
    it('should check profile after successful login', async () => {
      // Arrange - start unauthenticated
      mockFetch.mockResolvedValueOnce(createUnauthorizedResponse());

      const { rerender } = render(<App />);

      // Wait for login page
      await waitFor(() => {
        expect(screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX')).toBeInTheDocument();
      });

      // Clear mock and setup for login flow
      mockFetch.mockReset();

      // Simulate successful login followed by profile check
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) }) // /api/auth/login
        .mockResolvedValueOnce(createProfileCheckResponse(true)); // /api/wizard/check (called by handleLoginSuccess)

      // Act - simulate typing and submitting login
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Type code and submit
      await input.focus();
      await vi.importActual('@testing-library/user-event').then(async (userEvent: any) => {
        const user = userEvent.default.setup();
        await user.type(input, 'TEST-1234-ABCD-5678');
        await user.click(button);
      });

      // Assert - profile check should be called after login
      await waitFor(() => {
        const calls = mockFetch.mock.calls.map((call) => call[0]);
        expect(calls).toContain('/api/wizard/check');
      });
    });

    it('should redirect to opportunities after login when profile exists', async () => {
      // Arrange - start unauthenticated
      mockFetch.mockResolvedValueOnce(createUnauthorizedResponse());

      render(<App />);

      // Wait for login page
      await waitFor(() => {
        expect(screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX')).toBeInTheDocument();
      });

      // Setup mocks for login success with existing profile
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
        .mockResolvedValueOnce(createProfileCheckResponse(true))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ opportunities: [] }) });

      // Act - login
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      await vi.importActual('@testing-library/user-event').then(async (userEvent: any) => {
        const user = userEvent.default.setup();
        await user.type(input, 'TEST-1234-ABCD-5678');
        await user.click(button);
      });

      // Assert - should NOT see setup wizard (should be on opportunities)
      await waitFor(
        () => {
          expect(screen.queryByText('Setup')).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should redirect to setup after login when no profile exists', async () => {
      // Arrange - start unauthenticated
      mockFetch.mockResolvedValueOnce(createUnauthorizedResponse());

      render(<App />);

      // Wait for login page
      await waitFor(() => {
        expect(screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX')).toBeInTheDocument();
      });

      // Setup mocks for login success without profile
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
        .mockResolvedValueOnce(createProfileCheckResponse(false))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(null) }); // wizard/existing

      // Act - login
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      await vi.importActual('@testing-library/user-event').then(async (userEvent: any) => {
        const user = userEvent.default.setup();
        await user.type(input, 'TEST-1234-ABCD-5678');
        await user.click(button);
      });

      // Assert - should see setup wizard
      await waitFor(
        () => {
          expect(screen.getByAltText('ngaj')).toBeInTheDocument();
          expect(screen.getByText('Setup')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Profile Check Error Handling', () => {
    it('should assume no profile when profile check fails', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce(createAuthResponse(true))
        .mockResolvedValueOnce({ ok: false, status: 500 }) // profile check fails
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(null) });

      // Act
      render(<App />);

      // Assert - should show setup wizard (default to no profile)
      await waitFor(() => {
        expect(screen.getByAltText('ngaj')).toBeInTheDocument();
        expect(screen.getByText('Setup')).toBeInTheDocument();
      });
    });

    it('should assume no profile when profile check throws', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce(createAuthResponse(true))
        .mockRejectedValueOnce(new Error('Network error')) // profile check throws
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(null) });

      // Act
      render(<App />);

      // Assert - should show setup wizard (default to no profile on error)
      await waitFor(() => {
        expect(screen.getByAltText('ngaj')).toBeInTheDocument();
        expect(screen.getByText('Setup')).toBeInTheDocument();
      });
    });
  });

  describe('Route Protection', () => {
    it('should redirect /setup to /login when not authenticated', async () => {
      // Arrange
      window.history.pushState({}, '', '/setup');
      mockFetch.mockResolvedValueOnce(createUnauthorizedResponse());

      // Act
      render(<App />);

      // Assert - should be on login page
      await waitFor(() => {
        expect(screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX')).toBeInTheDocument();
      });
    });

    it('should redirect /opportunities to /login when not authenticated', async () => {
      // Arrange
      window.history.pushState({}, '', '/opportunities');
      mockFetch.mockResolvedValueOnce(createUnauthorizedResponse());

      // Act
      render(<App />);

      // Assert - should be on login page
      await waitFor(() => {
        expect(screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX')).toBeInTheDocument();
      });
    });

    it('should redirect /qr to /login when not authenticated', async () => {
      // Arrange - ADR-019: QR page requires auth
      window.history.pushState({}, '', '/qr');
      mockFetch.mockResolvedValueOnce(createUnauthorizedResponse());

      // Act
      render(<App />);

      // Assert - should be on login page
      await waitFor(() => {
        expect(screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX')).toBeInTheDocument();
      });
    });

    it('should redirect /setup to /opportunities when profile already exists', async () => {
      // Arrange
      window.history.pushState({}, '', '/setup');
      mockFetch
        .mockResolvedValueOnce(createAuthResponse(true))
        .mockResolvedValueOnce(createProfileCheckResponse(true))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ opportunities: [] }) });

      // Act
      render(<App />);

      // Assert - should NOT be on setup page
      await waitFor(() => {
        expect(screen.queryByText('Setup')).not.toBeInTheDocument();
      });
    });
  });
});
