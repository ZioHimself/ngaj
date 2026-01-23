/**
 * Step 3: Configure Discovery
 * Sets discovery schedule preset.
 */

import { useState } from 'react';
import type { DiscoverySchedulePreset } from '@ngaj/shared';
import { SCHEDULE_PRESET_LABELS } from '@ngaj/shared';

interface StepDiscoveryProps {
  accountId: string;
  onBack: () => void;
  onComplete: () => void;
}

const presetOptions: DiscoverySchedulePreset[] = [
  '15min',
  '30min',
  '1hr',
  '2hr',
  '4hr',
];

export function StepDiscovery({
  accountId,
  onBack,
  onComplete,
}: StepDiscoveryProps) {
  const [selectedPreset, setSelectedPreset] =
    useState<DiscoverySchedulePreset>('1hr');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedulePreset: selectedPreset }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Configure Discovery
        </h2>
        <p className="text-slate-500">
          ngaj will automatically discover relevant opportunities based on your
          interests.
        </p>
      </div>

      {/* Schedule Selection */}
      <div>
        <label className="label">Check for opportunities every:</label>
        <div className="space-y-2">
          {presetOptions.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setSelectedPreset(preset)}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-colors
                ${
                  selectedPreset === preset
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-medium ${
                    selectedPreset === preset
                      ? 'text-blue-700'
                      : 'text-slate-700'
                  }`}
                >
                  {SCHEDULE_PRESET_LABELS[preset]}
                </span>
                {selectedPreset === preset && (
                  <svg
                    className="w-5 h-5 text-blue-500"
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
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Help Text */}
      <div className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
        <p className="text-slate-600 text-sm">
          <strong>Tip:</strong> Start with 1 hour. You can adjust this later via
          REST API for more advanced schedules.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-secondary flex-1"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleFinish}
          disabled={isSubmitting}
          className="btn btn-primary flex-1"
        >
          {isSubmitting ? 'Saving...' : 'Finish Setup'}
        </button>
      </div>
    </div>
  );
}
