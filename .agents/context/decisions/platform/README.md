# Type System Documentation

This directory contains the core type definitions for the ngaj social media aggregation platform.

## Platform Type System

The platform enumeration has been designed for extensibility using TypeScript's advanced type system features.

### Overview

Instead of a simple string union, we use a **registry-based approach** that provides:

- ✅ **Compile-time type safety** - TypeScript catches invalid platforms
- ✅ **Runtime validation** - Check if strings are valid platforms at runtime
- ✅ **Rich metadata** - Store platform-specific configuration and capabilities
- ✅ **Easy extensibility** - Add new platforms by adding to the registry
- ✅ **Zero runtime overhead** - All compiled away by TypeScript

### Architecture

```typescript
// Central registry with metadata
export const PLATFORM_REGISTRY = {
  bluesky: {
    id: 'bluesky',
    displayName: 'Bluesky',
    apiUrl: 'https://bsky.social',
    maxPostLength: 300,
    supportsThreads: true,
    supportsPolls: false,
  },
  // ... more platforms
} as const satisfies Record<string, PlatformMetadata>;

// Type extracted from registry keys
export type Platform = keyof typeof PLATFORM_REGISTRY;
```

### Usage

```typescript
import { Platform, getPlatformMetadata, isPlatform } from '@/types/platform';

// Type-safe platform usage
const platform: Platform = 'bluesky';  // ✅ Valid
const invalid: Platform = 'facebook';   // ❌ TypeScript error

// Access metadata
const meta = getPlatformMetadata('twitter');
console.log(meta.displayName);  // "X (Twitter)"
console.log(meta.maxPostLength); // 280

// Runtime validation
if (isPlatform(userInput)) {
  // TypeScript knows userInput is now Platform type
  processPost(userInput);
}
```

### Adding a New Platform

To add support for a new platform:

1. Open `src/types/platform.ts`
2. Add a new entry to `PLATFORM_REGISTRY`:

```typescript
export const PLATFORM_REGISTRY = {
  // ... existing platforms
  mastodon: {
    id: 'mastodon',
    displayName: 'Mastodon',
    apiUrl: 'https://mastodon.social',
    maxPostLength: 500,
    supportsThreads: true,
    supportsPolls: true,
  },
} as const satisfies Record<string, PlatformMetadata>;
```

3. TypeScript will automatically include it in the `Platform` type union
4. All type guards and utilities will work with the new platform immediately

### Files

- **`platform.ts`** - Platform registry, types, and utility functions
- **`post.ts`** - Post interface and related types
- **`adapter.ts`** - Social media adapter interfaces
- **`index.ts`** - Central export point for all types
- **`platform.example.ts`** - Usage examples and patterns
- **`README.md`** - This documentation

### Benefits Over Simple Enums

| Feature | String Union | Our Approach |
|---------|--------------|--------------|
| Type Safety | ✅ | ✅ |
| Runtime Validation | ❌ | ✅ |
| Metadata Storage | ❌ | ✅ |
| Enumeration at Runtime | ❌ | ✅ |
| Platform Capabilities | ❌ | ✅ |
| Tree-shakeable | ✅ | ✅ |

### API Reference

#### Types

- `Platform` - Union type of all supported platform IDs
- `PlatformMetadata` - Interface for platform metadata

#### Registry

- `PLATFORM_REGISTRY` - Const object containing all platforms and their metadata

#### Functions

- `getPlatformMetadata(platform: Platform): PlatformMetadata` - Get metadata for a platform
- `isPlatform(value: string): value is Platform` - Type guard for runtime validation
- `getAllPlatforms(): Platform[]` - Get array of all platform IDs
- `getAllPlatformMetadata(): PlatformMetadata[]` - Get array of all metadata

### See Also

- `platform.example.ts` - Comprehensive usage examples
- Project glossary: `.agents/context/project-glossary.md`
- Architecture docs: `docs/architecture/`

