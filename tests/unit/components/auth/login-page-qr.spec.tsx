/**
 * @vitest-environment jsdom
 *
 * Login page QR code visibility (responsive) tests.
 * QR section should be visible on desktop (≥640px), hidden on mobile (<640px).
 *
 * @see Handoff 016: QR Mobile Navigation
 * @see ADR-019: QR Mobile Navigation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '@ngaj/frontend/pages/LoginPage';

const mockOnLoginSuccess = vi.fn();

const renderLoginPage = () =>
  render(
    <BrowserRouter>
      <LoginPage onLoginSuccess={mockOnLoginSuccess} />
    </BrowserRouter>
  );

describe('LoginPage QR visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Desktop viewport (≥640px)', () => {
    it('should show QR code section when viewport is desktop', () => {
      // Arrange: set viewport width >= 640 (sm breakpoint)
      window.innerWidth = 640;
      renderLoginPage();
      const qrSection = document.querySelector('[class*="hidden"][class*="sm:block"]');
      expect(qrSection).toBeTruthy();
      expect(screen.getByText(/scan to open|or scan/i)).toBeInTheDocument();
    });
  });

  describe('Mobile viewport (<640px)', () => {
    it('should hide QR code section when viewport is mobile', () => {
      window.innerWidth = 375;
      renderLoginPage();
      // QR section should be present but hidden (hidden sm:block)
      const qrSection = document.querySelector('[class*="hidden"]');
      expect(qrSection).toBeTruthy();
      expect(screen.queryByText(/scan to open on mobile/i)).not.toBeInTheDocument();
    });
  });
});
