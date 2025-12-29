# Example Design Session: Opportunity Scoring

This is an example of what a complete design session looks like.

## Initial Request

**User**: "design opportunity scoring system"

## Discovery Phase

**Designer Agent**: 
> Let's explore opportunity scoring! I see from the project glossary that "Scoring" is defined as:
> 
> > Algorithm that ranks opportunities by relevance using impact, recency, and keyword matching
> 
> A few questions to understand the requirements:
> 
> 1. **Scoring Frequency**: Should we score once (when opportunity is created) or recalculate periodically?
> 2. **Score Range**: What range makes sense? 0-100? 0-1? Unbounded?
> 3. **Weights**: Should impact/recency/keywords have equal weight, or should they be configurable?
> 4. **Performance**: How many opportunities do we expect to score? (impacts whether we need caching)

**User**: 
> 1. Score once for now, we can add re-scoring later if needed
> 2. 0-100 feels intuitive
> 3. Configurable weights would be nice for user preferences
> 4. MVP handles maybe 10-50 opportunities per day, so performance isn't critical yet

## Exploration Phase

**Designer Agent**:
> Great context! Let me sketch out a data model approach:
> 
> ### Data Model Option A: Simple Score
> 
> ```typescript
> interface Opportunity {
>   id: string;
>   platform: 'bluesky';
>   post_id: string;
>   score: number;  // 0-100, computed once
>   discovered_at: Date;
>   // ... other fields
> }
> ```
> 
> **Pros**: Simple, minimal storage
> **Cons**: Can't debug why a score was assigned, can't re-weight without re-scoring
> 
> ### Data Model Option B: Score Breakdown
> 
> ```typescript
> interface Opportunity {
>   id: string;
>   platform: 'bluesky';
>   post_id: string;
>   scoring: {
>     total: number;           // 0-100
>     impact_score: number;    // 0-33.33
>     recency_score: number;   // 0-33.33
>     keyword_score: number;   // 0-33.33
>     weights_used: {
>       impact: number;
>       recency: number;
>       keywords: number;
>     };
>     scored_at: Date;
>   };
>   discovered_at: Date;
>   // ... other fields
> }
> ```
> 
> **Pros**: Transparent, debuggable, can show breakdown to user, can re-score with different weights
> **Cons**: More storage (~100 bytes), slightly more complex
> 
> Given that we want configurable weights and this is a user-facing feature, I'd recommend **Option B** for transparency and debuggability. Does that align with your thinking?

**User**: 
> Yes, Option B. Transparency is worth the extra complexity.

**Designer Agent**:
> Perfect! Now for the scoring logic. Here's my proposed algorithm:
> 
> ### Scoring Algorithm
> 
> ```typescript
> function scoreOpportunity(
>   post: Post,
>   user_keywords: string[],
>   weights: ScoringWeights
> ): OpportunityScore {
>   // 1. Impact Score (0-100 normalized)
>   const impact_raw = (
>     post.like_count * 1 +
>     post.reply_count * 2 +
>     post.repost_count * 3 +
>     (post.author.follower_count / 1000)  // scale down followers
>   );
>   const impact_normalized = Math.min(100, impact_raw); // cap at 100
>   
>   // 2. Recency Score (0-100, exponential decay)
>   const hours_old = (Date.now() - post.created_at.getTime()) / (1000 * 60 * 60);
>   const recency_normalized = Math.max(0, 100 * Math.exp(-hours_old / 24)); // half-life 24h
>   
>   // 3. Keyword Score (0-100, based on matches)
>   const keyword_matches = user_keywords.filter(kw => 
>     post.text.toLowerCase().includes(kw.toLowerCase())
>   ).length;
>   const keyword_normalized = Math.min(100, (keyword_matches / user_keywords.length) * 100);
>   
>   // 4. Weighted Total
>   const total = (
>     impact_normalized * weights.impact +
>     recency_normalized * weights.recency +
>     keyword_normalized * weights.keywords
>   ) / (weights.impact + weights.recency + weights.keywords);
>   
>   return {
>     total: Math.round(total),
>     impact_score: Math.round(impact_normalized * weights.impact),
>     recency_score: Math.round(recency_normalized * weights.recency),
>     keyword_score: Math.round(keyword_normalized * weights.keywords),
>     weights_used: weights,
>     scored_at: new Date()
>   };
> }
> ```
> 
> **Questions**:
> 1. Impact weights: Are likes=1, replies=2, reposts=3 reasonable?
> 2. Recency decay: 24-hour half-life means posts lose half their recency score per day. Too fast? Too slow?
> 3. Keyword matching: Simple substring match, or should we use fuzzy matching?

**User**: 
> 1. Weights look good
> 2. 24 hours might be too fast for my use case - maybe 72 hours?
> 3. Simple substring is fine for MVP

**Designer Agent**:
> Noted! I'll use 72-hour half-life. Now let's think about the API:
> 
> ### Service Interface
> 
> ```typescript
> interface IScoringService {
>   /**
>    * Score a single opportunity
>    */
>   scoreOpportunity(
>     post: Post,
>     userKeywords: string[],
>     weights: ScoringWeights
>   ): OpportunityScore;
>   
>   /**
>    * Score multiple opportunities (batch)
>    */
>   scoreOpportunities(
>     posts: Post[],
>     userKeywords: string[],
>     weights: ScoringWeights
>   ): OpportunityScore[];
>   
>   /**
>    * Get default scoring weights (from user preferences or system defaults)
>    */
>   getDefaultWeights(userId: string): Promise<ScoringWeights>;
> }
> ```
> 
> We don't need a REST endpoint for this (it's internal), but we might add one later for debugging.
> 
> ### Edge Cases
> 
> 1. **Zero keywords**: If user has no keywords, keyword_score = 0 (effectively ignore that factor)
> 2. **Zero weights**: If all weights are 0, return score = 0
> 3. **Missing post data**: If post lacks like_count, default to 0
> 4. **Very old posts**: Recency score floors at 0 (never negative)
> 
> Does this cover the main scenarios?

**User**: 
> Yes, looks comprehensive!

## Documentation Phase

**Designer Agent**:
> Excellent! I'll now create:
> 1. ADR-006 documenting this scoring approach
> 2. Design document with full schema and algorithms
> 3. Type definitions
> 4. Handoff doc for Test-Writer
> 
> [Creates files...]
> 
> Done! Here's what I created:
> 
> - `docs/architecture/decisions/006-opportunity-scoring.md` - ADR
> - `.agents/artifacts/designer/designs/opportunity-scoring-design.md` - Full design
> - `src/types/scoring.ts` - TypeScript types
> - `.agents/artifacts/designer/handoffs/opportunity-scoring-handoff.md` - Test-Writer handoff
> 
> **Next Steps**: Say "write tests for opportunity-scoring"

## Artifacts Created

### 1. ADR-006 (Summary)

```markdown
# ADR-006: Opportunity Scoring Algorithm

## Decision
Use weighted scoring with impact, recency, and keyword factors. Store score breakdown for transparency.

## Options Considered
- Option A: Simple total score (rejected - not debuggable)
- Option B: Score breakdown (accepted - transparent and debuggable)

## Rationale
- Transparency helps users understand why opportunities are ranked
- Breakdown enables re-scoring with different weights
- Configurable weights support user preferences

## Consequences
- Positive: Debuggable, user-friendly, flexible
- Negative: ~100 bytes extra storage per opportunity
```

### 2. Type Definitions (src/types/scoring.ts)

```typescript
export interface ScoringWeights {
  impact: number;      // e.g., 1.0
  recency: number;     // e.g., 1.0
  keywords: number;    // e.g., 1.0
}

export interface OpportunityScore {
  total: number;           // 0-100
  impact_score: number;    // Weighted impact
  recency_score: number;   // Weighted recency
  keyword_score: number;   // Weighted keyword match
  weights_used: ScoringWeights;
  scored_at: Date;
}

export interface IScoringService {
  scoreOpportunity(
    post: Post,
    userKeywords: string[],
    weights: ScoringWeights
  ): OpportunityScore;
  
  scoreOpportunities(
    posts: Post[],
    userKeywords: string[],
    weights: ScoringWeights
  ): OpportunityScore[];
  
  getDefaultWeights(userId: string): Promise<ScoringWeights>;
}
```

### 3. Handoff to Test-Writer (Summary)

```markdown
# Test-Writer Handoff: Opportunity Scoring

## Entities to Test
- `OpportunityScore` - Score breakdown structure
- `ScoringService` - Scoring logic

## Test Scenarios

### Unit Tests
1. **scoreOpportunity() - Happy Path**
   - Given: Post with 10 likes, 5 replies, 2 reposts, created 12 hours ago
   - Given: User keywords ["typescript", "testing"]
   - Given: Equal weights (1, 1, 1)
   - When: scoreOpportunity called
   - Then: Returns score with impact, recency, keyword components

2. **scoreOpportunity() - Old Post**
   - Given: Post created 30 days ago
   - Then: recency_score is very low (near 0)

3. **scoreOpportunity() - No Keywords**
   - Given: User has no keywords
   - Then: keyword_score = 0

4. **scoreOpportunity() - Zero Weights**
   - Given: All weights = 0
   - Then: total = 0

5. **scoreOpportunities() - Batch Scoring**
   - Given: Array of 10 posts
   - Then: Returns 10 scores, each valid

### Edge Cases
- Missing post data (no like_count, etc.) → defaults to 0
- Negative follower count → treats as 0
- Very high engagement → caps at reasonable values

## Acceptance Criteria
- [ ] Scores are deterministic (same input → same output)
- [ ] Scores are in 0-100 range
- [ ] Breakdown components sum logically
- [ ] Edge cases handled gracefully
```

## Outcome

**Total Time**: ~30 minutes
**ADRs Created**: 1 (ADR-006)
**Design Docs**: 1
**Type Files**: 1
**Handoff Docs**: 1

**Next Agent**: Test-Writer Agent can now write comprehensive tests based on the handoff document.

**Key Decisions Documented**:
- Score breakdown (Option B) for transparency
- 72-hour recency half-life
- Configurable weights for user preferences
- Simple keyword matching for MVP

---

This example shows the full lifecycle of a design session from initial question to documented, ready-to-test design.

