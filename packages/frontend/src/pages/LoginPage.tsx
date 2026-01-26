/**
 * Login Page Component
 *
 * Simple login page for entering the access code.
 * Mobile-first responsive design with Tailwind utilities.
 *
 * @see ADR-014: Simple Token Authentication
 * @see ADR-015: Mobile-First Responsive Web Design
 */

import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import logoHorizontal from '../assets/logo-horizontal.png';

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
export function LoginPage({ onLoginSuccess }: LoginPageProps): React.ReactElement {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
          className="h-10 mx-auto mb-8"
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
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !code.trim()}
            className="
              w-full h-12 
              bg-blue-500 text-white font-medium rounded-xl
              hover:bg-blue-600 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          >
            {isLoading ? 'Verifying...' : 'Login'}
          </button>
        </form>

        {/* Hint */}
        <p className="mt-8 text-sm text-slate-400 leading-relaxed">
          Find your access code in the terminal<br />
          where ngaj is running
        </p>
      </div>
    </div>
  );
}
