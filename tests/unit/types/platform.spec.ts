import { describe, it, expect } from 'vitest';
import {
  Platform,
  PLATFORM_REGISTRY,
  getPlatformMetadata,
  isPlatform,
  getAllPlatforms,
  getAllPlatformMetadata,
  PlatformMetadata
} from '@/types/platform';

/**
 * Test Suite: Platform Type System
 * 
 * This test suite covers the platform type system including:
 * - Platform registry structure
 * - Type-safe platform metadata getter
 * - Runtime platform validation
 * - Platform enumeration utilities
 * 
 * Related to: BS-001 to BS-005 (Post.platform now uses Platform type)
 */

describe('Platform Type System', () => {
  describe('PLATFORM_REGISTRY', () => {
    it('should have bluesky platform registered', () => {
      expect(PLATFORM_REGISTRY.bluesky).toBeDefined();
    });

    it('should have correct bluesky metadata structure', () => {
      const bluesky = PLATFORM_REGISTRY.bluesky;
      
      expect(bluesky.id).toBe('bluesky');
      expect(bluesky.displayName).toBe('Bluesky');
      expect(bluesky.apiUrl).toBe('https://bsky.social');
      expect(bluesky.maxPostLength).toBe(300);
      expect(bluesky.supportsThreads).toBe(true);
      expect(bluesky.supportsPolls).toBe(false);
    });

    it('should have all required fields for each platform', () => {
      const platforms = Object.values(PLATFORM_REGISTRY);
      
      platforms.forEach(platform => {
        expect(platform).toHaveProperty('id');
        expect(platform).toHaveProperty('displayName');
        expect(platform).toHaveProperty('supportsThreads');
        expect(platform).toHaveProperty('supportsPolls');
        expect(typeof platform.id).toBe('string');
        expect(typeof platform.displayName).toBe('string');
        expect(typeof platform.supportsThreads).toBe('boolean');
        expect(typeof platform.supportsPolls).toBe('boolean');
      });
    });

    it('should have consistent id and key for each platform', () => {
      Object.entries(PLATFORM_REGISTRY).forEach(([key, metadata]) => {
        expect(metadata.id).toBe(key);
      });
    });

    it('should be immutable (readonly)', () => {
      // TypeScript enforces this at compile time
      // This test documents the expectation
      const registry: typeof PLATFORM_REGISTRY = PLATFORM_REGISTRY;
      expect(Object.isFrozen(registry)).toBe(false); // Not frozen, but const
      expect(registry).toBe(PLATFORM_REGISTRY); // Same reference
    });
  });

  describe('getPlatformMetadata()', () => {
    it('should return metadata for valid platform', () => {
      const metadata = getPlatformMetadata('bluesky');
      
      expect(metadata).toBeDefined();
      expect(metadata.id).toBe('bluesky');
      expect(metadata.displayName).toBe('Bluesky');
    });

    it('should return complete PlatformMetadata interface', () => {
      const metadata = getPlatformMetadata('bluesky');
      
      // Required fields
      expect(metadata.id).toBeDefined();
      expect(metadata.displayName).toBeDefined();
      expect(metadata.supportsThreads).toBeDefined();
      expect(metadata.supportsPolls).toBeDefined();
      
      // Check types
      expect(typeof metadata.id).toBe('string');
      expect(typeof metadata.displayName).toBe('string');
      expect(typeof metadata.supportsThreads).toBe('boolean');
      expect(typeof metadata.supportsPolls).toBe('boolean');
    });

    it('should return metadata with optional apiUrl when present', () => {
      const metadata = getPlatformMetadata('bluesky');
      
      if (metadata.apiUrl) {
        expect(typeof metadata.apiUrl).toBe('string');
        expect(metadata.apiUrl).toMatch(/^https?:\/\//);
      }
    });

    it('should return metadata with optional maxPostLength when present', () => {
      const metadata = getPlatformMetadata('bluesky');
      
      if (metadata.maxPostLength) {
        expect(typeof metadata.maxPostLength).toBe('number');
        expect(metadata.maxPostLength).toBeGreaterThan(0);
      }
    });

    it('should return same reference for multiple calls', () => {
      const metadata1 = getPlatformMetadata('bluesky');
      const metadata2 = getPlatformMetadata('bluesky');
      
      expect(metadata1).toBe(metadata2);
    });

    it('should be type-safe at compile time', () => {
      // This test documents TypeScript type safety
      // The following would cause TypeScript error:
      // getPlatformMetadata('invalid-platform');
      
      const validPlatform: Platform = 'bluesky';
      const metadata = getPlatformMetadata(validPlatform);
      expect(metadata).toBeDefined();
    });
  });

  describe('isPlatform()', () => {
    it('should return true for valid platform string', () => {
      expect(isPlatform('bluesky')).toBe(true);
    });

    it('should return false for invalid platform string', () => {
      expect(isPlatform('invalid')).toBe(false);
      expect(isPlatform('facebook')).toBe(false);
      expect(isPlatform('mastodon')).toBe(false);
      expect(isPlatform('threads')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isPlatform('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isPlatform(null as any)).toBe(false);
      expect(isPlatform(undefined as any)).toBe(false);
      expect(isPlatform(123 as any)).toBe(false);
      expect(isPlatform({} as any)).toBe(false);
      expect(isPlatform([] as any)).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isPlatform('Bluesky')).toBe(false);
      expect(isPlatform('BLUESKY')).toBe(false);
      expect(isPlatform('BlueSky')).toBe(false);
    });

    it('should work as type guard in TypeScript', () => {
      const value: string = 'bluesky';
      
      if (isPlatform(value)) {
        // TypeScript should know value is Platform here
        const metadata = getPlatformMetadata(value);
        expect(metadata).toBeDefined();
      }
    });

    it('should handle strings with whitespace', () => {
      expect(isPlatform(' bluesky')).toBe(false);
      expect(isPlatform('bluesky ')).toBe(false);
      expect(isPlatform(' bluesky ')).toBe(false);
    });

    it('should handle special characters', () => {
      expect(isPlatform('blue-sky')).toBe(false);
      expect(isPlatform('blue_sky')).toBe(false);
      expect(isPlatform('blue.sky')).toBe(false);
    });

    it('should return false for partial matches', () => {
      expect(isPlatform('blue')).toBe(false);
      expect(isPlatform('sky')).toBe(false);
      expect(isPlatform('bluesk')).toBe(false);
    });
  });

  describe('getAllPlatforms()', () => {
    it('should return array of platform IDs', () => {
      const platforms = getAllPlatforms();
      
      expect(Array.isArray(platforms)).toBe(true);
      expect(platforms.length).toBeGreaterThan(0);
    });

    it('should include bluesky in the list', () => {
      const platforms = getAllPlatforms();
      
      expect(platforms).toContain('bluesky');
    });

    it('should return array of strings', () => {
      const platforms = getAllPlatforms();
      
      platforms.forEach(platform => {
        expect(typeof platform).toBe('string');
      });
    });

    it('should return array matching registry keys', () => {
      const platforms = getAllPlatforms();
      const registryKeys = Object.keys(PLATFORM_REGISTRY);
      
      expect(platforms.length).toBe(registryKeys.length);
      expect(platforms.sort()).toEqual(registryKeys.sort());
    });

    it('should return valid platforms only', () => {
      const platforms = getAllPlatforms();
      
      platforms.forEach(platform => {
        expect(isPlatform(platform)).toBe(true);
      });
    });

    it('should return array that can be used with getPlatformMetadata', () => {
      const platforms = getAllPlatforms();
      
      platforms.forEach(platform => {
        const metadata = getPlatformMetadata(platform);
        expect(metadata).toBeDefined();
        expect(metadata.id).toBe(platform);
      });
    });

    it('should not return duplicates', () => {
      const platforms = getAllPlatforms();
      const uniquePlatforms = [...new Set(platforms)];
      
      expect(platforms.length).toBe(uniquePlatforms.length);
    });

    it('should return new array instance each time', () => {
      const platforms1 = getAllPlatforms();
      const platforms2 = getAllPlatforms();
      
      expect(platforms1).not.toBe(platforms2); // Different array instances
      expect(platforms1).toEqual(platforms2); // Same content
    });
  });

  describe('getAllPlatformMetadata()', () => {
    it('should return array of platform metadata', () => {
      const metadata = getAllPlatformMetadata();
      
      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata.length).toBeGreaterThan(0);
    });

    it('should include bluesky metadata in the list', () => {
      const metadata = getAllPlatformMetadata();
      const blueskyMeta = metadata.find(m => m.id === 'bluesky');
      
      expect(blueskyMeta).toBeDefined();
      expect(blueskyMeta?.displayName).toBe('Bluesky');
    });

    it('should return array of PlatformMetadata objects', () => {
      const metadata = getAllPlatformMetadata();
      
      metadata.forEach(meta => {
        expect(meta).toHaveProperty('id');
        expect(meta).toHaveProperty('displayName');
        expect(meta).toHaveProperty('supportsThreads');
        expect(meta).toHaveProperty('supportsPolls');
      });
    });

    it('should return metadata matching registry values', () => {
      const metadata = getAllPlatformMetadata();
      const registryValues = Object.values(PLATFORM_REGISTRY);
      
      expect(metadata.length).toBe(registryValues.length);
    });

    it('should return complete metadata for each platform', () => {
      const metadata = getAllPlatformMetadata();
      
      metadata.forEach(meta => {
        expect(typeof meta.id).toBe('string');
        expect(typeof meta.displayName).toBe('string');
        expect(typeof meta.supportsThreads).toBe('boolean');
        expect(typeof meta.supportsPolls).toBe('boolean');
      });
    });

    it('should return metadata that matches getPlatformMetadata results', () => {
      const allMetadata = getAllPlatformMetadata();
      const platforms = getAllPlatforms();
      
      platforms.forEach(platform => {
        const directMeta = getPlatformMetadata(platform);
        const listMeta = allMetadata.find(m => m.id === platform);
        
        expect(listMeta).toBe(directMeta);
      });
    });

    it('should not return duplicates', () => {
      const metadata = getAllPlatformMetadata();
      const ids = metadata.map(m => m.id);
      const uniqueIds = [...new Set(ids)];
      
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should return new array instance each time', () => {
      const metadata1 = getAllPlatformMetadata();
      const metadata2 = getAllPlatformMetadata();
      
      expect(metadata1).not.toBe(metadata2); // Different array instances
      expect(metadata1).toEqual(metadata2); // Same content
    });

    it('should return metadata with valid apiUrl format when present', () => {
      const metadata = getAllPlatformMetadata();
      
      metadata.forEach(meta => {
        if (meta.apiUrl) {
          expect(meta.apiUrl).toMatch(/^https?:\/\/.+/);
        }
      });
    });

    it('should return metadata with positive maxPostLength when present', () => {
      const metadata = getAllPlatformMetadata();
      
      metadata.forEach(meta => {
        if (meta.maxPostLength !== undefined) {
          expect(meta.maxPostLength).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Platform Type Integration', () => {
    it('should work with Post interface', () => {
      // This test documents how Platform type integrates with Post
      const platform: Platform = 'bluesky';
      
      // Platform type should be assignable to Post.platform
      const mockPost = {
        id: 'test-id',
        platform: platform, // Should be type-safe
        platformPostId: 'abc123',
        content: 'Test post',
        author: {
          id: 'user-id',
          username: 'testuser',
          displayName: 'Test User'
        },
        metrics: {
          likes: 0,
          replies: 0,
          reposts: 0
        },
        createdAt: new Date()
      };
      
      expect(mockPost.platform).toBe('bluesky');
      expect(isPlatform(mockPost.platform)).toBe(true);
    });

    it('should prevent invalid platform values at compile time', () => {
      // This test documents TypeScript type safety
      // The following would cause TypeScript errors:
      // const invalid: Platform = 'twitter';
      // const invalid: Platform = 'invalid';
      
      const valid: Platform = 'bluesky';
      expect(valid).toBe('bluesky');
    });

    it('should enable runtime validation of platform strings', () => {
      // Simulate receiving platform from external source
      const externalPlatform: string = 'bluesky';
      
      if (isPlatform(externalPlatform)) {
        // Now TypeScript knows it's a valid Platform
        const metadata = getPlatformMetadata(externalPlatform);
        expect(metadata.id).toBe('bluesky');
      } else {
        throw new Error('Invalid platform');
      }
    });

    it('should support iteration over all platforms', () => {
      const platforms = getAllPlatforms();
      const results: string[] = [];
      
      for (const platform of platforms) {
        const metadata = getPlatformMetadata(platform);
        results.push(metadata.displayName);
      }
      
      expect(results).toContain('Bluesky');
      expect(results.length).toBe(platforms.length);
    });

    it('should support filtering platforms by capabilities', () => {
      const platformsWithThreads = getAllPlatformMetadata()
        .filter(meta => meta.supportsThreads)
        .map(meta => meta.id);
      
      expect(platformsWithThreads).toContain('bluesky');
    });

    it('should support finding platforms by criteria', () => {
      const shortPostPlatforms = getAllPlatformMetadata()
        .filter(meta => meta.maxPostLength !== undefined && meta.maxPostLength <= 500)
        .map(meta => meta.id);
      
      expect(shortPostPlatforms).toContain('bluesky');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle registry with single platform', () => {
      // Currently only bluesky is registered
      const platforms = getAllPlatforms();
      expect(platforms.length).toBeGreaterThanOrEqual(1);
    });

    it('should maintain type safety with platform literals', () => {
      // Test that 'bluesky' literal is assignable to Platform
      const literal = 'bluesky';
      const typed: Platform = literal as Platform;
      
      expect(isPlatform(typed)).toBe(true);
    });
  });
});
