/**
 * Login Page Component
 *
 * Simple login page for entering the access code.
 * Mobile-first responsive design with Tailwind utilities.
 *
 * @see ADR-014: Simple Token Authentication
 * @see ADR-015: Mobile-First Responsive Web Design
 * @see ADR-019: QR Mobile Navigation (desktop-only QR on login)
 */

import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoHorizontal from '../assets/logo-horizontal.png';
import { QRCode } from '../components/QRCode';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

/**
 * LoginPage component displays a form for entering the access code.
 *
 * Features:
 * - Auto-uppercase input (code converted to uppercase as user types)
 * - Loading state during verification
 * - Error message display
 * - Redirects to dashboard on success
 * - Mobile-first responsive design
 * - 48px touch targets for mobile
 * - Prevents iOS auto-zoom with text-base (16px) font
 */
const SM_BREAKPOINT = 640;

export function LoginPage({ onLoginSuccess }: LoginPageProps): React.ReactElement {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= SM_BREAKPOINT
  );
  const navigate = useNavigate();

  useEffect(() => {
    const check = (): void => setIsDesktop(window.innerWidth >= SM_BREAKPOINT);
    window.addEventListener('resize', check);
    check();
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        // Successful login - update auth state and navigate
        onLoginSuccess();
        navigate('/');
      } else {
        const data = await response.json();
        setError(data.message || 'Invalid access code');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <img
          src={logoHorizontal}
          alt="ngaj"
          className="h-18 mx-auto mb-8"
        />
        <p className="text-slate-500 mb-8">
          Enter your access code to continue
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              // Clear error when user starts typing again
              if (error) setError(null);
            }}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="
              w-full px-4 py-4 
              text-xl font-mono text-center tracking-wider
              border-2 border-slate-200 rounded-xl
              focus:border-blue-500 focus:outline-none
              placeholder:text-slate-300 placeholder:tracking-widest
              disabled:bg-slate-100
              text-base sm:text-xl
            "
            autoComplete="off"
            autoFocus
            disabled={isLoading}
          />

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-left">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !code.trim()}
            className="w-full px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Login'}
          </button>
        </form>

        {/* QR Code - desktop only (ADR-019); wrapper keeps hidden sm:block for responsive layout */}
        <div className="hidden sm:block mt-8 pt-8 border-t border-slate-200">
          {isDesktop && (
            <>
              <p className="text-sm text-slate-500 mb-4">Or scan to open on mobile</p>
              <QRCode size={160} />
            </>
          )}
        </div>

        {/* Hint */}
        <p className="mt-8 text-sm text-slate-400 leading-relaxed">
          Find your access code in the terminal<br />
          where ngaj is running
        </p>
      </div>
    </div>
  );
}
