# ADR-007: Knowledge Base Implementation Strategy

## Status

**Accepted** - January 1, 2026

## Context

ngaj needs a knowledge base system that allows users to upload reference materials (PDFs, Markdown, TXT files) that ground AI-generated responses in their personal expertise and context. The system must be simple enough for v0.1 MVP while being extensible for future versions.

**Key Requirements:**
- Support PDF, Markdown, and TXT file uploads
- Extract text, chunk into semantic segments, and generate embeddings
- Enable semantic search to retrieve relevant context for AI responses
- Local-first architecture (all data on user's machine)
- Per-profile ownership (shared across accounts in future v0.2+)
- Simple operations: Upload, List, Delete (no preview/edit in v0.1)

## Options Considered

### Option A: Synchronous Processing with Inline Extraction
**Approach:** User uploads → API blocks → Process immediately → Return when complete

**Pros:**
- Simple error handling (HTTP response contains all errors)
- No background job infrastructure needed
- Easy to reason about (request/response model)
- Immediate feedback to user

**Cons:**
- Limited to documents processable within timeout (60s)
- Blocks HTTP thread during processing
- Cannot handle large documents (>10MB limit mitigates this)

### Option B: Asynchronous Processing with Job Queue
**Approach:** User uploads → API returns immediately → Background worker processes → Notify when done

**Pros:**
- Can handle larger documents
- Non-blocking API
- Scalable architecture

**Cons:**
- Requires job queue infrastructure
- Complex error handling (how to notify user?)
- Polling or WebSocket needed for status updates
- Overkill for v0.1 scope

### Option C: Hybrid (Sync for small, Async for large)
**Approach:** Detect size → Small files sync, large files async

**Pros:**
- Best of both worlds

**Cons:**
- Most complex implementation
- Two code paths to maintain
- Complexity not justified for v0.1

## Decision

We will implement **Option A: Synchronous Processing** for v0.1 MVP.

**Key Implementation Decisions:**

1. **Per-Profile Storage:** Knowledge base is owned by Profile (not Account), enabling future multi-account sharing
2. **Synchronous Processing:** Upload endpoint blocks until processing completes or times out (60s)
3. **Hard Delete:** Atomic deletion from MongoDB + ChromaDB + filesystem, no cascade to responses
4. **Simple Chunking:** Respect paragraph boundaries, ~500 tokens per chunk, 50-token overlap
5. **Claude Embeddings:** Use same LLM provider for consistency and API simplicity
6. **Configurable Limits:** Max file size (10MB), max storage (100MB), timeout (60s) via `.env`
7. **Inline Extraction:** Use `pdf-parse` for PDF, direct `fs.readFile` for MD/TXT
8. **Top-K Search:** Configurable number of chunks to retrieve (default 5), no similarity threshold
9. **Minimal Metadata:** Store filename, size, upload date, chunk count; no preview/tagging in v0.1
10. **Fail Fast:** No automatic retries; clear error messages returned to user

## Rationale

**Why Synchronous:**
- v0.1 MVP targets small reference documents (blog posts, notes, short papers)
- 10MB file limit + 60s timeout covers 95% of expected use cases
- Eliminates need for background job infrastructure (workers, status polling)
- Simpler testing and debugging
- Can migrate to async in v0.2 if needed (data model supports it)

**Why Per-Profile:**
- Aligns with domain model (Profile = "who you are", including expertise)
- Enables v0.2 multi-account feature (multiple accounts share one profile's KB)
- Cleaner separation of concerns

**Why Hard Delete:**
- v0.1 has no response citation tracking
- Manual KB management expected in MVP
- Can add soft delete + cascade in v0.2 if needed

**Why Claude Embeddings:**
- Already using Claude for LLM (Sonnet 4.5)
- One API key, one vendor, simpler billing
- Claude embeddings are high quality
- No need for separate OpenAI key

**Why Configurable Limits:**
- Users have different storage constraints
- May need to adjust timeout based on hardware
- Enables testing with different values
- No code rebuild required for tuning

## Consequences

### Positive
- **Fast Development:** No background job infrastructure, ~2-3 days vs. 1-2 weeks
- **Simple Testing:** Synchronous flow easy to test end-to-end
- **Clear Errors:** User immediately knows if upload failed and why
- **Low Complexity:** Fewer moving parts, easier to debug
- **Future Extensible:** Data model supports async processing in v0.2

### Negative
- **Size Limitation:** Cannot process very large documents (>10MB)
- **Blocking API:** HTTP thread tied up during processing (mitigated by single-user v0.1)
- **Timeout Risk:** Complex PDFs might hit 60s timeout (edge case)
- **No Progress Updates:** User waits without feedback (acceptable for v0.1)

### Mitigation
- Clear documentation: "Recommended max 10MB per file"
- Helpful error messages: "Processing timeout - try smaller file"
- Monitor metrics: Track processing times to inform v0.2 async migration

## Technical Details

See [Knowledge Base Design Document](../../.agents/artifacts/designer/designs/knowledge-base-design.md) for complete technical specification including:
- MongoDB schema for `knowledge_documents` collection
- ChromaDB collection structure and metadata
- Filesystem organization (`~/.ngaj/knowledge/{profileId}/{documentId}/`)
- Service interfaces (`KnowledgeBaseService`)
- API endpoints (`POST /api/knowledge`, `GET /api/knowledge`, `DELETE /api/knowledge/:id`)
- Processing pipeline (upload → extract → chunk → embed → store)

## Related Decisions

- Builds on: [ADR-001: MongoDB Storage](./001-mongodb-storage.md)
- Builds on: [ADR-004: ChromaDB for Vectors](./004-chromadb-vectors.md)
- Relates to: [ADR-005: MVP Scope](./005-mvp-scope.md) - Knowledge base is core v0.1 feature
- Relates to: [ADR-006: Profile-Account Separation](./006-profile-account-separation.md) - KB owned by Profile

## Future Evolution

**v0.2 Migration Path:**
- Add `processing_status` field: `pending`, `processing`, `completed`, `failed`
- Introduce background job queue
- Convert to async: Upload returns immediately, process in background
- Add WebSocket or polling for status updates
- Increase file size limits (50MB+)

**v0.3+ Features:**
- Document preview and text extraction display
- Tagging and categorization (metadata filtering)
- Edit document metadata (title, description, tags)
- Soft delete with trash/restore
- Citation tracking (which responses used which documents)
- DOCX, HTML, EPUB support

## References

- [ChromaDB Documentation](https://docs.trychroma.com/)
- [pdf-parse Library](https://www.npmjs.com/package/pdf-parse)
- [Claude API - Embeddings](https://docs.anthropic.com/claude/docs)

