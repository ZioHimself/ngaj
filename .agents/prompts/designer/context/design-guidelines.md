# Design Guidelines for ngaj

## Data Modeling Principles

### MongoDB Document Design

**Embed vs. Reference**:
- **Embed** when:
  - Data is always accessed together
  - One-to-few relationship (< 100 items)
  - Child data doesn't need independent access
  - Example: User preferences, opportunity metadata

- **Reference** when:
  - Data is accessed independently
  - One-to-many or many-to-many
  - Child data is large or frequently updated
  - Example: User → Opportunities, Knowledge Base → Chunks

**Indexing Strategy**:
- Index query fields (especially in filters)
- Compound indexes for common query patterns
- Consider index size vs. query performance
- Example: `{ user_id: 1, created_at: -1 }` for "user's recent opportunities"

**Schema Evolution**:
- Use optional fields for new features
- Version schemas if breaking changes needed
- Plan migration path for existing data

### TypeScript Type Design

**Strict Typing**:
```typescript
// ✅ Good: Explicit, type-safe
interface User {
  id: string;
  email: string;
  preferences: UserPreferences;
}

// ❌ Bad: Loose, error-prone
interface User {
  id: any;
  email?: string;
  preferences: object;
}
```

**Separation of Concerns**:
- **Entity Types**: Domain objects (`User`, `Opportunity`)
- **DTO Types**: API request/response (`CreateUserDto`, `UserResponse`)
- **Internal Types**: Service-specific (`ProcessingResult`)

**DRY with Utility Types**:
```typescript
// Reuse with Pick, Omit, Partial
type CreateUserDto = Omit<User, 'id' | 'created_at' | 'updated_at'>;
type UpdateUserDto = Partial<CreateUserDto>;
```

## API Design Principles

### RESTful Conventions

**Resource Naming**:
- Plural nouns: `/api/opportunities`, `/api/users`
- Nested resources: `/api/users/:userId/opportunities`
- Actions as sub-resources: `/api/opportunities/:id/dismiss`

**HTTP Methods**:
- `GET` - Read (idempotent, safe)
- `POST` - Create (non-idempotent)
- `PUT` - Replace (idempotent)
- `PATCH` - Update partially (idempotent)
- `DELETE` - Remove (idempotent)

**Status Codes**:
- `200 OK` - Success (GET, PATCH, PUT)
- `201 Created` - Resource created (POST)
- `204 No Content` - Success with no body (DELETE)
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid auth
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Duplicate/constraint violation
- `429 Too Many Requests` - Rate limit
- `500 Internal Server Error` - Server fault

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;        // Error type: "ValidationError", "NotFoundError"
  message: string;      // Human-readable message
  details?: object;     // Additional context (e.g., validation errors)
  request_id?: string;  // For debugging (optional)
}
```

Example:
```json
{
  "error": "ValidationError",
  "message": "Invalid request body",
  "details": {
    "field": "email",
    "constraint": "must be valid email format"
  }
}
```

### Versioning Strategy

For v0.1 MVP:
- No versioning yet (breaking changes OK)

For v0.2+:
- URL versioning: `/api/v1/resources`
- Or header versioning: `Accept: application/vnd.ngaj.v1+json`

## Architecture Patterns

### Service Layer Pattern

```typescript
// Controller (API Layer) - thin, no business logic
async function createOpportunityHandler(req, res) {
  const dto = req.body;
  const opportunity = await opportunityService.create(dto);
  res.status(201).json(opportunity);
}

// Service (Business Logic) - testable, reusable
class OpportunityService {
  async create(dto: CreateOpportunityDto): Promise<Opportunity> {
    // Validation
    // Business rules
    // Persistence
    // Side effects (notifications, etc.)
  }
}
```

### Repository Pattern

```typescript
// Abstract persistence operations
interface IOpportunityRepository {
  create(data: OpportunityData): Promise<Opportunity>;
  findById(id: string): Promise<Opportunity | null>;
  findByUserId(userId: string, filters: Filters): Promise<Opportunity[]>;
  update(id: string, data: Partial<OpportunityData>): Promise<Opportunity>;
  delete(id: string): Promise<void>;
}

// MongoDB implementation
class MongoOpportunityRepository implements IOpportunityRepository {
  // ... MongoDB-specific code
}
```

**Benefits**:
- Testable (mock repository in tests)
- Swappable (could replace MongoDB later)
- Clear separation of concerns

### Adapter Pattern (for External APIs)

```typescript
// Platform-agnostic interface
interface ISocialPlatform {
  authenticate(credentials: Credentials): Promise<void>;
  fetchPosts(filters: FetchFilters): Promise<Post[]>;
  replyToPost(postId: string, content: string): Promise<Reply>;
}

// Platform-specific implementations
class BlueskyAdapter implements ISocialPlatform {
  // Bluesky-specific API calls
}

class LinkedInAdapter implements ISocialPlatform {
  // LinkedIn-specific API calls
}
```

## Design for Testing

### Testable Design Principles

1. **Dependency Injection**:
```typescript
// ✅ Good: Dependencies injected
class OpportunityService {
  constructor(
    private repo: IOpportunityRepository,
    private llm: ILLMProvider
  ) {}
}

// ❌ Bad: Hard-coded dependencies
class OpportunityService {
  private repo = new MongoOpportunityRepository();
  private llm = new AnthropicClient();
}
```

2. **Pure Functions Where Possible**:
```typescript
// ✅ Good: Pure, easy to test
function scoreOpportunity(opportunity: Opportunity, config: ScoringConfig): number {
  return (
    opportunity.impact * config.impactWeight +
    recencyScore(opportunity.created_at) * config.recencyWeight
  );
}

// ❌ Bad: Side effects, hard to test
function scoreOpportunity(opportunity: Opportunity): number {
  const config = readConfigFromFile(); // Side effect!
  logScore(opportunity.id);             // Side effect!
  return calculateScore(opportunity, config);
}
```

3. **Interface Contracts**:
- Design interfaces before implementations
- Mocking becomes trivial
- Tests don't depend on concrete implementations

## MVP Constraints (ADR-005)

Remember these scope limits for v0.1:
- **Single Account**: No multi-user, no account switching
- **Bluesky Only**: No LinkedIn, Reddit (yet)
- **Manual Review**: User approves all responses
- **Local First**: No cloud sync, no external services (except APIs)

Design decisions should:
- ✅ Support future multi-account (but don't implement now)
- ✅ Use adapter pattern (ready for multi-platform)
- ✅ Keep it simple (don't over-engineer for future)

## Common Pitfalls to Avoid

### Over-Engineering
❌ "Let's create a plugin system for future extensibility"
✅ "Let's use interfaces so we can extend later if needed"

### Under-Specifying
❌ "We'll figure out error handling during implementation"
✅ "Let's document expected errors and how to handle them"

### Ignoring Constraints
❌ "This would be easier with PostgreSQL"
✅ "How do we best model this in MongoDB?"

### Skipping Edge Cases
❌ "Happy path only for now"
✅ "What happens if the API is down? Duplicate posts? No internet?"

## Useful References

- [MongoDB Schema Design Patterns](https://www.mongodb.com/blog/post/building-with-patterns-a-summary)
- [REST API Best Practices](https://restfulapi.net/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

