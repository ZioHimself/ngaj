/**
 * Step 1: Create Your Profile
 * Collects name, voice, principles, and interests.
 */

import { useState } from 'react';
import type { WizardProfileInput } from '@ngaj/shared';

interface StepProfileProps {
  initialData?: Partial<WizardProfileInput>;
  onNext: (data: WizardProfileInput) => void;
}

interface ValidationErrors {
  name?: string;
  voice?: string;
  principles?: string;
  interests?: string;
}

export function StepProfile({ initialData, onNext }: StepProfileProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [voice, setVoice] = useState(initialData?.voice ?? '');
  const [principles, setPrinciples] = useState(initialData?.principles ?? '');
  const [interestsText, setInterestsText] = useState(
    initialData?.interests?.join(', ') ?? ''
  );
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Profile name is required';
    } else if (name.length < 3) {
      newErrors.name = 'Profile name must be at least 3 characters';
    } else if (name.length > 100) {
      newErrors.name = 'Profile name must not exceed 100 characters';
    }

    if (!voice.trim()) {
      newErrors.voice = 'Voice description is required';
    } else if (voice.length < 10) {
      newErrors.voice = 'Voice must be at least 10 characters';
    } else if (voice.length > 500) {
      newErrors.voice = 'Voice must not exceed 500 characters';
    }

    if (!principles.trim()) {
      newErrors.principles = 'Principles are required';
    } else if (principles.length < 10) {
      newErrors.principles = 'Principles must be at least 10 characters';
    } else if (principles.length > 500) {
      newErrors.principles = 'Principles must not exceed 500 characters';
    }

    const interests = interestsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (interests.length > 20) {
      newErrors.interests = 'Maximum 20 interests allowed';
    }
    if (interests.some((i) => i.length > 30)) {
      newErrors.interests = 'Each interest must not exceed 30 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const interests = interestsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      onNext({ name, voice, principles, interests });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Create Your Profile
        </h2>
        <p className="text-slate-500">
          Your profile defines how ngaj responds to opportunities.
        </p>
      </div>

      {/* Profile Name */}
      <div>
        <label htmlFor="name" className="label">
          Profile Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Professional Persona"
          className={`input ${errors.name ? 'input-error' : ''}`}
        />
        {errors.name && <p className="error-text">{errors.name}</p>}
      </div>

      {/* Voice */}
      <div>
        <label htmlFor="voice" className="label">
          Voice
        </label>
        <textarea
          id="voice"
          rows={3}
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          placeholder="Professional but friendly. Technical but accessible. Conversational, not stuffy."
          className={`textarea ${errors.voice ? 'input-error' : ''}`}
        />
        <p className="hint">
          Describe your tone and style. This guides AI response generation.
        </p>
        {errors.voice && <p className="error-text">{errors.voice}</p>}
      </div>

      {/* Principles */}
      <div>
        <label htmlFor="principles" className="label">
          Principles
        </label>
        <textarea
          id="principles"
          rows={3}
          value={principles}
          onChange={(e) => setPrinciples(e.target.value)}
          placeholder="I value evidence-based reasoning, clear communication, and kindness. I prioritize adding value over self-promotion."
          className={`textarea ${errors.principles ? 'input-error' : ''}`}
        />
        <p className="hint">
          Core beliefs that shape how you engage. AI will honor these
          principles.
        </p>
        {errors.principles && <p className="error-text">{errors.principles}</p>}
      </div>

      {/* Interests */}
      <div>
        <label htmlFor="interests" className="label">
          Interests{' '}
          <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          id="interests"
          type="text"
          value={interestsText}
          onChange={(e) => setInterestsText(e.target.value)}
          placeholder="ai, typescript, distributed systems, developer tools"
          className={`input ${errors.interests ? 'input-error' : ''}`}
        />
        <p className="hint">
          Comma-separated topics you want to engage with. Used for opportunity
          discovery.
        </p>
        {errors.interests && <p className="error-text">{errors.interests}</p>}
      </div>

      {/* Submit */}
      <div className="pt-4">
        <button
          type="submit"
          className="w-full px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          Next
        </button>
      </div>
    </form>
  );
}
