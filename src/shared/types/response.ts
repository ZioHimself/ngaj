import { ObjectId } from 'mongodb';

/**
 * Platform-specific constraints for response generation.
 * Provided by Platform Adapters.
 * 
 * v0.1: Only maxLength implemented
 * Future: Add minLength, bannedTerms, toneHint, supportsFormatting
 * 
 * @see ADR-009: Response Suggestion Architecture
 */
export interface PlatformConstraints {
  /**
   * Maximum character count for responses
   * Bluesky: 300 characters
   * LinkedIn: 3000 characters (future)
   * Reddit: 10000 characters (future)
   */
  maxLength: number;

  /**
   * Minimum character count (avoid too-short replies)
   * Future enhancement
   */
  minLength?: number;

  /**
   * Banned words/phrases (platform rules, user preferences)
   * Future enhancement
   */
  bannedTerms?: string[];

  /**
   * Tone guidance specific to platform
   * Example: "professional" for LinkedIn
   * Future enhancement
   */
  toneHint?: string;

  /**
   * Whether platform supports rich formatting
   * Example: Markdown, bold/italic, links
   * Future enhancement
   */
  supportsFormatting?: boolean;

  /**
   * Custom platform-specific rules
   * Future enhancement
   */
  customRules?: Record<string, unknown>;
}

/**
 * Response lifecycle status.
 * 
 * - draft: Generated, awaiting user action
 * - posted: Successfully posted to platform
 * - dismissed: User rejected this response
 */
export type ResponseStatus = 'draft' | 'posted' | 'dismissed';

/**
 * Metadata captured during response generation.
 * Used for debugging, observability, and future learning.
 */
export interface ResponseMetadata {
  /**
   * Keywords extracted during Stage 1 analysis
   * Used for KB semantic search
   */
  analysisKeywords: string[];

  /**
   * Main topic extracted from opportunity text
   */
  mainTopic: string;

  /**
   * Domain/field identified (e.g., "technology", "health", "policy")
   */
  domain: string;

  /**
   * Question identified (or "none" if no question detected)
   */
  question: string;

  /**
   * Number of KB chunks used in generation
   * Range: 0-3 (up to 3 chunks per response in v0.1)
   */
  kbChunksUsed: number;

  /**
   * Platform constraints applied during generation
   */
  constraints: PlatformConstraints;

  /**
   * AI model used for generation
   * Example: "claude-sonnet-4.5"
   */
  model: string;

  /**
   * Total generation time (Stage 1 + Stage 2, milliseconds)
   */
  generationTimeMs: number;

  /**
   * Whether user principles were included in prompt
   */
  usedPrinciples: boolean;

  /**
   * Whether user voice profile was included in prompt
   */
  usedVoice: boolean;

  /**
   * Stage 1 analysis time (milliseconds)
   */
  analysisTimeMs: number;

  /**
   * Stage 2 generation time (milliseconds)
   */
  responseTimeMs: number;
}

/**
 * Response represents an AI-generated reply to an opportunity.
 * Supports multiple drafts per opportunity (version field).
 * 
 * Stored in MongoDB `responses` collection.
 * 
 * @see ADR-009: Response Suggestion Architecture
 */
export interface Response {
  /**
   * MongoDB document ID
   */
  _id: ObjectId;

  /**
   * Opportunity this response addresses
   * References opportunities._id
   */
  opportunityId: ObjectId;

  /**
   * Account generating this response
   * References accounts._id
   */
  accountId: ObjectId;

  /**
   * Generated response text (user-editable)
   */
  text: string;

  /**
   * Response lifecycle status
   */
  status: ResponseStatus;

  /**
   * When this response was generated
   */
  generatedAt: Date;

  /**
   * When this response was posted to platform (if status=posted)
   */
  postedAt?: Date;

  /**
   * When this response was dismissed (if status=dismissed)
   */
  dismissedAt?: Date;

  /**
   * Generation metadata for debugging and future learning
   */
  metadata: ResponseMetadata;

  /**
   * Version number for this opportunity
   * Increments with each "regenerate" call
   * Enables multi-draft comparison in future versions
   */
  version: number;

  /**
   * Last update timestamp
   */
  updatedAt: Date;

  /**
   * Platform-specific identifier for posted response
   * Populated after successful posting
   * 
   * Examples:
   * - Bluesky: AT URI (e.g., "at://did:plc:abc123.../app.bsky.feed.post/xyz789")
   * - LinkedIn: Post URN (future)
   * - Reddit: Post ID (future)
   * 
   * Used for:
   * - Linking back to platform post
   * - Future features: edit, delete, engagement tracking
   * 
   * @see ADR-010: Response Draft Posting
   */
  platformPostId?: string;

  /**
   * Public URL to view the posted response
   * 
   * Examples:
   * - Bluesky: "https://bsky.app/profile/user.bsky.social/post/xyz789"
   * - LinkedIn: "https://www.linkedin.com/feed/update/urn:li:share:abc123"
   * - Reddit: "https://reddit.com/r/subreddit/comments/abc123/..."
   * 
   * Used for:
   * - Clickable link in UI
   * - Sharing posted responses
   * 
   * @see ADR-010: Response Draft Posting
   */
  platformPostUrl?: string;
}

/**
 * Result of Stage 1 analysis (opportunity concept extraction).
 * Not persisted; used for Stage 2 KB search.
 */
export interface OpportunityAnalysis {
  /**
   * Primary subject of the post (1-3 words)
   * Example: "AI safety"
   */
  mainTopic: string;

  /**
   * Key terms for semantic search (3-5 terms)
   * Prefer specific over general
   * Example: ["regulation", "existential risk", "alignment"]
   */
  keywords: string[];

  /**
   * Field or area (e.g., "technology", "health", "policy")
   */
  domain: string;

  /**
   * Implicit or explicit question being asked
   * Use "none" if no question detected
   */
  question: string;
}

/**
 * Partial response for create operations (omit MongoDB-generated fields)
 */
export type CreateResponseInput = Omit<Response, '_id' | 'updatedAt'>;

/**
 * Partial response for update operations (only text edits allowed on drafts)
 */
export interface UpdateResponseInput {
  text: string;
}

/**
 * Type guard to check if an object is a valid Response
 */
export function isResponse(obj: unknown): obj is Response {
  if (typeof obj !== 'object' || obj === null) return false;
  const r = obj as Partial<Response>;
  return (
    r._id instanceof ObjectId &&
    r.opportunityId instanceof ObjectId &&
    r.accountId instanceof ObjectId &&
    typeof r.text === 'string' &&
    typeof r.status === 'string' &&
    ['draft', 'posted', 'dismissed'].includes(r.status) &&
    r.generatedAt instanceof Date &&
    (r.postedAt === undefined || r.postedAt instanceof Date) &&
    (r.dismissedAt === undefined || r.dismissedAt instanceof Date) &&
    typeof r.metadata === 'object' &&
    typeof r.version === 'number' &&
    r.updatedAt instanceof Date &&
    (r.platformPostId === undefined || typeof r.platformPostId === 'string') &&
    (r.platformPostUrl === undefined || typeof r.platformPostUrl === 'string')
  );
}

/**
 * Type guard to check if an object is a valid OpportunityAnalysis
 */
export function isOpportunityAnalysis(obj: unknown): obj is OpportunityAnalysis {
  if (typeof obj !== 'object' || obj === null) return false;
  const a = obj as Partial<OpportunityAnalysis>;
  return (
    typeof a.mainTopic === 'string' &&
    Array.isArray(a.keywords) &&
    a.keywords.every((k) => typeof k === 'string') &&
    typeof a.domain === 'string' &&
    typeof a.question === 'string'
  );
}

