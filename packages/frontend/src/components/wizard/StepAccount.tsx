/**
 * Step 2: Connect Bluesky
 * Tests connection and creates account.
 */

import { useState } from 'react';
import type { TestConnectionResult } from '@ngaj/shared';

interface StepAccountProps {
  profileId: string;
  onBack: () => void;
  onNext: (accountId: string) => void;
}

export function StepAccount({ profileId, onBack, onNext }: StepAccountProps) {
  const [connectionStatus, setConnectionStatus] =
    useState<TestConnectionResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setIsTesting(true);
    setError(null);

    try {
      const response = await fetch('/api/accounts/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'bluesky' }),
      });

      const result: TestConnectionResult = await response.json();
      setConnectionStatus(result);

      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch {
      setError('Network error. Please check your connection.');
      setConnectionStatus({ success: false, handle: '', error: 'Network error' });
    } finally {
      setIsTesting(false);
    }
  };

  const createAccount = async () => {
    if (!consentChecked) {
      setError('You must agree to continue');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, platform: 'bluesky' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create account');
      }

      const account = await response.json();
      onNext(account._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed =
    connectionStatus?.success && consentChecked && !isCreating;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Connect Bluesky
        </h2>
        <p className="text-slate-500">
          We'll verify your Bluesky connection and create your account.
        </p>
      </div>

      {/* Connection Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium text-slate-800">Bluesky Handle</h3>
            <p className="text-slate-500 text-sm">
              {connectionStatus?.handle || 'Not connected yet'}
            </p>
          </div>
          <button
            type="button"
            onClick={testConnection}
            disabled={isTesting}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {/* Status indicator */}
        {connectionStatus && (
          <div
            className={`
              p-4 rounded-lg border-2 mt-4
              ${connectionStatus.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'}
            `}
          >
            {connectionStatus.success ? (
              <div className="flex items-center gap-2 text-green-700">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="font-medium">Connected successfully</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-700">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span className="font-medium">Connection failed</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Consent */}
      <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
        <input
          type="checkbox"
          id="consent"
          checked={consentChecked}
          onChange={(e) => setConsentChecked(e.target.checked)}
          className="mt-1"
        />
        <label htmlFor="consent" className="text-slate-600 text-sm">
          I understand ngaj will post on my behalf after I review and approve
          responses.
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 px-5 py-2.5 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={createAccount}
          disabled={!canProceed}
          className="flex-1 px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? 'Creating...' : 'Next'}
        </button>
      </div>
    </div>
  );
}
