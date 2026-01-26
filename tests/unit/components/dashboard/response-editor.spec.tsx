/**
 * @vitest-environment jsdom
 */

/**
 * ResponseEditor Component Unit Tests
 *
 * Tests for the ResponseEditor component for editing
 * AI-generated responses.
 *
 * @see ADR-013: Opportunity Dashboard UI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseEditor } from '@ngaj/frontend/components/dashboard/ResponseEditor';
import { dashboardResponseFixtures } from '@tests/fixtures/dashboard-fixtures';

describe('ResponseEditor', () => {
  const defaultProps = {
    text: dashboardResponseFixtures.draft.text,
    onChange: vi.fn(),
    onPost: vi.fn(),
    onRegenerate: vi.fn(),
    isGenerating: false,
    isPosting: false,
    maxLength: 300,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Generating State', () => {
    it('should display spinner/loading animation when generating', () => {
      // Arrange & Act
      render(<ResponseEditor {...defaultProps} isGenerating={true} text="" />);

      // Assert
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should display "Generating response..." text', () => {
      // Arrange & Act
      render(<ResponseEditor {...defaultProps} isGenerating={true} text="" />);

      // Assert
      expect(screen.getByText(/generating response/i)).toBeInTheDocument();
    });

    it('should disable action buttons while generating', () => {
      // Arrange & Act
      render(<ResponseEditor {...defaultProps} isGenerating={true} text="" />);

      // Assert
      const postButton = screen.queryByRole('button', { name: /post/i });
      const regenerateButton = screen.queryByRole('button', {
        name: /regenerate/i,
      });

      if (postButton) expect(postButton).toBeDisabled();
      if (regenerateButton) expect(regenerateButton).toBeDisabled();
    });
  });

  describe('Text Editing', () => {
    it('should render editable textarea', () => {
      // Arrange & Act
      render(<ResponseEditor {...defaultProps} />);

      // Assert
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).not.toBeDisabled();
    });

    it('should display initial text value', () => {
      // Arrange
      const text = 'Initial response text';

      // Act
      render(<ResponseEditor {...defaultProps} text={text} />);

      // Assert
      expect(screen.getByRole('textbox')).toHaveValue(text);
    });

    it('should call onChange when user types', async () => {
      // Arrange
      const onChange = vi.fn();
      const user = userEvent.setup();

      // Act
      render(<ResponseEditor {...defaultProps} text="" onChange={onChange} />);
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'New text');

      // Assert
      expect(onChange).toHaveBeenCalled();
    });

    it('should update character count on each keystroke', async () => {
      // Arrange
      const user = userEvent.setup();
      let currentText = '';
      const onChange = vi.fn((newText) => {
        currentText = newText;
      });

      // Act
      const { rerender } = render(
        <ResponseEditor {...defaultProps} text={currentText} onChange={onChange} />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'abc');

      // Rerender with updated text (simulating controlled component)
      rerender(
        <ResponseEditor {...defaultProps} text="abc" onChange={onChange} />
      );

      // Assert - character count should be "3/300"
      expect(screen.getByText('3/300')).toBeInTheDocument();
    });
  });

  describe('Character Count', () => {
    it('should display character count in format "{length}/300"', () => {
      // Arrange
      const text = 'Test response';

      // Act
      render(<ResponseEditor {...defaultProps} text={text} />);

      // Assert
      expect(screen.getByText(`${text.length}/300`)).toBeInTheDocument();
    });

    it('should show correct count at character limit (300/300)', () => {
      // Arrange
      const text = 'x'.repeat(300);

      // Act
      render(<ResponseEditor {...defaultProps} text={text} maxLength={300} />);

      // Assert
      expect(screen.getByText('300/300')).toBeInTheDocument();
    });

    it('should handle empty text (0/300)', () => {
      // Arrange & Act
      render(<ResponseEditor {...defaultProps} text="" />);

      // Assert
      expect(screen.getByText('0/300')).toBeInTheDocument();
    });

    it('should allow submission at limit', () => {
      // Arrange
      const text = 'x'.repeat(300);

      // Act
      render(<ResponseEditor {...defaultProps} text={text} />);

      // Assert - Post button should be enabled
      expect(screen.getByRole('button', { name: /post/i })).not.toBeDisabled();
    });

    it('should show warning style when approaching limit', () => {
      // Arrange - text near limit (e.g., >280 chars)
      const text = 'x'.repeat(290);

      // Act
      render(<ResponseEditor {...defaultProps} text={text} />);

      // Assert - count element should have amber/warning color
      const countElement = screen.getByTestId('character-count');
      expect(countElement).toHaveClass('text-amber-500');
    });

    it('should show error style when over limit', () => {
      // Arrange - text over limit
      const text = 'x'.repeat(310);

      // Act
      render(<ResponseEditor {...defaultProps} text={text} />);

      // Assert - count element should have red/error color
      const countElement = screen.getByTestId('character-count');
      expect(countElement).toHaveClass('text-red-500');
    });
  });

  describe('Actions', () => {
    it('should call onPost when Post button clicked', async () => {
      // Arrange
      const onPost = vi.fn();
      const user = userEvent.setup();

      // Act
      render(<ResponseEditor {...defaultProps} onPost={onPost} />);
      await user.click(screen.getByRole('button', { name: /post/i }));

      // Assert
      expect(onPost).toHaveBeenCalledOnce();
    });

    it('should call onRegenerate when Regenerate button clicked', async () => {
      // Arrange
      const onRegenerate = vi.fn();
      const user = userEvent.setup();

      // Act
      render(<ResponseEditor {...defaultProps} onRegenerate={onRegenerate} />);
      await user.click(screen.getByRole('button', { name: /regenerate/i }));

      // Assert
      expect(onRegenerate).toHaveBeenCalledOnce();
    });

    it('should disable Post button while posting', () => {
      // Arrange & Act
      render(<ResponseEditor {...defaultProps} isPosting={true} />);

      // Assert
      expect(screen.getByRole('button', { name: /post/i })).toBeDisabled();
    });

    it('should show posting indicator while posting', () => {
      // Arrange & Act
      render(<ResponseEditor {...defaultProps} isPosting={true} />);

      // Assert
      expect(screen.getByText(/posting/i)).toBeInTheDocument();
    });
  });
});
