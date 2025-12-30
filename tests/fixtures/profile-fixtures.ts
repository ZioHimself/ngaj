import { ObjectId } from 'mongodb';
import type { Profile, CreateProfileInput, VoiceConfig, DiscoveryConfig } from '@/shared/types/profile';

/**
 * Factory function to create a valid profile for testing
 */
export const createMockProfile = (overrides?: Partial<Profile>): Profile => ({
  _id: new ObjectId(),
  name: 'Test Professional Persona',
  voice: {
    tone: 'professional-friendly',
    style: 'Clear technical explanations with occasional humor',
    examples: [
      'Great question! In distributed systems, consistency is key.',
      'I found this pattern useful when building scalable APIs.',
      'Let me break this down step by step for clarity.'
    ]
  },
  discovery: {
    interests: ['ai', 'typescript', 'testing'],
    keywords: ['machine learning', 'tdd', 'clean code'],
    communities: ['@alice.bsky.social', '@tech.community']
  },
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  isActive: true,
  ...overrides
});

/**
 * Factory function to create valid CreateProfileInput
 */
export const createMockProfileInput = (
  overrides?: Partial<CreateProfileInput>
): CreateProfileInput => ({
  name: 'Test Professional Persona',
  voice: {
    tone: 'professional-friendly',
    style: 'Clear technical explanations with occasional humor',
    examples: [
      'Great question! In distributed systems, consistency is key.',
      'I found this pattern useful when building scalable APIs.',
      'Let me break this down step by step for clarity.'
    ]
  },
  discovery: {
    interests: ['ai', 'typescript', 'testing'],
    keywords: ['machine learning', 'tdd', 'clean code'],
    communities: ['@alice.bsky.social', '@tech.community']
  },
  isActive: true,
  ...overrides
});

/**
 * Pre-configured profile fixtures for common test scenarios
 */
export const profileFixtures = {
  /**
   * Standard active profile with typical configuration
   */
  active: createMockProfile({
    name: 'Active Test Persona',
    isActive: true
  }),

  /**
   * Soft-deleted (inactive) profile
   */
  inactive: createMockProfile({
    name: 'Inactive Test Persona',
    isActive: false
  }),

  /**
   * Profile with minimal voice configuration
   */
  minimalVoice: createMockProfile({
    name: 'Minimal Voice Persona',
    voice: {
      tone: 'casual',
      style: 'Short and direct',
      examples: ['Sure!', 'Got it.', 'Makes sense.']
    }
  }),

  /**
   * Profile with maximum voice examples (5 items)
   */
  maxExamples: createMockProfile({
    name: 'Max Examples Persona',
    voice: {
      tone: 'technical',
      style: 'Detailed explanations',
      examples: [
        'First example demonstrating technical depth.',
        'Second example showing clear structure.',
        'Third example with practical application.',
        'Fourth example emphasizing best practices.',
        'Fifth example tying concepts together.'
      ]
    }
  }),

  /**
   * Profile with technical/concise voice
   */
  technicalConcise: createMockProfile({
    name: 'Technical Concise Persona',
    voice: {
      tone: 'technical-concise',
      style: 'Direct, no fluff, straight to the point',
      examples: [
        'Use async/await for cleaner code.',
        'Type safety prevents runtime errors.',
        'Composition over inheritance.'
      ]
    }
  })
};

/**
 * Invalid profile data for validation testing
 */
export const invalidProfiles = {
  /**
   * Missing required name field
   */
  missingName: {
    voice: {
      tone: 'test',
      style: 'test',
      examples: ['1', '2', '3']
    },
    discovery: {
      interests: [],
      keywords: [],
      communities: []
    },
    isActive: true
  },

  /**
   * Name too short (< 3 characters)
   */
  shortName: createMockProfileInput({
    name: 'AB'
  }),

  /**
   * Name too long (> 100 characters)
   */
  longName: createMockProfileInput({
    name: 'X'.repeat(101)
  }),

  /**
   * Missing voice.tone field
   */
  missingTone: {
    name: 'Test',
    voice: {
      style: 'test',
      examples: ['1', '2', '3']
    },
    discovery: {
      interests: [],
      keywords: [],
      communities: []
    },
    isActive: true
  },

  /**
   * Missing voice.style field
   */
  missingStyle: {
    name: 'Test',
    voice: {
      tone: 'test',
      examples: ['1', '2', '3']
    },
    discovery: {
      interests: [],
      keywords: [],
      communities: []
    },
    isActive: true
  },

  /**
   * Too few examples (< 3)
   */
  tooFewExamples: createMockProfileInput({
    name: 'Too Few Examples',
    voice: {
      tone: 'test',
      style: 'test',
      examples: ['1', '2']
    }
  }),

  /**
   * Too many examples (> 5)
   */
  tooManyExamples: createMockProfileInput({
    name: 'Too Many Examples',
    voice: {
      tone: 'test',
      style: 'test',
      examples: ['1', '2', '3', '4', '5', '6']
    }
  }),

  /**
   * Tone too long (> 50 characters)
   */
  longTone: createMockProfileInput({
    name: 'Long Tone',
    voice: {
      tone: 'x'.repeat(51),
      style: 'test',
      examples: ['1', '2', '3']
    }
  }),

  /**
   * Style too long (> 500 characters)
   */
  longStyle: createMockProfileInput({
    name: 'Long Style',
    voice: {
      tone: 'test',
      style: 'x'.repeat(501),
      examples: ['1', '2', '3']
    }
  }),

  /**
   * Example too long (> 500 characters)
   */
  longExample: createMockProfileInput({
    name: 'Long Example',
    voice: {
      tone: 'test',
      style: 'test',
      examples: ['x'.repeat(501), '2', '3']
    }
  })
};

/**
 * Helper to create multiple profiles for bulk operations
 */
export const createMockProfiles = (count: number): Profile[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockProfile({
      name: `Test Persona ${i + 1}`,
      _id: new ObjectId()
    })
  );
};


