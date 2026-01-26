/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { SetupWizard } from '@ngaj/frontend/pages/SetupWizard';
import {
  wizardProfileInputFixtures,
  wizardStateFixtures,
} from '../../../fixtures/wizard-fixtures';

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

// Mock onSetupComplete callback
const mockOnSetupComplete = vi.fn();

const renderSetupWizard = () => {
  return render(
    <BrowserRouter>
      <SetupWizard onSetupComplete={mockOnSetupComplete} />
    </BrowserRouter>
  );
};

describe('SetupWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockOnSetupComplete.mockReset();
    mockNavigate.mockReset();

    // Default: no existing data
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/wizard/existing') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(null),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the wizard title', async () => {
      renderSetupWizard();

      await waitFor(() => {
        expect(screen.getByText('ngaj Setup')).toBeInTheDocument();
      });
    });

    it('should show step indicator', async () => {
      renderSetupWizard();

      await waitFor(() => {
        expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
      });
    });
  });

  describe('Setup Complete Callback', () => {
    it('should call onSetupComplete when wizard finishes successfully', async () => {
      const user = userEvent.setup();

      // Mock API responses for full wizard flow
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        // Initial check for existing data
        if (url === '/api/wizard/existing') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }

        // Step 1: Create profile
        if (url === '/api/profiles' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                _id: 'profile-123',
                ...wizardProfileInputFixtures.valid,
              }),
          });
        }

        // Step 2: Test connection
        if (
          url === '/api/accounts/test-connection' &&
          options?.method === 'POST'
        ) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                handle: '@test.bsky.social',
              }),
          });
        }

        // Step 2: Create account
        if (url === '/api/accounts' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                _id: 'account-456',
              }),
          });
        }

        // Step 3: Update account with schedule
        if (
          url.startsWith('/api/accounts/') &&
          options?.method === 'PATCH'
        ) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }

        return Promise.resolve({ ok: false });
      });

      renderSetupWizard();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('ngaj Setup')).toBeInTheDocument();
      });

      // Step 1: Fill profile form
      const nameInput = screen.getByPlaceholderText('My Professional Persona');
      const voiceInput = screen.getByPlaceholderText(/professional but friendly/i);
      const principlesInput = screen.getByPlaceholderText(/evidence-based reasoning/i);

      await user.type(nameInput, wizardProfileInputFixtures.valid.name);
      await user.type(voiceInput, wizardProfileInputFixtures.valid.voice);
      await user.type(
        principlesInput,
        wizardProfileInputFixtures.valid.principles
      );

      // Submit step 1
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Wait for step 2
      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
      });

      // Step 2: Test connection and continue
      const testButton = screen.getByRole('button', {
        name: /test connection/i,
      });
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/@test\.bsky\.social/i)).toBeInTheDocument();
      });

      // Check consent checkbox
      const consentCheckbox = screen.getByRole('checkbox');
      await user.click(consentCheckbox);

      // Click Next to step 3 (creates account)
      const step2NextButtons = screen.getAllByRole('button', { name: /next/i });
      const step2NextButton = step2NextButtons.find(btn => !btn.hasAttribute('disabled'));
      await user.click(step2NextButton!);

      // Wait for step 3
      await waitFor(() => {
        expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument();
      });

      // Step 3: Finish setup
      const finishButton = screen.getByRole('button', { name: /finish/i });
      await user.click(finishButton);

      // Assert: onSetupComplete should be called before navigation
      await waitFor(() => {
        expect(mockOnSetupComplete).toHaveBeenCalledTimes(1);
      });

      // And navigation should happen
      expect(mockNavigate).toHaveBeenCalledWith('/opportunities');
    });

    it('should NOT call onSetupComplete if final step fails', async () => {
      const user = userEvent.setup();

      // Mock API to fail on final step
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === '/api/wizard/existing') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }

        if (url === '/api/profiles' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                _id: 'profile-123',
                ...wizardProfileInputFixtures.valid,
              }),
          });
        }

        if (
          url === '/api/accounts/test-connection' &&
          options?.method === 'POST'
        ) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                handle: '@test.bsky.social',
              }),
          });
        }

        if (url === '/api/accounts' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                _id: 'account-456',
              }),
          });
        }

        // Final step fails
        if (url.startsWith('/api/accounts/') && options?.method === 'PATCH') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Failed to save settings' }),
          });
        }

        return Promise.resolve({ ok: false });
      });

      renderSetupWizard();

      await waitFor(() => {
        expect(screen.getByText('ngaj Setup')).toBeInTheDocument();
      });

      // Complete steps 1-2 quickly
      const nameInput = screen.getByPlaceholderText('My Professional Persona');
      const voiceInput = screen.getByPlaceholderText(/professional but friendly/i);
      const principlesInput = screen.getByPlaceholderText(/evidence-based reasoning/i);

      await user.type(nameInput, wizardProfileInputFixtures.valid.name);
      await user.type(voiceInput, wizardProfileInputFixtures.valid.voice);
      await user.type(
        principlesInput,
        wizardProfileInputFixtures.valid.principles
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
      });

      const testButton = screen.getByRole('button', {
        name: /test connection/i,
      });
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/@test\.bsky\.social/i)).toBeInTheDocument();
      });

      // Check consent checkbox
      const consentCheckbox = screen.getByRole('checkbox');
      await user.click(consentCheckbox);

      // Click Next to step 3 (creates account)
      const step2NextButtons = screen.getAllByRole('button', { name: /next/i });
      const step2NextButton = step2NextButtons.find(btn => !btn.hasAttribute('disabled'));
      await user.click(step2NextButton!);

      await waitFor(() => {
        expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument();
      });

      // Try to finish - should fail
      const finishButton = screen.getByRole('button', { name: /finish/i });
      await user.click(finishButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      });

      // onSetupComplete should NOT be called
      expect(mockOnSetupComplete).not.toHaveBeenCalled();
      // Navigation should NOT happen
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
