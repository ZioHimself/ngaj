/**
 * QRCode component - renders QR code encoding a URL.
 * Uses qrcode.react for SVG output (crisp at any size).
 *
 * @see ADR-019: QR Mobile Navigation
 * @see .agents/artifacts/designer/designs/qr-mobile-navigation-design.md
 */

import type React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export interface QRCodeProps {
  /** URL to encode. Defaults to window.location.origin */
  url?: string;
  /** Size in pixels. Default: 200 */
  size?: number;
  /** Include URL text below QR. Default: true */
  showUrl?: boolean;
}

const defaultUrl =
  typeof window !== 'undefined' ? window.location.origin : '';

export function QRCode({
  url = defaultUrl,
  size = 200,
  showUrl = true,
}: QRCodeProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white p-2 rounded-lg">
        <QRCodeSVG value={url} size={size} level="M" />
      </div>
      {showUrl && (
        <p className="text-sm font-mono text-slate-600 max-w-full truncate px-2">
          {url}
        </p>
      )}
    </div>
  );
}
