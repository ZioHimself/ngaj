/**
 * Platform metadata
 */
export interface PlatformMetadata {
  id: string;
  displayName: string;
  apiUrl?: string;
  maxPostLength?: number;
  supportsThreads: boolean;
  supportsPolls: boolean;
}

/**
 * Platform registry with rich metadata
 */
export const PLATFORM_REGISTRY = {
  bluesky: {
    id: 'bluesky',
    displayName: 'Bluesky',
    apiUrl: 'https://bsky.social',
    maxPostLength: 300,
    supportsThreads: true,
    supportsPolls: false,
  }
} as const satisfies Record<string, PlatformMetadata>;

/**
 * Union type of all registered platform IDs
 */
export type Platform = keyof typeof PLATFORM_REGISTRY;

/**
 * Type-safe platform metadata getter
 * @param platform - The platform ID
 * @returns The platform metadata
 */
export function getPlatformMetadata(platform: Platform): PlatformMetadata {
  return PLATFORM_REGISTRY[platform];
}

/**
 * Runtime validation to check if a string is a valid platform
 * @param value - The value to check
 * @returns True if the value is a valid platform
 */
export function isPlatform(value: string): value is Platform {
  return value in PLATFORM_REGISTRY;
}

/**
 * Get all registered platform IDs
 * @returns Array of all platform IDs
 */
export function getAllPlatforms(): Platform[] {
  return Object.keys(PLATFORM_REGISTRY) as Platform[];
}

/**
 * Get all platform metadata entries
 * @returns Array of all platform metadata objects
 */
export function getAllPlatformMetadata(): PlatformMetadata[] {
  return Object.values(PLATFORM_REGISTRY);
}

