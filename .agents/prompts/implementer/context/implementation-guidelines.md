# Implementation Guidelines for ngaj

## TDD Best Practices

### Red-Green-Refactor Cycle

**Red Phase** (Test-Writer's responsibility):
- Write failing tests first
- Verify tests fail for the right reason
- Clear, descriptive error messages

**Green Phase** (Implementer's focus):
- Write **simplest code** to make tests pass
- One test at a time
- Don't worry about elegance yet
- **Just make it work**

**Refactor Phase** (Implementer's quality pass):
- Improve code structure **after tests pass**
- Extract duplication
- Improve naming
- Apply patterns
- **Tests must stay green**

### Incremental Implementation

```bash
# Work on one test at a time
npm test tests/unit/services/discovery.spec.ts

# In watch mode for rapid feedback
npm test -- --watch
```

**Order of implementation**:
1. **Critical path** - Happy path scenarios (core functionality)
2. **Error handling** - Edge cases and error conditions
3. **Edge cases** - Boundary conditions and rare scenarios
4. **Performance** - Only if tests require it

## Code Organization

### Directory Structure

```
src/
├── backend/           # All backend code
│   ├── services/      # Business logic orchestration
│   ├── adapters/      # External API integration
│   ├── clients/       # External service clients
│   ├── processors/    # Data processing
│   ├── scheduler/     # Cron jobs and scheduled tasks
│   ├── utils/         # Backend-specific helper functions
│   ├── config/        # Configuration
│   └── index.ts       # Express server entry point
├── frontend/          # All frontend code
│   ├── components/    # React components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   └── utils/         # Frontend-specific utilities
└── shared/            # Code shared between backend and frontend
    ├── types/         # TypeScript interfaces
    └── errors/        # Custom error classes
```

### File Naming Conventions

- **kebab-case** for file names: `discovery-service.ts`, `bluesky-adapter.ts`
- **PascalCase** for classes: `DiscoveryService`, `BlueskyAdapter`
- **camelCase** for functions and variables: `discoverOpportunities`, `scoreThreshold`
- **SCREAMING_SNAKE_CASE** for constants: `DEFAULT_THRESHOLD`, `MAX_RETRIES`

## TypeScript Best Practices

### Strict Typing

```typescript
// ✅ Good: Explicit types, no 'any'
interface User {
  id: string;
  email: string;
  preferences: UserPreferences;
}

async function getUser(id: string): Promise<User | null> {
  // ...
}

// ❌ Bad: Loose typing, 'any'
async function getUser(id: any): Promise<any> {
  // ...
}
```

### Use 'unknown' Instead of 'any'

```typescript
// ✅ Good: Forces type checking
function processData(data: unknown): Result {
  if (typeof data === 'object' && data !== null) {
    // Type narrowing
    return handleObject(data);
  }
  throw new Error('Invalid data');
}

// ❌ Bad: Bypasses type safety
function processData(data: any): Result {
  return data.someProperty; // No type checking!
}
```

### Readonly and Immutability

```typescript
// ✅ Good: Immutable properties
interface Opportunity {
  readonly id: string;
  readonly post_id: string;
  status: OpportunityStatus; // Mutable
}

// ✅ Good: Readonly arrays
function processItems(items: readonly Item[]): Result {
  // items.push() - Compile error! ✅
  return items.map(transform);
}
```

### Union Types for State

```typescript
// ✅ Good: Explicit states
type Status = 'pending' | 'processing' | 'complete' | 'failed';

// ✅ Good: Discriminated unions
type Result =
  | { success: true; data: Data }
  | { success: false; error: Error };

function handleResult(result: Result) {
  if (result.success) {
    console.log(result.data); // TypeScript knows 'data' exists
  } else {
    console.error(result.error); // TypeScript knows 'error' exists
  }
}
```

### Generics for Reusability

```typescript
// ✅ Good: Generic repository
interface IRepository<T> {
  create(item: Omit<T, 'id'>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findMany(filter: Partial<T>): Promise<T[]>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// Usage
class OpportunityRepository implements IRepository<Opportunity> {
  // Type-safe CRUD operations
}
```

## Design Patterns

### Service Layer Pattern

**Purpose**: Orchestrate business logic, coordinate repositories and adapters

```typescript
export class DiscoveryService {
  constructor(
    private platformAdapter: IPlatformAdapter,
    private opportunityRepo: IOpportunityRepository,
    private scoringService: IScoringService,
    private userService: IUserService
  ) {}

  async discover(userId: string): Promise<Opportunity[]> {
    // 1. Get user configuration
    const preferences = await this.userService.getPreferences(userId);

    // 2. Fetch data from external source
    const posts = await this.platformAdapter.fetchRecentPosts({
      keywords: preferences.keywords,
      limit: 100
    });

    // 3. Apply business logic (scoring)
    const scored = await this.scoringService.scorePosts(posts, preferences);

    // 4. Filter by business rules
    const filtered = scored.filter(s => s.score.total >= 30);

    // 5. Persist results
    const opportunities = await this.opportunityRepo.createMany(
      filtered.map(s => this.toOpportunity(s, userId))
    );

    return opportunities;
  }

  // Private helper methods
  private toOpportunity(scored: ScoredPost, userId: string): OpportunityInput {
    // ...
  }
}
```

**Guidelines**:
- Services coordinate, they don't directly access databases
- Keep services thin - delegate to repositories and adapters
- Services contain **business logic**, not infrastructure code

---

### Repository Pattern

**Purpose**: Abstract database operations, hide MongoDB details

```typescript
export class OpportunityRepository implements IOpportunityRepository {
  constructor(private collection: Collection<OpportunityDocument>) {}

  async create(data: OpportunityInput): Promise<Opportunity> {
    const doc: OpportunityDocument = {
      _id: new ObjectId(),
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    };

    await this.collection.insertOne(doc);
    return this.toEntity(doc);
  }

  async findById(id: string): Promise<Opportunity | null> {
    const doc = await this.collection.findOne({ 
      _id: new ObjectId(id) 
    });
    
    return doc ? this.toEntity(doc) : null;
  }

  async findByUser(userId: string, status?: Status): Promise<Opportunity[]> {
    const filter: Filter<OpportunityDocument> = { user_id: userId };
    if (status) {
      filter.status = status;
    }

    const docs = await this.collection.find(filter).toArray();
    return docs.map(doc => this.toEntity(doc));
  }

  // Convert MongoDB document to domain entity
  private toEntity(doc: OpportunityDocument): Opportunity {
    return {
      id: doc._id.toString(),
      user_id: doc.user_id,
      platform: doc.platform,
      // ... other fields
      created_at: doc.created_at,
      updated_at: doc.updated_at
    };
  }
}
```

**Guidelines**:
- One repository per entity/aggregate root
- Hide MongoDB ObjectId conversion
- Return domain entities, not database documents
- Use proper TypeScript types for filters and queries

---

### Adapter Pattern

**Purpose**: Integrate external APIs, translate between external and internal types

```typescript
export class BlueskyAdapter implements IPlatformAdapter {
  private agent: BskyAgent;
  private authenticated: boolean = false;

  constructor(
    private credentials: BlueskyCredentials
  ) {
    this.agent = new BskyAgent({ 
      service: 'https://bsky.social' 
    });
  }

  async authenticate(): Promise<void> {
    if (this.authenticated) return;

    await this.agent.login({
      identifier: this.credentials.identifier,
      password: this.credentials.password
    });

    this.authenticated = true;
  }

  async fetchRecentPosts(filters: FetchFilters): Promise<Post[]> {
    await this.authenticate();

    // Rate limiting
    await this.rateLimiter.checkLimit();

    try {
      const response = await this.agent.app.bsky.feed.searchPosts({
        q: filters.keywords.join(' OR '),
        limit: filters.limit || 100
      });

      // Transform external type to internal type
      return response.data.posts.map(post => this.toInternalPost(post));
    } catch (error) {
      if (this.isRateLimitError(error)) {
        throw new RateLimitError(this.getRetryAfter(error));
      }
      throw new ApiError(`Bluesky API error: ${error.message}`);
    }
  }

  // Transform external type to internal type
  private toInternalPost(bskyPost: BskyPost): Post {
    return {
      id: bskyPost.uri,
      platform: 'bluesky',
      author: {
        id: bskyPost.author.did,
        username: bskyPost.author.handle,
        display_name: bskyPost.author.displayName || bskyPost.author.handle,
        follower_count: bskyPost.author.followersCount || 0
      },
      content: {
        text: bskyPost.record.text,
        created_at: new Date(bskyPost.record.createdAt)
      },
      engagement: {
        like_count: bskyPost.likeCount || 0,
        reply_count: bskyPost.replyCount || 0,
        repost_count: bskyPost.repostCount || 0
      },
      url: this.buildPostUrl(bskyPost)
    };
  }

  private buildPostUrl(post: BskyPost): string {
    const postId = post.uri.split('/').pop();
    return `https://bsky.app/profile/${post.author.handle}/post/${postId}`;
  }

  private isRateLimitError(error: any): boolean {
    return error.status === 429 || error.error === 'RateLimitError';
  }

  private getRetryAfter(error: any): number {
    return parseInt(error.headers?.['retry-after'] || '60', 10);
  }
}
```

**Guidelines**:
- One adapter per external service/platform
- Hide external API details from the rest of the application
- Transform external types to internal types (and vice versa)
- Handle rate limiting and retries at the adapter level
- Throw domain-specific errors, not raw API errors

---

## Error Handling

### Custom Error Classes

```typescript
// Base error class
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, field?: string, value?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, { field, value });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404, { resource, id });
  }
}

export class RateLimitError extends AppError {
  constructor(public retryAfter: number) {
    super('Rate limit exceeded', 'RATE_LIMIT', 429, { retryAfter });
  }
}

export class ApiError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'API_ERROR', 502, context);
  }
}
```

### Error Handling Patterns

```typescript
// ✅ Good: Specific error handling
async function discover(userId: string): Promise<Opportunity[]> {
  // Input validation
  if (!userId) {
    throw new ValidationError('User ID is required', 'userId', userId);
  }

  try {
    const posts = await this.adapter.fetchPosts(userId);
    return this.processPosts(posts);
  } catch (error) {
    // Handle specific error types
    if (error instanceof RateLimitError) {
      await this.delay(error.retryAfter * 1000);
      return this.discover(userId); // Retry
    }

    if (error instanceof NotFoundError) {
      return []; // Empty result is valid
    }

    // Log and rethrow unexpected errors
    logger.error('Discovery failed', { error, userId });
    throw new AppError('Discovery service failed', 'DISCOVERY_ERROR', 500, {
      originalError: error.message,
      userId
    });
  }
}
```

### Validation

```typescript
// ✅ Good: Explicit validation
function validateOpportunityInput(input: unknown): OpportunityInput {
  if (typeof input !== 'object' || input === null) {
    throw new ValidationError('Input must be an object');
  }

  const data = input as Record<string, unknown>;

  if (typeof data.post_id !== 'string' || !data.post_id) {
    throw new ValidationError('post_id is required', 'post_id', data.post_id);
  }

  if (typeof data.user_id !== 'string' || !data.user_id) {
    throw new ValidationError('user_id is required', 'user_id', data.user_id);
  }

  // Return validated, typed object
  return {
    post_id: data.post_id,
    user_id: data.user_id,
    platform: data.platform as Platform,
    // ... other fields
  };
}
```

## Dependency Injection

### Constructor Injection

```typescript
// ✅ Good: Dependencies injected, testable
export class DiscoveryService {
  constructor(
    private adapter: IPlatformAdapter,
    private repository: IOpportunityRepository,
    private logger: ILogger
  ) {}

  async discover(userId: string): Promise<Opportunity[]> {
    this.logger.info('Starting discovery', { userId });
    // ... implementation
  }
}

// Factory for production use
export function createDiscoveryService(config: Config): DiscoveryService {
  return new DiscoveryService(
    new BlueskyAdapter(config.bluesky),
    new OpportunityRepository(config.db.collection('opportunities')),
    new ConsoleLogger()
  );
}

// In tests, inject mocks
const mockAdapter = { fetchPosts: vi.fn() };
const mockRepository = { createMany: vi.fn() };
const mockLogger = { info: vi.fn(), error: vi.fn() };
const service = new DiscoveryService(mockAdapter, mockRepository, mockLogger);
```

### Interface-Based Design

```typescript
// Define interface for dependency
export interface IPlatformAdapter {
  authenticate(): Promise<void>;
  fetchRecentPosts(filters: FetchFilters): Promise<Post[]>;
  publishPost(content: PostContent): Promise<string>;
}

// Service depends on interface, not implementation
export class DiscoveryService {
  constructor(private adapter: IPlatformAdapter) {}
  // ... implementation
}

// Multiple implementations possible
export class BlueskyAdapter implements IPlatformAdapter { /* ... */ }
export class LinkedInAdapter implements IPlatformAdapter { /* ... */ }
export class MockAdapter implements IPlatformAdapter { /* ... */ } // For testing
```

## Async/Await Best Practices

### Error Handling

```typescript
// ✅ Good: Proper error handling
async function fetchData(id: string): Promise<Data> {
  try {
    const data = await api.fetch(id);
    return data;
  } catch (error) {
    logger.error('Fetch failed', { error, id });
    throw new ApiError(`Failed to fetch data: ${id}`);
  }
}

// ❌ Bad: Swallowed error
async function fetchData(id: string): Promise<Data | null> {
  try {
    return await api.fetch(id);
  } catch (error) {
    return null; // Error silently swallowed!
  }
}
```

### Parallel vs. Sequential

```typescript
// ✅ Good: Parallel execution (when independent)
async function fetchUserData(userId: string): Promise<UserData> {
  const [user, preferences, opportunities] = await Promise.all([
    userRepo.findById(userId),
    preferencesRepo.findByUser(userId),
    opportunityRepo.findByUser(userId)
  ]);

  return { user, preferences, opportunities };
}

// ✅ Good: Sequential execution (when dependent)
async function createAndNotify(data: InputData): Promise<void> {
  const entity = await repository.create(data); // Must finish first
  await notificationService.notify(entity.id);   // Depends on entity.id
}

// ❌ Bad: Unnecessary sequential execution
async function fetchUserData(userId: string): Promise<UserData> {
  const user = await userRepo.findById(userId);
  const preferences = await preferencesRepo.findByUser(userId);
  const opportunities = await opportunityRepo.findByUser(userId);
  // These are independent - use Promise.all!
}
```

## Testing Support

### Make Code Testable

```typescript
// ✅ Good: Testable design
export class RateLimiter {
  constructor(
    private maxRequests: number,
    private windowMs: number,
    private getCurrentTime: () => number = Date.now // Injectable for testing!
  ) {}

  canMakeRequest(): boolean {
    const now = this.getCurrentTime();
    // ... implementation
  }
}

// In tests, inject fake time
const fakeTime = vi.fn(() => 1000);
const limiter = new RateLimiter(10, 60000, fakeTime);
```

### Avoid Side Effects in Pure Logic

```typescript
// ✅ Good: Pure function, easy to test
export function scoreOpportunity(
  post: Post,
  keywords: string[],
  weights: ScoringWeights
): Score {
  const relevanceScore = calculateRelevance(post, keywords);
  const engagementScore = calculateEngagement(post);
  const timeliness = calculateTimeliness(post.created_at);

  return {
    total: (
      relevanceScore * weights.relevance +
      engagementScore * weights.engagement +
      timeliness * weights.timeliness
    ),
    relevance: relevanceScore,
    engagement: engagementScore,
    timeliness
  };
}

// ❌ Bad: Side effects, hard to test
export function scoreOpportunity(postId: string): Score {
  const post = fetchPostFromDb(postId);        // Side effect!
  const config = readConfigFile();             // Side effect!
  logScoringAttempt(postId);                   // Side effect!
  return calculateScore(post, config);
}
```

## Performance Considerations

### Only Optimize When Needed

**YAGNI applies to performance too!**

```typescript
// ✅ Good: Simple, clear implementation (start here)
function filterOpportunities(opportunities: Opportunity[]): Opportunity[] {
  return opportunities.filter(opp => opp.score.total >= 30);
}

// ⚠️ Maybe later: Optimize if profiling shows bottleneck
function filterOpportunitiesOptimized(opportunities: Opportunity[]): Opportunity[] {
  // Use binary search if opportunities are sorted by score
  // Add caching if filtering is called frequently
  // ... but only if tests require it or profiling proves it's slow!
}
```

### Database Query Optimization

```typescript
// ✅ Good: Efficient query
async function getActiveOpportunities(userId: string): Promise<Opportunity[]> {
  return this.collection
    .find({ 
      user_id: userId, 
      status: 'pending' 
    })
    .limit(100)
    .toArray();
}

// ✅ Good: Create index for common queries
await collection.createIndex({ user_id: 1, status: 1, created_at: -1 });

// ❌ Bad: Fetch all, filter in memory
async function getActiveOpportunities(userId: string): Promise<Opportunity[]> {
  const all = await this.collection.find({ user_id: userId }).toArray();
  return all.filter(opp => opp.status === 'pending').slice(0, 100);
}
```

## Code Quality

### Naming Conventions

```typescript
// ✅ Good: Clear, descriptive names
const discoverOpportunities = async (userId: string): Promise<Opportunity[]> => { /* ... */ };
const userPreferences = await getUserPreferences(userId);
const isRateLimited = checkRateLimit(userId);

// ❌ Bad: Unclear, abbreviated names
const do = async (id: string): Promise<Opp[]> => { /* ... */ };
const prefs = await getPrefs(id);
const rlim = checkRL(id);
```

### Function Size

```typescript
// ✅ Good: Small, focused function
async function discover(userId: string): Promise<Opportunity[]> {
  const posts = await this.fetchPosts(userId);
  const scored = await this.scorePosts(posts, userId);
  const filtered = this.filterByThreshold(scored);
  const deduplicated = await this.deduplicate(filtered, userId);
  return this.storeOpportunities(deduplicated);
}

// ❌ Bad: Large, doing too much (should be split)
async function discover(userId: string): Promise<Opportunity[]> {
  // 200 lines of logic here...
}
```

### Comments

```typescript
// ✅ Good: Explain WHY, not WHAT
// Exponential backoff prevents API ban when rate limited
await this.delay(Math.pow(2, attempt) * 1000);

// Use ChromaDB for semantic search - faster than MongoDB text search
const results = await chromadb.query(embedding, limit: 10);

// ❌ Bad: Obvious comment (code is self-explanatory)
// Increment the counter
counter++;

// ❌ Bad: Outdated comment (code changed, comment didn't)
// Sort by created_at ascending
opportunities.sort((a, b) => b.created_at - a.created_at); // Actually descending!
```

## Common Pitfalls

### ❌ Implementing Before Tests Pass

```typescript
// Wrong order: Implementing fancy features first
async function discover(userId: string): Promise<Opportunity[]> {
  // Complex caching logic
  // Advanced filtering
  // Performance optimizations
  // ... but tests still failing!
}

// ✅ Right order: Make tests pass first, then refactor
async function discover(userId: string): Promise<Opportunity[]> {
  // Simple implementation
  const posts = await this.adapter.fetchPosts(userId);
  return posts.filter(p => p.score >= 30);
}
// Tests pass ✅ → Now refactor if needed
```

### ❌ Ignoring Type Safety

```typescript
// ❌ Bad: Bypassing type system
const result = await api.fetch(id) as any;
result.foo.bar.baz(); // Runtime error waiting to happen!

// ✅ Good: Proper typing
const result = await api.fetch(id);
if (isValidResult(result)) {
  // TypeScript knows result is valid here
  result.foo.bar.baz();
}
```

### ❌ Not Handling Errors

```typescript
// ❌ Bad: No error handling
async function fetchData(id: string): Promise<Data> {
  return await api.fetch(id); // What if API fails?
}

// ✅ Good: Explicit error handling
async function fetchData(id: string): Promise<Data> {
  try {
    return await api.fetch(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new NotFoundError('Data', id);
    }
    throw new ApiError('Failed to fetch data', { id, error: error.message });
  }
}
```

## Summary Checklist

Before considering implementation complete:

- ✅ **All tests pass** - Green phase achieved
- ✅ **Code is refactored** - Clean, readable, maintainable
- ✅ **Types are strict** - No `any`, proper interfaces
- ✅ **Errors are handled** - Graceful error handling
- ✅ **Dependencies injected** - Testable architecture
- ✅ **No linter errors** - Follows project style
- ✅ **Complex logic documented** - Comments for WHY, not WHAT
- ✅ **YAGNI principle** - No over-engineering
- ✅ **Patterns followed** - Service/Repository/Adapter where appropriate

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Clean Code (JavaScript)](https://github.com/ryanmcdermott/clean-code-javascript)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

