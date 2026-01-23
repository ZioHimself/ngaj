/**
 * Progress indicator for wizard steps.
 * Shows current step with flat design circles.
 */

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
}: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <div key={step} className="flex items-center">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                font-semibold text-sm transition-colors duration-200
                ${isActive ? 'bg-blue-500 text-white' : ''}
                ${isCompleted ? 'bg-green-500 text-white' : ''}
                ${!isActive && !isCompleted ? 'bg-slate-200 text-slate-500' : ''}
              `}
            >
              {isCompleted ? (
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
              ) : (
                step
              )}
            </div>
            {step < totalSteps && (
              <div
                className={`
                  w-12 h-1 mx-2 rounded
                  ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
