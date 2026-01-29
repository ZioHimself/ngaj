/**
 * QRCode component - stub for TDD.
 * Renders minimal placeholder; tests expect SVG and URL text.
 *
 * @see ADR-019: QR Mobile Navigation
 * @see .agents/artifacts/designer/designs/qr-mobile-navigation-design.md
 */

import type React from 'react';

export interface QRCodeProps {
  /** URL to encode. Defaults to window.location.origin */
  url?: string;
  /** Size in pixels. Default: 200 */
  size?: number;
  /** Include URL text below QR. Default: true */
  showUrl?: boolean;
}

export function QRCode({
  url = typeof window !== 'undefined' ? window.location.origin : '',
  size = 200,
  showUrl = true,
}: QRCodeProps): React.ReactElement {
  // Stub: no real QR; implementer will use qrcode.react
  return (
    <div data-testid="qrcode-stub" data-url={url} data-size={size} data-show-url={String(showUrl)} />
  );
}
