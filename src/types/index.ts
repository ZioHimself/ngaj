/**
 * Central export point for all type definitions
 */

// Platform types and utilities
export {
  type Platform,
  type PlatformMetadata,
  PLATFORM_REGISTRY,
  getPlatformMetadata,
  isPlatform,
  getAllPlatforms,
  getAllPlatformMetadata,
} from './platform';

// Post-related types
export type { Post, Author, PostMetrics } from './post';

// Adapter-related types
export type { AdapterConfig, SearchOptions, SocialAdapter } from './adapter';

