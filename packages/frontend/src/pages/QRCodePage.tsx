/**
 * QRCodePage - full-page QR display for mobile access.
 * Centered QR, helper text, back button with history fallback.
 *
 * @see ADR-019: QR Mobile Navigation
 * @see .agents/artifacts/designer/designs/qr-mobile-navigation-design.md
 */

import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCode } from '../components/QRCode';

export function QRCodePage(): React.ReactElement {
  const navigate = useNavigate();

  const handleBack = (): void => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/opportunities');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6 max-w-sm">
        <QRCode size={256} />
        <p className="text-slate-600 text-center">
          Scan to open ngaj on your device
        </p>
        <button
          type="button"
          onClick={handleBack}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          aria-label="Back"
        >
          Back
        </button>
      </div>
    </div>
  );
}
