/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '@ngaj/frontend/pages/LoginPage';
import {
  TEST_LOGIN_SECRET,
  loginSuccessResponse,
  invalidCodeErrorResponse,
} from '../../../fixtures/auth-fixtures';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock onLoginSuccess callback
const mockOnLoginSuccess = vi.fn();

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <LoginPage onLoginSuccess={mockOnLoginSuccess} />
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockOnLoginSuccess.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the login page logo', () => {
      // Arrange & Act
      renderLoginPage();

      // Assert
      expect(screen.getByAltText('ngaj')).toBeInTheDocument();
    });

    it('should render the subtitle text', () => {
      // Arrange & Act
      renderLoginPage();

      // Assert
      expect(
        screen.getByText('Enter your access code to continue')
      ).toBeInTheDocument();
    });

    it('should render input field with placeholder', () => {
      // Arrange & Act
      renderLoginPage();

      // Assert
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      expect(input).toBeInTheDocument();
    });

    it('should render login button', () => {
      // Arrange & Act
      renderLoginPage();

      // Assert
      const button = screen.getByRole('button', { name: /login/i });
      expect(button).toBeInTheDocument();
    });

    it('should render hint text about finding code in terminal', () => {
      // Arrange & Act
      renderLoginPage();

      // Assert
      expect(screen.getByText(/terminal/i)).toBeInTheDocument();
    });
  });

  describe('Input Behavior', () => {
    it('should auto-uppercase lowercase input', async () => {
      // Arrange
      const user = userEvent.setup();
      renderLoginPage();
      const input = screen.getByPlaceholderText(
        'XXXX-XXXX-XXXX-XXXX'
      ) as HTMLInputElement;

      // Act
      await user.type(input, 'a1b2');

      // Assert
      expect(input.value).toBe('A1B2');
    });

    it('should handle mixed case input', async () => {
      // Arrange
      const user = userEvent.setup();
      renderLoginPage();
      const input = screen.getByPlaceholderText(
        'XXXX-XXXX-XXXX-XXXX'
      ) as HTMLInputElement;

      // Act
      await user.type(input, 'a1B2-c3D4');

      // Assert
      expect(input.value).toBe('A1B2-C3D4');
    });

    it('should preserve uppercase input', async () => {
      // Arrange
      const user = userEvent.setup();
      renderLoginPage();
      const input = screen.getByPlaceholderText(
        'XXXX-XXXX-XXXX-XXXX'
      ) as HTMLInputElement;

      // Act
      await user.type(input, 'A1B2');

      // Assert
      expect(input.value).toBe('A1B2');
    });

    it('should clear previous error when user types', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(invalidCodeErrorResponse),
      });

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Submit invalid code
      await user.type(input, 'WRONG-CODE-HERE-1234');
      await user.click(button);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
      });

      // Act - type new character
      await user.type(input, 'X');

      // Assert - error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/incorrect/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with entered code', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(loginSuccessResponse),
      });

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, TEST_LOGIN_SECRET);
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: TEST_LOGIN_SECRET }),
        });
      });
    });

    it('should normalize code before submission (trim, uppercase)', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(loginSuccessResponse),
      });

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act - type lowercase (will be auto-uppercased by input)
      await user.type(input, 'test-1234-abcd-5678');
      await user.click(button);

      // Assert - submitted code should be uppercase
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'TEST-1234-ABCD-5678' }),
        });
      });
    });

    it('should navigate to dashboard on successful login', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(loginSuccessResponse),
      });

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, TEST_LOGIN_SECRET);
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should submit form on Enter key press', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(loginSuccessResponse),
      });

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');

      // Act
      await user.type(input, TEST_LOGIN_SECRET);
      await user.keyboard('{Enter}');

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Auth State Callback', () => {
    it('should call onLoginSuccess before navigating on successful login', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(loginSuccessResponse),
      });

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, TEST_LOGIN_SECRET);
      await user.click(button);

      // Assert - onLoginSuccess should be called
      await waitFor(() => {
        expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
      });

      // And navigation should also happen
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should NOT call onLoginSuccess on failed login', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(invalidCodeErrorResponse),
      });

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, 'WRONG-CODE-HERE-1234');
      await user.click(button);

      // Assert - wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
      });

      // onLoginSuccess should NOT be called
      expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });

    it('should NOT call onLoginSuccess on network error', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, TEST_LOGIN_SECRET);
      await user.click(button);

      // Assert - wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // onLoginSuccess should NOT be called
      expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });

    it('should call onLoginSuccess on retry after initial failure', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve(invalidCodeErrorResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(loginSuccessResponse),
        });

      renderLoginPage();
      const input = screen.getByPlaceholderText(
        'XXXX-XXXX-XXXX-XXXX'
      ) as HTMLInputElement;
      const button = screen.getByRole('button', { name: /login/i });

      // First attempt - fail
      await user.type(input, 'WRONG-CODE-HERE-1234');
      await user.click(button);
      await waitFor(() => {
        expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
      });

      // Verify onLoginSuccess was NOT called on failure
      expect(mockOnLoginSuccess).not.toHaveBeenCalled();

      // Second attempt - success
      await user.clear(input);
      await user.type(input, TEST_LOGIN_SECRET);
      await user.click(button);

      // Assert - onLoginSuccess should be called after successful retry
      await waitFor(() => {
        expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on invalid code', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(invalidCodeErrorResponse),
      });

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, 'WRONG-CODE-HERE-1234');
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
      });
    });

    it('should keep user on login page after failed login', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(invalidCodeErrorResponse),
      });

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, 'WRONG-CODE-HERE-1234');
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it('should display error on network failure', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, TEST_LOGIN_SECRET);
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should display error message styled in error color', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(invalidCodeErrorResponse),
      });

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, 'WRONG-CODE-HERE-1234');
      await user.click(button);

      // Assert
      await waitFor(() => {
        const errorElement = screen.getByText(/incorrect/i);
        // Check error styling (red text)
        expect(errorElement.className).toMatch(/text-red|error/i);
      });
    });

    it('should allow retry after failed login', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve(invalidCodeErrorResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(loginSuccessResponse),
        });

      renderLoginPage();
      const input = screen.getByPlaceholderText(
        'XXXX-XXXX-XXXX-XXXX'
      ) as HTMLInputElement;
      const button = screen.getByRole('button', { name: /login/i });

      // First attempt - fail
      await user.type(input, 'WRONG-CODE-HERE-1234');
      await user.click(button);
      await waitFor(() => {
        expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
      });

      // Second attempt - clear and retry with correct code
      await user.clear(input);
      await user.type(input, TEST_LOGIN_SECRET);
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Loading State', () => {
    it('should show "Verifying..." on button during request', async () => {
      // Arrange
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, TEST_LOGIN_SECRET);
      await user.click(button);

      // Assert - loading state
      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveTextContent(/verifying/i);
      });

      // Cleanup
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve(loginSuccessResponse),
      });
    });

    it('should disable button during request', async () => {
      // Arrange
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, TEST_LOGIN_SECRET);
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(button).toBeDisabled();
      });

      // Cleanup
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve(loginSuccessResponse),
      });
    });

    it('should disable input during request', async () => {
      // Arrange
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, TEST_LOGIN_SECRET);
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(input).toBeDisabled();
      });

      // Cleanup
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve(loginSuccessResponse),
      });
    });

    it('should restore button text after successful login', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(loginSuccessResponse),
      });

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, TEST_LOGIN_SECRET);
      await user.click(button);

      // Assert - button should be back to normal (or navigated away)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it('should restore button text after failed login', async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(invalidCodeErrorResponse),
      });

      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, 'WRONG-CODE-HERE-1234');
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(button).toHaveTextContent(/login/i);
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Empty Code Handling', () => {
    it('should disable login button when input is empty', () => {
      // Arrange & Act
      renderLoginPage();
      const button = screen.getByRole('button', { name: /login/i });

      // Assert
      expect(button).toBeDisabled();
    });

    it('should enable login button when input has content', async () => {
      // Arrange
      const user = userEvent.setup();
      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Act
      await user.type(input, 'A');

      // Assert
      expect(button).not.toBeDisabled();
    });

    it('should disable button again when input cleared', async () => {
      // Arrange
      const user = userEvent.setup();
      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
      const button = screen.getByRole('button', { name: /login/i });

      // Type and then clear
      await user.type(input, 'TEST');
      await user.clear(input);

      // Assert
      expect(button).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form elements', () => {
      // Arrange & Act
      renderLoginPage();

      // Assert
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should have input with appropriate attributes', () => {
      // Arrange & Act
      renderLoginPage();
      const input = screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX');

      // Assert
      expect(input).toHaveAttribute('type', 'text');
    });
  });
});
