# Knowledge Base - Test Plan

**Handoff Number**: 002

**Design References**:
- [Knowledge Base Design Document](../../designer/designs/knowledge-base-design.md)
- [ADR-007: Knowledge Base Implementation Strategy](../../../docs/architecture/decisions/007-knowledge-base-implementation.md)

---

## Test Coverage Summary

This test plan covers the Knowledge Base feature which enables users to upload reference materials (PDFs, Markdown, TXT files) that ground AI-generated responses in their personal expertise.

**Total Tests**: ~45 tests
- **Unit Tests**: ~30 tests (services, processors, clients)
- **Integration Tests**: ~15 tests (workflows, database operations)
- **E2E Tests**: 0 (deferred to post-implementation)

**Coverage Goals**:
- **Critical Path**: Upload → Extract → Chunk → Embed → Store (synchronous flow)
- **Edge Cases**: Invalid files, timeouts, storage limits, corrupt PDFs, empty documents
- **Error Handling**: Validation errors, processing errors, rollback scenarios
- **Business Logic**: Storage limits, file type validation, cron expression validation

---

## Test Categories

### 1. Unit Tests - KnowledgeBaseService (`tests/unit/services/knowledge-base-service.spec.ts`)

**Scenarios Covered**:
- ✅ `uploadDocument()` - Success path with valid PDF
- ✅ `uploadDocument()` - Success path with Markdown
- ✅ `uploadDocument()` - Success path with TXT
- ✅ `uploadDocument()` - ValidationError: Invalid file type
- ✅ `uploadDocument()` - ValidationError: File too large
- ✅ `uploadDocument()` - ValidationError: Missing profileId
- ✅ `uploadDocument()` - StorageLimitError: Total storage exceeded
- ✅ `uploadDocument()` - ProcessingError: Text extraction failed
- ✅ `uploadDocument()` - EmbeddingError: Claude API failure
- ✅ `uploadDocument()` - TimeoutError: Processing timeout
- ✅ `uploadDocument()` - Rollback: Cleanup on failure (filesystem + ChromaDB + MongoDB)
- ✅ `listDocuments()` - Returns documents for profileId
- ✅ `listDocuments()` - Returns empty array when no documents
- ✅ `listDocuments()` - Sorts by uploadedAt descending
- ✅ `listDocuments()` - ValidationError: Invalid profileId format
- ✅ `deleteDocument()` - Success: Hard delete from all systems
- ✅ `deleteDocument()` - NotFoundError: Document does not exist
- ✅ `deleteDocument()` - Best-effort cleanup: Logs ChromaDB error but succeeds
- ✅ `queryKnowledgeBase()` - Returns top K chunks
- ✅ `queryKnowledgeBase()` - Returns empty array when collection empty
- ✅ `queryKnowledgeBase()` - Respects custom topK parameter
- ✅ `queryKnowledgeBase()` - Returns chunks with similarity scores
- ✅ `getStorageUsed()` - Returns total bytes for profile
- ✅ `getStorageUsed()` - Returns 0 when no documents

**Total**: 24 tests

---

### 2. Unit Tests - DocumentProcessor (`tests/unit/processors/document-processor.spec.ts`)

**Scenarios Covered**:
- ✅ `extractText()` - Extract from PDF file
- ✅ `extractText()` - Extract from Markdown file
- ✅ `extractText()` - Extract from TXT file
- ✅ `extractText()` - ExtractionError: Corrupt PDF
- ✅ `extractText()` - ExtractionError: Password-protected PDF
- ✅ `extractText()` - ExtractionError: File not found
- ✅ `chunkText()` - Respects paragraph boundaries
- ✅ `chunkText()` - Handles single paragraph document
- ✅ `chunkText()` - Splits long paragraph at token limit
- ✅ `chunkText()` - Creates overlap between chunks
- ✅ `chunkText()` - Returns empty array for empty text
- ✅ `chunkText()` - Includes startOffset and endOffset metadata
- ✅ `generateEmbeddings()` - Returns embeddings for chunks
- ✅ `generateEmbeddings()` - Handles batch of chunks
- ✅ `generateEmbeddings()` - EmbeddingError: Claude API rate limit
- ✅ `generateEmbeddings()` - Retry with exponential backoff

**Total**: 16 tests

---

### 3. Unit Tests - ChromaDBClient (`tests/unit/clients/chromadb-client.spec.ts`)

**Scenarios Covered**:
- ✅ `getOrCreateCollection()` - Gets existing collection
- ✅ `getOrCreateCollection()` - Creates new collection if not exists
- ✅ `getOrCreateCollection()` - Uses correct collection naming (profile_{id}_kb)
- ✅ `addChunks()` - Adds chunks with embeddings and metadata
- ✅ `addChunks()` - Handles empty chunks array
- ✅ `query()` - Returns top K results by similarity
- ✅ `query()` - Filters by metadata
- ✅ `query()` - Returns empty array when no matches
- ✅ `deleteChunks()` - Deletes chunks by IDs
- ✅ `deleteChunks()` - Handles non-existent chunk IDs gracefully

**Total**: 10 tests

---

### 4. Integration Tests - Upload Workflow (`tests/integration/workflows/knowledge-base-upload.spec.ts`)

**Scenarios Covered**:
- ✅ End-to-end upload: PDF → MongoDB + ChromaDB + Filesystem
- ✅ Atomic rollback: Cleanup on embedding failure
- ✅ Atomic rollback: Cleanup on ChromaDB failure
- ✅ Atomic rollback: Cleanup on MongoDB failure
- ✅ Storage limit enforcement across uploads
- ✅ Processing metadata tracking (timings)
- ✅ Concurrent uploads to same profile (isolation)

**Total**: 7 tests

---

### 5. Integration Tests - Query Workflow (`tests/integration/workflows/knowledge-base-query.spec.ts`)

**Scenarios Covered**:
- ✅ Semantic search returns relevant chunks
- ✅ Query filters by profileId (multi-profile isolation)
- ✅ Query handles empty knowledge base gracefully
- ✅ Query respects topK parameter

**Total**: 4 tests

---

### 6. Integration Tests - Delete Workflow (`tests/integration/workflows/knowledge-base-delete.spec.ts`)

**Scenarios Covered**:
- ✅ Hard delete removes from MongoDB, ChromaDB, and filesystem
- ✅ Delete non-existent document returns NotFoundError
- ✅ Delete logs error but succeeds if ChromaDB fails
- ✅ Multiple documents: Delete one, others remain intact

**Total**: 4 tests

---

## Mock Strategy

### External Dependencies to Mock

1. **Filesystem (`fs/promises`)**:
   - Mock: `writeFile`, `readFile`, `mkdir`, `rm`, `stat`
   - Reason: Fast tests, no disk I/O, predictable state

2. **pdf-parse**:
   - Mock: PDF extraction to return controlled text
   - Reason: No need for real PDF files in unit tests, faster execution

3. **Claude API (Embeddings)**:
   - Mock: HTTP client responses for embedding generation
   - Reason: No API calls, no rate limits, predictable embeddings

4. **ChromaDB HTTP Client**:
   - Mock: Collection operations and queries
   - Reason: No ChromaDB dependency for unit tests

5. **MongoDB Collections**:
   - Mock: Collection methods (`insertOne`, `findOne`, `find`, `deleteOne`)
   - Reason: Isolated tests, no database setup required

### Real Dependencies (Integration Tests)

1. **In-Memory MongoDB**: Use MongoMemoryServer for integration tests
2. **Mock ChromaDB**: Continue mocking ChromaDB (no in-memory alternative)
3. **Real Filesystem**: Use temp directory (`os.tmpdir()`) for integration tests

---

## Test Data Strategy

### Fixtures (`tests/fixtures/knowledge-base-fixtures.ts`)

**Factory Functions**:
- `createMockDocument()` - Valid KnowledgeDocument
- `createMockFileUpload()` - Valid FileUpload (buffer, filename, mimeType)
- `createMockTextChunk()` - TextChunk with offsets
- `createMockQueryResult()` - KnowledgeQueryResult with similarity score
- `createInvalidUploads()` - Invalid file uploads for validation tests
- `createMockProcessingMetadata()` - Processing timing metadata

**Pre-configured Fixtures**:
- `pdfFile` - Mock PDF file upload
- `markdownFile` - Mock Markdown file upload
- `txtFile` - Mock TXT file upload
- `oversizedFile` - File exceeding size limit
- `invalidMimeType` - Unsupported file type
- `corruptPdf` - PDF that fails extraction
- `emptyDocument` - Document with zero characters

---

## Test Organization

```
tests/
├── unit/
│   ├── services/
│   │   └── knowledge-base-service.spec.ts  (24 tests)
│   ├── processors/
│   │   └── document-processor.spec.ts      (16 tests)
│   └── clients/
│       └── chromadb-client.spec.ts         (10 tests)
├── integration/
│   └── workflows/
│       ├── knowledge-base-upload.spec.ts   (7 tests)
│       ├── knowledge-base-query.spec.ts    (4 tests)
│       └── knowledge-base-delete.spec.ts   (4 tests)
└── fixtures/
    └── knowledge-base-fixtures.ts
```

---

## Known Limitations

1. **No E2E Tests**: REST API endpoints not tested (deferred to post-implementation when API routes exist)
2. **No Real ChromaDB**: Integration tests mock ChromaDB (no in-memory option available)
3. **No Real PDFs**: Unit tests use mocked text extraction (sufficient for v0.1)
4. **No Timeout Tests**: Timeout simulation deferred (requires complex timer mocking)
5. **No Performance Tests**: Processing time assertions deferred (need real data for benchmarks)

---

## Test Priorities

**Critical Path (Must Pass)**:
1. ✅ `uploadDocument()` - Success with valid PDF/MD/TXT
2. ✅ Upload workflow integration - End-to-end with real database
3. ✅ `queryKnowledgeBase()` - Returns relevant chunks
4. ✅ `deleteDocument()` - Hard delete from all systems
5. ✅ Rollback on upload failure - Atomic cleanup

**Edge Cases (Important)**:
6. ✅ Invalid file type validation
7. ✅ Storage limit enforcement
8. ✅ Empty document handling
9. ✅ Corrupt PDF extraction error
10. ✅ Claude API embedding failure

**Error Handling (Safety)**:
11. ✅ Rollback cleanup on each failure point
12. ✅ Best-effort delete (logs errors, doesn't fail)
13. ✅ ValidationError for invalid inputs

---

## Dependencies Installed

```bash
npm install --save-dev \
  vitest \
  @vitest/coverage-v8 \
  mongodb-memory-server \
  @types/node
```

**Already Installed**:
- `vitest` (from existing project setup)
- `mongodb` (from existing database setup)

**New Dependencies**:
- `mongodb-memory-server` - In-memory MongoDB for integration tests
- `pdf-parse` - PDF text extraction (production dependency)
- `tiktoken` - Token counting for chunking (production dependency)

---

## Implementation Order (for Implementer)

**Recommended Sequence**:

1. **ChromaDBClient** (foundational, no dependencies)
   - Simple HTTP wrapper
   - No business logic
   - Fast to implement

2. **DocumentProcessor** (core processing logic)
   - Text extraction (pdf-parse integration)
   - Chunking algorithm (tiktoken integration)
   - Embedding generation (Claude API integration)

3. **KnowledgeBaseService** (orchestration)
   - Uses ChromaDBClient + DocumentProcessor
   - Handles rollback and error scenarios
   - Enforces business rules (storage limits)

4. **Integration Tests** (validate end-to-end flow)
   - Verify atomic operations
   - Test rollback scenarios
   - Confirm multi-system coordination

---

## Running Tests

**All Tests**:
```bash
npm test
```

**Unit Tests Only**:
```bash
npm test -- tests/unit
```

**Integration Tests Only**:
```bash
npm test -- tests/integration
```

**With Coverage**:
```bash
npm run test:coverage
```

**Watch Mode**:
```bash
npm test -- --watch
```

---

## Expected Red Phase Output

All tests should fail with clear error messages:

```
FAIL tests/unit/services/knowledge-base-service.spec.ts
  KnowledgeBaseService
    uploadDocument()
      ✗ should upload PDF successfully (2 ms)
          Error: Not implemented
      ✗ should validate file type (1 ms)
          Error: Not implemented
    ...

FAIL tests/unit/processors/document-processor.spec.ts
  DocumentProcessor
    extractText()
      ✗ should extract text from PDF (2 ms)
          Error: Not implemented
    ...

FAIL tests/integration/workflows/knowledge-base-upload.spec.ts
  Knowledge Base Upload Workflow
    ✗ should upload document end-to-end (5 ms)
        Error: Cannot find module '@/services/knowledge-base-service'
    ...

Test Suites: 6 failed, 6 total
Tests:       65 failed, 65 total
Time:        1.234 s
```

---

## Success Criteria

- ✅ All 65 tests fail with "Not implemented" errors (Red phase)
- ✅ No TypeScript compilation errors
- ✅ No linter errors in test code
- ✅ All fixtures and mocks defined
- ✅ Implementation stubs created with correct signatures
- ✅ Test plan document complete
- ✅ Handoff document ready for Implementer

---

## Cross-References

- **Design Document**: [knowledge-base-design.md](../../designer/designs/knowledge-base-design.md)
- **ADR**: [007-knowledge-base-implementation.md](../../../docs/architecture/decisions/007-knowledge-base-implementation.md)
- **Type Definitions**: [src/shared/types/knowledge-base.ts](../../../src/shared/types/knowledge-base.ts)
- **Tech Stack**: [docs/tech-stack.md](../../../docs/tech-stack.md)
- **Handoff Document**: [002-knowledge-base-handoff.md](../002-knowledge-base-handoff.md) _(to be created)_

