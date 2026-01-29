/**
 * @vitest-environment jsdom
 *
 * OverflowMenu component unit tests.
 *
 * @see Handoff 016: QR Mobile Navigation
 * @see ADR-019: QR Mobile Navigation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverflowMenu } from '@ngaj/frontend/components/OverflowMenu';

describe('OverflowMenu', () => {
  const mockOnClick = vi.fn();
  const defaultItems = [
    { label: 'Mobile Access', onClick: mockOnClick },
    { label: 'Other', onClick: vi.fn() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Opens on click', () => {
    it('should show dropdown with menu items when button is clicked', async () => {
      const user = userEvent.setup();
      render(<OverflowMenu items={defaultItems} />);
      const button = screen.getByRole('button', { name: /menu|more|options/i });
      await user.click(button);
      expect(screen.getByText('Mobile Access')).toBeVisible();
    });
  });

  describe('Closes on outside click', () => {
    it('should close dropdown when user clicks outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <OverflowMenu items={defaultItems} />
          <button type="button">Outside</button>
        </div>
      );
      const menuButton = screen.getByRole('button', { name: /menu|more|options/i });
      await user.click(menuButton);
      expect(screen.getByText('Mobile Access')).toBeVisible();
      await user.click(screen.getByRole('button', { name: 'Outside' }));
      expect(screen.queryByText('Mobile Access')).not.toBeInTheDocument();
    });
  });

  describe('Closes on Escape key', () => {
    it('should close dropdown when user presses Escape', async () => {
      const user = userEvent.setup();
      render(<OverflowMenu items={defaultItems} />);
      const button = screen.getByRole('button', { name: /menu|more|options/i });
      await user.click(button);
      expect(screen.getByText('Mobile Access')).toBeVisible();
      await user.keyboard('{Escape}');
      expect(screen.queryByText('Mobile Access')).not.toBeInTheDocument();
    });
  });

  describe('Item click', () => {
    it('should call onClick handler and close menu when item is clicked', async () => {
      const user = userEvent.setup();
      render(<OverflowMenu items={defaultItems} />);
      const menuButton = screen.getByRole('button', { name: /menu|more|options/i });
      await user.click(menuButton);
      await user.click(screen.getByText('Mobile Access'));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Mobile Access')).not.toBeInTheDocument();
    });
  });
});
