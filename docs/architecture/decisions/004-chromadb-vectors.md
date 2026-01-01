# ADR-004: Use ChromaDB for Vector Embeddings Storage

## Status

**Accepted** - December 27, 2025

## Context

ngaj needs vector storage for knowledge base document embeddings to enable semantic search and retrieve relevant context for AI-generated responses. Requirements: local-first deployment, metadata filtering, simple Node.js integration, scale of ~5k-25k document chunks.

## Decision

Use **ChromaDB** as the vector database for storing and querying knowledge embeddings.

## Rationale

**Why ChromaDB:**
- **Lightweight & Local-First**: Small Docker container, easy local deployment
- **Simple Integration**: HTTP API works seamlessly with Node.js/TypeScript stack
- **Purpose-Built for AI**: Designed specifically for embedding storage and similarity search
- **Good Performance**: Handles expected scale (<100k vectors) efficiently
- **Metadata Filtering**: Built-in support for filtering by category, tags, account
- **Active Community**: Well-documented, popular in AI space

**Alternatives Considered:**
- **PostgreSQL + pgvector**: More setup complexity, SQL schema management, overkill for use case
- **Pinecone**: Cloud-only (violates local-first principle), ongoing cost
- **Weaviate**: Heavier than needed, GraphQL adds unnecessary complexity
- **Faiss**: Library not database, requires custom persistence layer

## Consequences

### Positive
- Fast development with simple API
- Easy Docker deployment (`docker-compose up`)
- Privacy preserved (all data local)
- Low resource usage
- Scales to future versions (v0.2-v0.4)

### Negative
- Python-based (not TypeScript) → Mitigated by using HTTP API via Docker
- HTTP latency vs in-process → Acceptable (<1ms locally, not the bottleneck)
- Less mature than PostgreSQL → Acceptable for v0.1 scope

## Implementation

**Collection Structure:** One per profile (`profile_{profileId}_kb`)  
**Document Chunking:** ~500 tokens, 50-token overlap, respecting paragraph boundaries  
**Embeddings:** Claude API (consistent with LLM choice)  
**Persistence:** Docker volume mount for `/chroma/chroma`

**Expected Performance:**
- v0.1: 500 chunks, <50ms query time
- Future: Up to 25k chunks, still performant

## Migration Path

If ChromaDB doesn't meet needs: Export to JSON → Import to pgvector or Weaviate. MongoDB tracks embedded documents for regeneration if needed.

## References

- [ChromaDB Docs](https://docs.trychroma.com/)
- [ADR-001: MongoDB Storage](./001-mongodb-storage.md)
- [ADR-003: TypeScript Stack](./003-typescript-stack.md)