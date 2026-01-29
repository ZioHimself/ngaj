/**
 * @vitest-environment jsdom
 *
 * QRCodePage integration tests: display, back navigation, route protection.
 *
 * @see Handoff 016: QR Mobile Navigation
 * @see ADR-019: QR Mobile Navigation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QRCodePage } from '@ngaj/frontend/pages/QRCodePage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function TestApp({ initialEntry = '/qr' }: { initialEntry?: string }) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/qr" element={<QRCodePage />} />
        <Route path="/opportunities" element={<div>Opportunities</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('QRCodePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Displays QR code', () => {
    it('should show full-page QR with helper text and back button', () => {
      render(<TestApp />);
      const svg = document.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(screen.getByText(/scan to open|your device/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  describe('Back navigation with history', () => {
    it('should navigate back when user came from another page', async () => {
      const user = userEvent.setup();
      // Simulate browser history with multiple entries so QRCodePage uses navigate(-1)
      const originalHistory = window.history;
      Object.defineProperty(window, 'history', {
        value: { ...originalHistory, length: 2 },
        writable: true,
      });
      render(
        <MemoryRouter initialEntries={['/opportunities', '/qr']}>
          <Routes>
            <Route path="/opportunities" element={<div>Opportunities</div>} />
            <Route path="/qr" element={<QRCodePage />} />
          </Routes>
        </MemoryRouter>
      );
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
      Object.defineProperty(window, 'history', { value: originalHistory, writable: true });
    });
  });

  describe('Back navigation without history', () => {
    it('should navigate to /opportunities when no history (direct access)', async () => {
      const user = userEvent.setup();
      render(<TestApp />);
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith('/opportunities');
    });
  });
});
