/**
 * @vitest-environment jsdom
 *
 * QRCode component unit tests.
 *
 * @see Handoff 016: QR Mobile Navigation
 * @see ADR-019: QR Mobile Navigation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QRCode } from '@ngaj/frontend/components/QRCode';

describe('QRCode', () => {
  describe('Renders with default URL', () => {
    it('should render SVG element', () => {
      render(<QRCode />);
      const svg = document.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg).toBeInTheDocument();
    });

    it('should display URL text below QR when showUrl is true', () => {
      render(<QRCode />);
      expect(screen.getByText(/http:\/\//)).toBeInTheDocument();
    });
  });

  describe('Renders with custom URL', () => {
    it('should encode provided URL', () => {
      render(<QRCode url="https://example.com" />);
      const svg = document.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
    });
  });

  describe('Respects size prop', () => {
    it('should apply size to SVG dimensions', () => {
      render(<QRCode size={256} />);
      const svg = document.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg).toHaveAttribute('width', '256');
      expect(svg).toHaveAttribute('height', '256');
    });
  });
});
