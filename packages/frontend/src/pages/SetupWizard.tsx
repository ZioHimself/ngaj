/**
 * Setup Wizard Page
 *
 * First-launch wizard for creating Profile, connecting Bluesky,
 * and configuring discovery.
 *
 * @see ADR-012: First-Launch Setup Wizard
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WizardProfileInput, WizardState } from '@ngaj/shared';
import {
  ProgressIndicator,
  StepProfile,
  StepAccount,
  StepDiscovery,
} from '../components/wizard';
import logoHorizontal from '../assets/logo-horizontal.png';

type WizardStep = 1 | 2 | 3;

interface SetupWizardProps {
  onSetupComplete: () => void;
}

export function SetupWizard({ onSetupComplete }: SetupWizardProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<WizardState>({
    currentStep: 1,
    profileId: undefined,
    accountId: undefined,
    connectionTested: false,
  });
  const [profileData, setProfileData] = useState<
    Partial<WizardProfileInput> | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing profile data on mount (browser refresh scenario)
  useEffect(() => {
    const checkExistingData = async () => {
      try {
        const response = await fetch('/api/wizard/existing');
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setProfileData(data);
          }
        }
      } catch {
        // Ignore - just start fresh if we can't fetch existing data
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingData();
  }, []);

  const goToStep = (step: WizardStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  };

  const handleProfileComplete = async (data: WizardProfileInput) => {
    setError(null);

    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create profile');
      }

      const profile = await response.json();
      setState((prev) => ({
        ...prev,
        currentStep: 2,
        profileId: profile._id,
      }));
      setProfileData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    }
  };

  const handleAccountComplete = (accountId: string) => {
    setState((prev) => ({
      ...prev,
      currentStep: 3,
      accountId,
      connectionTested: true,
    }));
  };

  const handleWizardComplete = () => {
    // Update profile state and redirect to opportunities page
    onSetupComplete();
    navigate('/opportunities');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <img src={logoHorizontal} alt="ngaj" className="h-10 mx-auto mb-6 opacity-60" />
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoHorizontal} alt="ngaj" className="h-9" />
              <span className="text-slate-400 font-medium">Setup</span>
            </div>
            <span className="text-sm text-slate-500">
              Step {state.currentStep} of 3
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-6 py-8">
        <ProgressIndicator currentStep={state.currentStep} totalSteps={3} />

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 text-sm underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Steps */}
        <div className="card">
          {state.currentStep === 1 && (
            <StepProfile
              initialData={profileData}
              onNext={handleProfileComplete}
            />
          )}

          {state.currentStep === 2 && state.profileId && (
            <StepAccount
              profileId={state.profileId}
              onBack={() => goToStep(1)}
              onNext={handleAccountComplete}
            />
          )}

          {state.currentStep === 3 && state.accountId && (
            <StepDiscovery
              accountId={state.accountId}
              onBack={() => goToStep(2)}
              onComplete={handleWizardComplete}
            />
          )}
        </div>
      </main>
    </div>
  );
}
