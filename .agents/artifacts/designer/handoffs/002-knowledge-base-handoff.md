# Knowledge Base - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-007: Knowledge Base Implementation Strategy](../../../docs/architecture/decisions/007-knowledge-base-implementation.md)
🔗 **Technical Specs**: [Design Document](../designs/knowledge-base-design.md)

## Overview

The Knowledge Base feature enables users to upload reference documents (PDF, Markdown, TXT) that are processed synchronously into semantic chunks with embeddings for similarity search. Testing must verify the complete workflow: upload → extract → chunk → embed → store → query → delete, including error handling and edge cases.

---

## 1. Test Scope

### In Scope
- ✅ File upload and validation (type, size, storage limits)
- ✅ Text extraction from PDF, Markdown, TXT files
- ✅ Semantic chunking with overlap and boundary respect
- ✅ Embedding generation via Claude API
- ✅ Storage in MongoDB + ChromaDB + filesystem (atomic operations)
- ✅ Document listing with metadata
- ✅ Knowledge base querying (semantic search)
- ✅ Document deletion (hard delete, atomic cleanup)
- ✅ Error handling and rollback
- ✅ Configuration validation (limits, timeouts)

### Out of Scope (for v0.1)
- ❌ Document preview or text display
- ❌ Document metadata editing
- ❌ Soft delete or trash functionality
- ❌ Citation tracking (which responses used which documents)
- ❌ Tagging or categorization
- ❌ Asynchronous processing or progress updates
- ❌ DOCX, HTML, or other file formats
- ❌ OCR for image-only PDFs

---

## 2. Test Scenarios

### 2.1 Unit Tests: DocumentProcessor

See [Design Doc Section 3.2](../designs/knowledge-base-design.md#32-documentprocessor-internal-module) for complete interface.

#### Scenario 2.1.1: Extract text from PDF

**Given**: A valid PDF file with text content
**When**: `extractText(filePath, "application/pdf")` is called
**Then**: Returns plain text content

**Acceptance Criteria**:
- [ ] Extracted text matches expected content (sample PDFs with known text)
- [ ] Whitespace is normalized (multiple spaces → single space)
- [ ] Page breaks and headers/footers are handled reasonably
- [ ] Non-text elements (images, tables) are either skipped or converted to text

**Edge Cases**:
- Password-protected PDF → Should throw `ExtractionError`
- Corrupt PDF → Should throw `ExtractionError`
- Empty PDF (no text) → Should return empty string
- Image-only PDF → Should return empty string (OCR out of scope)

---

#### Scenario 2.1.2: Extract text from Markdown

**Given**: A Markdown file with various formatting (headers, lists, code blocks)
**When**: `extractText(filePath, "text/markdown")` is called
**Then**: Returns plain text with formatting preserved

**Acceptance Criteria**:
- [ ] Markdown syntax (# headers, **, etc.) is preserved or converted to plain text
- [ ] Code blocks are included in output
- [ ] Links are preserved or converted to readable format
- [ ] Newlines and paragraph structure preserved

---

#### Scenario 2.1.3: Extract text from plain text file

**Given**: A TXT file with UTF-8 encoding
**When**: `extractText(filePath, "text/plain")` is called
**Then**: Returns file content as-is

**Acceptance Criteria**:
- [ ] Content matches file exactly
- [ ] UTF-8 characters handled correctly (emoji, accents, etc.)
- [ ] Large files (up to 10MB) read without errors

---

#### Scenario 2.1.4: Chunk text with paragraph boundaries

**Given**: Text with multiple paragraphs of varying lengths
**When**: `chunkText(text, { maxTokens: 500, overlapTokens: 50 })` is called
**Then**: Returns array of chunks with metadata

**Acceptance Criteria**:
- [ ] Each chunk has ≤500 tokens (use `tiktoken` to verify)
- [ ] Adjacent chunks have ~50 tokens of overlap
- [ ] Paragraph boundaries are respected where possible (don't split mid-paragraph unless paragraph exceeds maxTokens)
- [ ] Each chunk has correct `startOffset` and `endOffset`
- [ ] Chunks are ordered correctly (index 0, 1, 2, ...)

**Edge Cases**:
- Single paragraph > 500 tokens → Split mid-paragraph, preserve overlap
- Very short text (<500 tokens) → Single chunk with no overlap
- Text with no paragraphs (one long string) → Split by token count

---

#### Scenario 2.1.5: Generate embeddings via Claude API

**Given**: Array of text chunks
**When**: `generateEmbeddings(chunks)` is called
**Then**: Returns array of embedding vectors

**Acceptance Criteria**:
- [ ] Returns array of same length as input
- [ ] Each embedding is a number array (dimensions match Claude's model)
- [ ] Embeddings are different for different inputs (not all zeros)
- [ ] Similar texts have higher cosine similarity than dissimilar texts

**Mock Strategy**: Mock Claude API for unit tests, use real API for integration tests

**Error Cases**:
- Claude API rate limit (429) → Should retry with exponential backoff, up to 3 attempts
- Claude API error (500) → Should throw `EmbeddingError` with clear message
- Network timeout → Should throw `EmbeddingError` after configured timeout

---

### 2.2 Unit Tests: KnowledgeBaseService

See [Design Doc Section 3.1](../designs/knowledge-base-design.md#31-knowledgebaseservice) for complete interface.

#### Scenario 2.2.1: Upload document - Success path

**Given**: Valid PDF file <10MB, profile has storage available
**When**: `uploadDocument(profileId, file)` is called
**Then**: Document is created and stored in all systems

**Acceptance Criteria**:
- [ ] File saved to filesystem at correct path (see [Design Doc Section 1.3](../designs/knowledge-base-design.md#13-filesystem-organization))
- [ ] MongoDB document created with correct metadata
- [ ] ChromaDB chunks created in correct collection (`profile_{profileId}_kb`)
- [ ] Returned `KnowledgeDocument` has all required fields populated
- [ ] `processingMetadata` contains realistic timing values
- [ ] `chunkCount` matches actual chunks in ChromaDB

**Mock Strategy**:
- Mock filesystem operations (save, read)
- Mock MongoDB (insert, find)
- Mock ChromaDB (addChunks)
- Mock Claude API (generateEmbeddings)

---

#### Scenario 2.2.2: Upload document - Invalid file type

**Given**: File with unsupported MIME type (e.g., "image/png")
**When**: `uploadDocument(profileId, file)` is called
**Then**: Throws `ValidationError`

**Acceptance Criteria**:
- [ ] Error message: "Unsupported file type. Allowed: PDF, Markdown, TXT"
- [ ] No file saved to filesystem
- [ ] No MongoDB document created
- [ ] No ChromaDB chunks created

---

#### Scenario 2.2.3: Upload document - File too large

**Given**: File with size > configured limit (default 10MB)
**When**: `uploadDocument(profileId, file)` is called
**Then**: Throws `ValidationError`

**Acceptance Criteria**:
- [ ] Error message includes configured limit: "File too large. Maximum: 10MB"
- [ ] No file saved to filesystem
- [ ] No database changes

---

#### Scenario 2.2.4: Upload document - Storage limit exceeded

**Given**: Profile already has 95MB of documents, user uploads 10MB file (total would be 105MB > 100MB limit)
**When**: `uploadDocument(profileId, file)` is called
**Then**: Throws `StorageLimitError`

**Acceptance Criteria**:
- [ ] Error message: "Storage limit exceeded. Delete old documents to upload new ones"
- [ ] Calculation includes existing documents (call `getStorageUsed()`)
- [ ] No file saved

**Mock Strategy**: Mock `getStorageUsed()` to return 95MB

---

#### Scenario 2.2.5: Upload document - Processing timeout

**Given**: PDF that takes >60s to process (simulated by slow mock)
**When**: `uploadDocument(profileId, file)` is called
**Then**: Throws `TimeoutError`

**Acceptance Criteria**:
- [ ] Error thrown after configured timeout (60s)
- [ ] Partial operations are rolled back (file, DB record, ChromaDB chunks)
- [ ] Error message: "Processing timeout exceeded. Try a smaller document"

**Mock Strategy**: Make `extractText()` delay >60s using `setTimeout`

---

#### Scenario 2.2.6: Upload document - Rollback on ChromaDB failure

**Given**: File processed successfully, but ChromaDB.addChunks() fails
**When**: `uploadDocument(profileId, file)` is called
**Then**: All changes are rolled back

**Acceptance Criteria**:
- [ ] File saved initially, then deleted during rollback
- [ ] MongoDB document not created (or created then deleted)
- [ ] No ChromaDB chunks remain
- [ ] Original error is re-thrown with context

**Mock Strategy**: Mock ChromaDB.addChunks() to throw error

---

#### Scenario 2.2.7: List documents for profile

**Given**: Profile has 3 uploaded documents
**When**: `listDocuments(profileId)` is called
**Then**: Returns array of 3 documents

**Acceptance Criteria**:
- [ ] Array length = 3
- [ ] Documents sorted by `uploadedAt` descending (newest first)
- [ ] Each document has all metadata fields (filename, size, chunkCount, etc.)
- [ ] No text content or file buffers returned (metadata only)

**Mock Strategy**: Mock MongoDB find query

---

#### Scenario 2.2.8: List documents - Empty profile

**Given**: Profile has no documents
**When**: `listDocuments(profileId)` is called
**Then**: Returns empty array

**Acceptance Criteria**:
- [ ] Returns `[]`, not null or undefined
- [ ] No errors thrown

---

#### Scenario 2.2.9: Delete document - Success

**Given**: Document exists in MongoDB, ChromaDB, and filesystem
**When**: `deleteDocument(documentId)` is called
**Then**: Document removed from all systems

**Acceptance Criteria**:
- [ ] MongoDB document deleted
- [ ] All ChromaDB chunks deleted (chunkCount chunks)
- [ ] Filesystem directory deleted (entire `{documentId}/` folder)
- [ ] No error thrown

**Mock Strategy**:
- Mock MongoDB delete
- Mock ChromaDB deleteChunks
- Mock filesystem rm

---

#### Scenario 2.2.10: Delete document - Not found

**Given**: Document ID does not exist in MongoDB
**When**: `deleteDocument(documentId)` is called
**Then**: Throws `NotFoundError`

**Acceptance Criteria**:
- [ ] Error message: "Document not found"
- [ ] No ChromaDB or filesystem operations attempted

---

#### Scenario 2.2.11: Delete document - Partial failure (ChromaDB fails)

**Given**: Document exists, but ChromaDB.deleteChunks() fails
**When**: `deleteDocument(documentId)` is called
**Then**: MongoDB and filesystem still deleted, error logged

**Acceptance Criteria**:
- [ ] MongoDB document deleted
- [ ] Filesystem deleted
- [ ] Error logged (console or logging system)
- [ ] No exception thrown to caller (best-effort cleanup)

**Mock Strategy**: Mock ChromaDB.deleteChunks() to throw error

---

#### Scenario 2.2.12: Query knowledge base - Success

**Given**: Profile has documents with embedded chunks
**When**: `queryKnowledgeBase(profileId, "machine learning", topK: 5)` is called
**Then**: Returns 5 most relevant chunks

**Acceptance Criteria**:
- [ ] Returns array of length 5 (or fewer if <5 chunks exist)
- [ ] Each result has `chunkId`, `documentId`, `filename`, `chunkIndex`, `content`, `similarity`
- [ ] Results sorted by `similarity` descending (best match first)
- [ ] Similarity scores are between 0 and 1

**Mock Strategy**:
- Mock Claude API for query embedding
- Mock ChromaDB query to return test chunks

---

#### Scenario 2.2.13: Query knowledge base - Empty result

**Given**: Profile has no documents
**When**: `queryKnowledgeBase(profileId, "anything")` is called
**Then**: Returns empty array

**Acceptance Criteria**:
- [ ] Returns `[]`, not null
- [ ] No errors thrown

---

#### Scenario 2.2.14: Query knowledge base - ChromaDB failure

**Given**: ChromaDB is down or unreachable
**When**: `queryKnowledgeBase(profileId, "query")` is called
**Then**: Returns empty array (graceful degradation)

**Acceptance Criteria**:
- [ ] Returns `[]` instead of throwing error
- [ ] Error logged for observability
- [ ] Response generation can continue without KB context

**Mock Strategy**: Mock ChromaDB to throw connection error

---

### 2.3 Integration Tests: MongoDB + ChromaDB + Filesystem

#### Scenario 2.3.1: End-to-end upload workflow

**Given**: Real test MongoDB, ChromaDB, and filesystem
**When**: Upload a real test PDF
**Then**: Document fully processed and queryable

**Acceptance Criteria**:
- [ ] File exists at expected filesystem path
- [ ] MongoDB document exists with correct metadata
- [ ] ChromaDB collection contains correct number of chunks
- [ ] Query returns relevant chunks from the document
- [ ] All operations complete within timeout (60s)

**Setup**:
- Use test MongoDB database (different from production)
- Use test ChromaDB collection
- Use temp filesystem directory
- Use test PDF file (fixture in `tests/fixtures/`)

**Teardown**: Delete all created data

---

#### Scenario 2.3.2: End-to-end delete workflow

**Given**: Uploaded document exists
**When**: Delete the document
**Then**: All traces removed from all systems

**Acceptance Criteria**:
- [ ] MongoDB query returns null
- [ ] ChromaDB query returns no chunks with matching documentId
- [ ] Filesystem path no longer exists

---

#### Scenario 2.3.3: Concurrent uploads to same profile

**Given**: Two uploads initiated simultaneously for same profile
**When**: Both uploads complete
**Then**: Both documents exist independently

**Acceptance Criteria**:
- [ ] MongoDB contains 2 documents
- [ ] Each document has unique ID
- [ ] Filesystem has 2 separate directories
- [ ] No race conditions or corruption

**Test Strategy**: Use `Promise.all()` to run uploads concurrently

---

#### Scenario 2.3.4: Storage limit enforcement across uploads

**Given**: Profile has 95MB of documents
**When**: Upload 6MB document (would succeed), then upload another 10MB (would exceed)
**Then**: First succeeds, second fails

**Acceptance Criteria**:
- [ ] First upload completes successfully
- [ ] Second upload throws `StorageLimitError`
- [ ] `getStorageUsed()` returns 95MB + 6MB = 101MB after first upload

---

### 2.4 E2E Tests: REST API

See [Design Doc Section 2](../designs/knowledge-base-design.md#2-api-contracts) for API overview. Complete API schemas in `docs/api/openapi.yaml`.

#### Scenario 2.4.1: POST /api/knowledge - Success

**Given**: Valid multipart form with PDF file
**When**: POST to /api/knowledge with profileId
**Then**: Returns 201 Created with document metadata

**Acceptance Criteria**:
- [ ] Status code: 201
- [ ] Response body matches `KnowledgeDocument` schema (see [Design Doc 1.1](../designs/knowledge-base-design.md#11-knowledgedocument-mongodb))
- [ ] Response includes `processingMetadata` with timing information
- [ ] `Content-Type: application/json`

**Request**:
```
POST /api/knowledge
Content-Type: multipart/form-data

profileId: {uuid}
file: {pdf buffer}
```

---

#### Scenario 2.4.2: POST /api/knowledge - Invalid file type

**Given**: Multipart form with PNG image
**When**: POST to /api/knowledge
**Then**: Returns 400 Bad Request

**Acceptance Criteria**:
- [ ] Status code: 400
- [ ] Error message: "Unsupported file type. Allowed: PDF, Markdown, TXT"
- [ ] Response format matches error schema (see OpenAPI spec)

---

#### Scenario 2.4.3: POST /api/knowledge - File too large

**Given**: Multipart form with 15MB file (exceeds 10MB limit)
**When**: POST to /api/knowledge
**Then**: Returns 413 Payload Too Large

**Acceptance Criteria**:
- [ ] Status code: 413
- [ ] Error message includes limit

---

#### Scenario 2.4.4: POST /api/knowledge - Storage limit exceeded

**Given**: Profile already at storage limit
**When**: POST to /api/knowledge
**Then**: Returns 409 Conflict

**Acceptance Criteria**:
- [ ] Status code: 409
- [ ] Error message: "Storage limit exceeded..."

---

#### Scenario 2.4.5: POST /api/knowledge - Processing timeout

**Given**: Very complex PDF (simulated by injecting delay)
**When**: POST to /api/knowledge
**Then**: Returns 504 Gateway Timeout

**Acceptance Criteria**:
- [ ] Status code: 504
- [ ] Error message: "Processing timeout exceeded..."
- [ ] Response received within ~60s

---

#### Scenario 2.4.6: GET /api/knowledge?profileId={id} - Success

**Given**: Profile has 2 uploaded documents
**When**: GET /api/knowledge?profileId={id}
**Then**: Returns 200 OK with array of 2 documents

**Acceptance Criteria**:
- [ ] Status code: 200
- [ ] Response is array of length 2
- [ ] Each item matches `KnowledgeDocument` schema
- [ ] Sorted by uploadedAt descending

---

#### Scenario 2.4.7: GET /api/knowledge - Missing profileId

**Given**: No query parameter
**When**: GET /api/knowledge
**Then**: Returns 400 Bad Request

**Acceptance Criteria**:
- [ ] Status code: 400
- [ ] Error message: "profileId is required"

---

#### Scenario 2.4.8: DELETE /api/knowledge/:id - Success

**Given**: Document exists
**When**: DELETE /api/knowledge/:id
**Then**: Returns 204 No Content

**Acceptance Criteria**:
- [ ] Status code: 204
- [ ] No response body
- [ ] Subsequent GET returns 404

---

#### Scenario 2.4.9: DELETE /api/knowledge/:id - Not found

**Given**: Document does not exist
**When**: DELETE /api/knowledge/:id
**Then**: Returns 404 Not Found

**Acceptance Criteria**:
- [ ] Status code: 404
- [ ] Error message: "Document not found"

---

## 3. Edge Cases & Error Paths

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| **Empty PDF** | Reject with 422: "Document contains no text content" | High |
| **Single paragraph document** | Accept, create 1 chunk, process normally | High |
| **Password-protected PDF** | Reject with 422: "Failed to extract text... password-protected" | Medium |
| **Corrupt PDF** | Reject with 422: "File may be corrupt" | Medium |
| **Very long single paragraph** | Split mid-paragraph, preserve overlap | High |
| **Markdown with code blocks** | Include code in chunks, preserve formatting | Medium |
| **Non-UTF8 text file** | Best effort (may have garbled characters), don't fail | Low |
| **Duplicate filename** | Allow (different document IDs), no conflict | Low |
| **Concurrent delete + query** | Query may return stale chunks (acceptable) | Low |
| **ChromaDB down during upload** | Fail upload, rollback all changes | High |
| **ChromaDB down during query** | Return empty array, log error (graceful) | High |
| **Disk space exhausted** | Fail upload with 500, clear error message | Medium |
| **Claude API rate limit** | Retry up to 3 times, then fail with clear message | High |
| **MongoDB transaction failure** | Rollback, re-throw error | High |
| **Delete during concurrent upload** | Separate documents (different IDs), no conflict | Low |

---

## 4. Data Fixtures

### Test Documents

```typescript
/**
 * Sample PDF for testing (create in tests/fixtures/)
 * - Size: ~1MB
 * - Pages: 5
 * - Content: Mix of paragraphs, lists, formatted text
 */
const TEST_PDF_PATH = "tests/fixtures/sample-document.pdf";

/**
 * Sample Markdown for testing
 */
const TEST_MARKDOWN = `
# Knowledge Base Testing

This is a test document for **knowledge base** functionality.

## Section 1
Paragraph with content...

## Section 2
- List item 1
- List item 2

\`\`\`javascript
const code = "example";
\`\`\`
`;

/**
 * Sample plain text
 */
const TEST_TXT = "This is a simple text file.\n\nWith multiple paragraphs.\n\nFor testing.";
```

### Test Entities

```typescript
const testProfile = {
  id: "test-profile-123",
  name: "Test User",
  // ... other profile fields
};

const validUploadFile = {
  buffer: Buffer.from(PDF_CONTENT),
  filename: "test-document.pdf",
  mimeType: "application/pdf",
};

const invalidUploadFile = {
  buffer: Buffer.from(IMAGE_CONTENT),
  filename: "test-image.png",
  mimeType: "image/png",
};

const largeUploadFile = {
  buffer: Buffer.alloc(11 * 1024 * 1024), // 11MB
  filename: "large-document.pdf",
  mimeType: "application/pdf",
};
```

**Full Schema**: See [Design Doc Section 1](../designs/knowledge-base-design.md#1-data-models)

---

## 5. Integration Dependencies

### External APIs
- **Claude API**: Mock using MSW (Mock Service Worker) for unit/integration tests, use real API for E2E tests with test API key
  - Mock responses: Embedding vectors, rate limit errors (429), server errors (500)
- **ChromaDB**: Use test collection for integration tests, clean up after each test
  - Collection name: `test_profile_{uuid}_kb`
- **MongoDB**: Use test database (`ngaj_test`), drop collection after each test

### Database
- **Collections**: `knowledge_documents` (MongoDB), `profile_{profileId}_kb` (ChromaDB)
- **Setup**: Run setup script to create test profile, initialize ChromaDB
- **Teardown**: Clean up all test data (MongoDB, ChromaDB, filesystem)

### Filesystem
- **Test Directory**: Use `tests/tmp/knowledge/` (git-ignored)
- **Setup**: Create directory before tests
- **Teardown**: Delete directory recursively after tests

---

## 6. Mock/Stub Guidance

### Unit Tests - Mock Everything
```typescript
// Mock DocumentProcessor
const mockProcessor = {
  extractText: vi.fn().mockResolvedValue("Extracted text..."),
  chunkText: vi.fn().mockResolvedValue([{ text: "Chunk 1", startOffset: 0, endOffset: 100 }]),
  generateEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3, ...]]),
};

// Mock ChromaDBClient
const mockChromaClient = {
  getOrCreateCollection: vi.fn().mockResolvedValue(mockCollection),
  addChunks: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue([{ id: "chunk_0", distance: 0.8, ... }]),
  deleteChunks: vi.fn().mockResolvedValue(undefined),
};

// Mock MongoDB Repository
const mockKnowledgeRepo = {
  create: vi.fn().mockResolvedValue(mockDocument),
  find: vi.fn().mockResolvedValue([mockDocument]),
  delete: vi.fn().mockResolvedValue(undefined),
};
```

### Integration Tests - Real Databases, Mock External APIs
```typescript
// Real MongoDB (test database)
const mongoClient = await MongoClient.connect(TEST_MONGO_URL);
const db = mongoClient.db("ngaj_test");

// Real ChromaDB (test collection)
const chromaClient = new ChromaClient({ path: TEST_CHROMA_URL });

// Mock Claude API using MSW
server.use(
  http.post("https://api.anthropic.com/v1/embeddings", () => {
    return HttpResponse.json({
      embeddings: [[0.1, 0.2, ...]], // Mock embedding
    });
  })
);
```

### E2E Tests - Real Everything (Test Environment)
```typescript
// Real MongoDB, ChromaDB, Claude API (test keys)
// Real filesystem (test directory)
// Real HTTP server (start before tests, stop after)
```

---

## 7. Test Priorities

### Critical Path (Must Pass Before Implementation Complete)
1. **Upload success path** - Core functionality works
2. **Extraction for all file types** - PDF, MD, TXT processed correctly
3. **Chunking with boundaries** - Semantic chunks created properly
4. **Storage in all systems** - MongoDB, ChromaDB, filesystem atomic
5. **Query returns results** - Semantic search works
6. **Delete removes all data** - Cleanup is complete
7. **Rollback on error** - Atomic operations, no orphaned data
8. **File validation** - Type and size limits enforced

### Important (Should Pass)
9. **Storage limit enforcement** - Prevents over-allocation
10. **Error handling** - All error cases return correct status codes
11. **Edge cases** - Empty docs, single paragraph, corrupt files
12. **Concurrent uploads** - No race conditions

### Nice to Have (May Defer)
13. **Performance benchmarks** - Processing time within limits
14. **Large document handling** - 10MB PDFs process successfully
15. **Non-English text** - Multilingual support works

---

## 8. Performance Acceptance Criteria

| Operation | Target | Maximum |
|-----------|--------|---------|
| **Upload 1MB PDF** | <10s | <30s |
| **Upload 10MB PDF** | <30s | <60s |
| **Extract text (1MB PDF)** | <3s | <10s |
| **Chunk text (50k chars)** | <1s | <3s |
| **Generate embeddings (100 chunks)** | <5s | <15s (depends on Claude API) |
| **Query knowledge base** | <100ms | <500ms |
| **Delete document** | <1s | <3s |

**Note**: Times are indicative, may vary based on hardware and network conditions. Primarily test for correctness in v0.1, optimize in v0.2 if needed.

---

## 9. Definition of Done

A test suite is complete when:
- [ ] All critical path scenarios covered (8 tests)
- [ ] All error cases tested (4xx, 5xx status codes)
- [ ] All edge cases from Design Doc Section 4.3 tested
- [ ] Integration tests verify MongoDB + ChromaDB + Filesystem atomicity
- [ ] E2E tests verify REST API contracts (match OpenAPI spec)
- [ ] Rollback scenarios tested (ChromaDB failure, timeout, etc.)
- [ ] Mock/real database separation clear in test organization
- [ ] Tests fail before implementation (Red phase verified)
- [ ] Test coverage >80% for KnowledgeBaseService and DocumentProcessor
- [ ] All tests pass with real test environment (MongoDB, ChromaDB, Claude API)

---

## 10. References

- **Why these decisions**: [ADR-007: Knowledge Base Implementation](../../../docs/architecture/decisions/007-knowledge-base-implementation.md)
- **Complete technical specs**: [Design Document](../designs/knowledge-base-design.md)
- **API schemas**: See [Design Doc Section 2](../designs/knowledge-base-design.md#2-api-contracts) for overview, `docs/api/openapi.yaml` for complete REST API specs
- **Data models**: [Design Doc Section 1](../designs/knowledge-base-design.md#1-data-models)
- **Service interfaces**: [Design Doc Section 3](../designs/knowledge-base-design.md#3-service-architecture)
- **Error handling**: [Design Doc Section 4.2](../designs/knowledge-base-design.md#42-error-handling-strategy)

