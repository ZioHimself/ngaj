import { ObjectId } from 'mongodb';

/**
 * Profile represents a cross-platform persona with consistent voice,
 * discovery preferences, and knowledge base.
 * 
 * Relationship: 1 Profile → Many Accounts
 * 
 * @see ADR-006: Profile and Account Separation
 */
export interface Profile {
  /** MongoDB document ID */
  _id: ObjectId;
  
  /** Human-readable name (e.g., "Professional Tech Persona") */
  name: string;
  
  /** Voice configuration for AI-generated responses */
  voice: VoiceConfig;
  
  /** Discovery preferences for finding relevant opportunities */
  discovery: DiscoveryConfig;
  
  /** When this profile was created */
  createdAt: Date;
  
  /** When this profile was last modified */
  updatedAt: Date;
  
  /** Whether this profile is currently active */
  isActive: boolean;
}

/**
 * Voice configuration defines how the AI should respond in this profile's style.
 */
export interface VoiceConfig {
  /**
   * Tone descriptor (lowercase, hyphenated)
   * Examples: "professional-friendly", "technical-concise", "casual-humorous"
   */
  tone: string;
  
  /**
   * Free-text style description
   * Example: "I use clear explanations with occasional technical depth. 
   * I avoid jargon unless the audience is technical."
   */
  style: string;
  
  /**
   * 3-5 example responses written by the user in their voice.
   * Used as few-shot examples for Claude to learn style.
   * 
   * For v0.1, stored in MongoDB. Future versions may use ChromaDB
   * for semantic retrieval of relevant examples.
   */
  examples: string[];
}

/**
 * Discovery configuration defines what content to surface as opportunities.
 */
export interface DiscoveryConfig {
  /**
   * Broad interest areas (lowercase)
   * Examples: ["ai", "typescript", "distributed systems"]
   */
  interests: string[];
  
  /**
   * Specific keywords to match (lowercase)
   * Examples: ["machine learning", "vector database", "chromadb"]
   */
  keywords: string[];
  
  /**
   * Community identifiers to monitor (platform-specific format)
   * Bluesky: ["@alice.bsky.social", "tech.community.bsky.social"]
   * Reddit: ["r/machinelearning", "r/typescript"]
   * LinkedIn: (future: company pages, groups)
   */
  communities: string[];
}

/**
 * Type guard to check if an object is a valid Profile
 */
export function isProfile(obj: unknown): obj is Profile {
  if (typeof obj !== 'object' || obj === null) return false;
  const p = obj as Partial<Profile>;
  return (
    p._id instanceof ObjectId &&
    typeof p.name === 'string' &&
    typeof p.voice === 'object' &&
    typeof p.discovery === 'object' &&
    p.createdAt instanceof Date &&
    p.updatedAt instanceof Date &&
    typeof p.isActive === 'boolean'
  );
}

/**
 * Partial profile for create operations (omit MongoDB-generated fields)
 */
export type CreateProfileInput = Omit<Profile, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * Partial profile for update operations (omit immutable fields)
 */
export type UpdateProfileInput = Partial<Omit<Profile, '_id' | 'createdAt' | 'updatedAt'>>;

