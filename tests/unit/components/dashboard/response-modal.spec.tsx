/**
 * @vitest-environment jsdom
 */

/**
 * ResponseModal Component Unit Tests
 *
 * Tests for the ResponseModal component - a full-screen modal on mobile
 * that replaces the inline ResponseEditor for better mobile UX.
 *
 * @see ADR-015: Mobile-First Responsive Web Design
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseModal } from '@ngaj/frontend/components/dashboard/ResponseModal';
import {
  responseModalFixtures,
  createResponseModalProps,
  dashboardOpportunityFixtures,
  dashboardResponseFixtures,
} from '@tests/fixtures/dashboard-fixtures';

// Helper to mock matchMedia for responsive tests
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('ResponseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Visibility', () => {
    it('should render modal when isOpen is true', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.closed} />);

      // Assert
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Mobile Layout (ADR-015)', () => {
    beforeEach(() => {
      // Mock mobile viewport (< 640px)
      mockMatchMedia(false);
    });

    it('should render full-screen on mobile (fixed inset-0)', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert - modal content should have full-screen mobile classes
      const modalContent = screen.getByTestId('response-modal-content');
      expect(modalContent).toHaveClass('fixed', 'inset-0');
    });

    it('should show "Back" button on mobile', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      expect(
        screen.getByRole('button', { name: /back/i })
      ).toBeInTheDocument();
    });

    it('should call onClose when Back button clicked', async () => {
      // Arrange
      const onClose = vi.fn();
      const props = createResponseModalProps({ onClose });
      const user = userEvent.setup();

      // Act
      render(<ResponseModal {...props} />);
      await user.click(screen.getByRole('button', { name: /back/i }));

      // Assert
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should have full-width buttons on mobile', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      const postButton = screen.getByRole('button', { name: /post now/i });
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i });

      expect(postButton).toHaveClass('flex-1');
      expect(regenerateButton).toHaveClass('flex-1');
    });

    it('should have 48px height buttons (h-12) on mobile', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      const postButton = screen.getByRole('button', { name: /post now/i });
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i });

      expect(postButton).toHaveClass('h-12');
      expect(regenerateButton).toHaveClass('h-12');
    });
  });

  describe('Desktop Layout (ADR-015)', () => {
    beforeEach(() => {
      // Mock desktop viewport (≥ 640px)
      mockMatchMedia(true);
    });

    it('should render centered modal with max-width on desktop', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert - modal should have centered positioning classes
      const modalContent = screen.getByTestId('response-modal-content');
      expect(modalContent).toHaveClass('sm:max-w-lg');
    });

    it('should show backdrop on desktop', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      const backdrop = screen.getByTestId('modal-backdrop');
      expect(backdrop).toHaveClass('sm:block');
    });

    it('should close when backdrop clicked', async () => {
      // Arrange
      const onClose = vi.fn();
      const props = createResponseModalProps({ onClose });
      const user = userEvent.setup();

      // Act
      render(<ResponseModal {...props} />);
      await user.click(screen.getByTestId('modal-backdrop'));

      // Assert
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should have rounded corners on desktop', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      const modalContent = screen.getByTestId('response-modal-content');
      expect(modalContent).toHaveClass('sm:rounded-xl');
    });
  });

  describe('Header', () => {
    it('should display "Edit Reply" title', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      expect(screen.getByText(/edit reply/i)).toBeInTheDocument();
    });

    it('should have sticky header for scrolling', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      const header = screen.getByTestId('modal-header');
      expect(header).toHaveClass('shrink-0');
    });
  });

  describe('Original Post Preview', () => {
    it('should show original post in collapsible details element', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      expect(
        screen.getByText(/replying to/i)
      ).toBeInTheDocument();
    });

    it('should display author handle in preview', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.withDraft;

      // Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      expect(
        screen.getByText(new RegExp(opportunity.author.handle))
      ).toBeInTheDocument();
    });
  });

  describe('Text Editing', () => {
    it('should render editable textarea', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should display response text in textarea', () => {
      // Arrange
      const response = dashboardResponseFixtures.draft;

      // Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      expect(screen.getByRole('textbox')).toHaveValue(response.text);
    });

    it('should call onTextChange when user types', async () => {
      // Arrange
      const onTextChange = vi.fn();
      const props = createResponseModalProps({ onTextChange });
      const user = userEvent.setup();

      // Act
      render(<ResponseModal {...props} />);
      await user.type(screen.getByRole('textbox'), 'a');

      // Assert
      expect(onTextChange).toHaveBeenCalled();
    });

    it('should have adequate min-height for editing', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('min-h-[200px]');
    });

    it('should use text-base to prevent iOS zoom', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('text-base');
    });
  });

  describe('Character Count', () => {
    it('should display character count in "{length}/300" format', () => {
      // Arrange
      const response = dashboardResponseFixtures.draft;

      // Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      expect(
        screen.getByText(`${response.text.length}/300`)
      ).toBeInTheDocument();
    });

    it('should show 0/300 for empty text', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.emptyText} />);

      // Assert
      expect(screen.getByText('0/300')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onPost when "Post Now" button clicked', async () => {
      // Arrange
      const onPost = vi.fn();
      const props = createResponseModalProps({ onPost });
      const user = userEvent.setup();

      // Act
      render(<ResponseModal {...props} />);
      await user.click(screen.getByRole('button', { name: /post now/i }));

      // Assert
      expect(onPost).toHaveBeenCalledOnce();
    });

    it('should call onRegenerate when "Regenerate" button clicked', async () => {
      // Arrange
      const onRegenerate = vi.fn();
      const props = createResponseModalProps({ onRegenerate });
      const user = userEvent.setup();

      // Act
      render(<ResponseModal {...props} />);
      await user.click(screen.getByRole('button', { name: /regenerate/i }));

      // Assert
      expect(onRegenerate).toHaveBeenCalledOnce();
    });

    it('should disable "Post Now" when text is empty', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.emptyText} />);

      // Assert
      expect(
        screen.getByRole('button', { name: /post now/i })
      ).toBeDisabled();
    });

    it('should disable both buttons while posting', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.posting} />);

      // Assert
      expect(
        screen.getByRole('button', { name: /posting/i })
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /regenerate/i })
      ).toBeDisabled();
    });

    it('should disable both buttons while regenerating', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.regenerating} />);

      // Assert
      expect(
        screen.getByRole('button', { name: /post now/i })
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /regenerating/i })
      ).toBeDisabled();
    });

    it('should show "Posting..." text during posting', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.posting} />);

      // Assert
      expect(screen.getByText(/posting/i)).toBeInTheDocument();
    });

    it('should show "Regenerating..." text during regenerating', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.regenerating} />);

      // Assert
      expect(screen.getByText(/regenerating/i)).toBeInTheDocument();
    });
  });

  describe('Footer Layout', () => {
    it('should have sticky footer for actions', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      const footer = screen.getByTestId('modal-footer');
      expect(footer).toHaveClass('shrink-0');
    });

    it('should have border-t for visual separation', () => {
      // Arrange & Act
      render(<ResponseModal {...responseModalFixtures.open} />);

      // Assert
      const footer = screen.getByTestId('modal-footer');
      expect(footer).toHaveClass('border-t');
    });
  });
});
