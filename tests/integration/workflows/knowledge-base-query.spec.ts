import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { KnowledgeBaseService } from '@/backend/services/knowledge-base-service';
import {
  createMockDocument,
  createMockEmbedding,
  createMockQueryResults
} from '../../fixtures/knowledge-base-fixtures';

describe('Knowledge Base Query Workflow (Integration)', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let service: KnowledgeBaseService;
  let mockDocumentProcessor: Record<string, ReturnType<typeof vi.fn>>;
  let mockChromaClient: Record<string, ReturnType<typeof vi.fn>>;
  const testProfileId = 'profile-query-test';

  beforeEach(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db('ngaj-test');

    // Mock DocumentProcessor
    mockDocumentProcessor = {
      extractText: vi.fn(),
      chunkText: vi.fn(),
      generateEmbeddings: vi.fn()
    };

    // Mock ChromaDBClient
    mockChromaClient = {
      getOrCreateCollection: vi.fn(),
      addChunks: vi.fn(),
      query: vi.fn(),
      deleteChunks: vi.fn()
    };

    service = new KnowledgeBaseService(
      { collection: (name: string) => db.collection(name) },
      mockDocumentProcessor,
      mockChromaClient,
      {} // fs operations not needed for query tests
    );
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoServer.stop();
    vi.clearAllMocks();
  });

  it('should return relevant chunks based on semantic similarity', async () => {
    // Arrange
    const query = 'machine learning algorithms';
    const mockDoc = createMockDocument({
      profileId: testProfileId,
      filename: 'ml-guide.pdf'
    });
    
    // Insert document into MongoDB
    await db.collection('knowledge_documents').insertOne(mockDoc);

    const queryEmbedding = createMockEmbedding();
    const mockChromaResults = [
      {
        id: `${mockDoc.id}_chunk_0`,
        document: 'Machine learning algorithms are computational methods...',
        metadata: {
          documentId: mockDoc.id,
          profileId: testProfileId,
          filename: mockDoc.filename,
          chunkIndex: 0
        },
        distance: 0.12
      },
      {
        id: `${mockDoc.id}_chunk_3`,
        document: 'Deep learning is a subset of machine learning...',
        metadata: {
          documentId: mockDoc.id,
          profileId: testProfileId,
          filename: mockDoc.filename,
          chunkIndex: 3
        },
        distance: 0.25
      }
    ];

    mockDocumentProcessor.generateEmbeddings.mockResolvedValue([queryEmbedding]);
    mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
    mockChromaClient.query.mockResolvedValue(mockChromaResults);

    // Act
    const results = await service.queryKnowledgeBase(testProfileId, query, 5);

    // Assert
    expect(results.length).toBe(2);
    expect(results[0].chunkId).toBe(`${mockDoc.id}_chunk_0`);
    expect(results[0].filename).toBe(mockDoc.filename);
    expect(results[0].content).toContain('Machine learning');
    expect(results[0].similarity).toBeGreaterThan(0);
  });

  it('should filter results by profileId (multi-profile isolation)', async () => {
    // Arrange
    const profile1Id = 'profile-1';
    const profile2Id = 'profile-2';
    const query = 'test query';

    // Insert documents for both profiles
    await db.collection('knowledge_documents').insertMany([
      createMockDocument({ id: 'doc-1', profileId: profile1Id, filename: 'doc1.pdf' }),
      createMockDocument({ id: 'doc-2', profileId: profile2Id, filename: 'doc2.pdf' })
    ]);

    const queryEmbedding = createMockEmbedding();
    const mockResults = [
      {
        id: 'doc-1_chunk_0',
        document: 'Content from profile 1',
        metadata: {
          documentId: 'doc-1',
          profileId: profile1Id,
          filename: 'doc1.pdf',
          chunkIndex: 0
        },
        distance: 0.15
      }
    ];

    mockDocumentProcessor.generateEmbeddings.mockResolvedValue([queryEmbedding]);
    mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
    mockChromaClient.query.mockResolvedValue(mockResults);

    // Act
    const results = await service.queryKnowledgeBase(profile1Id, query, 5);

    // Assert
    // Collection is already scoped to profile, so no filter needed
    expect(mockChromaClient.query).toHaveBeenCalledWith(
      expect.anything(),
      queryEmbedding,
      5,
      undefined
    );
    
    // Results should only include profile1's documents
    expect(results.every(r => r.documentId === 'doc-1')).toBe(true);
  });

  it('should return empty array when knowledge base is empty', async () => {
    // Arrange
    const query = 'test query';
    const queryEmbedding = createMockEmbedding();

    mockDocumentProcessor.generateEmbeddings.mockResolvedValue([queryEmbedding]);
    mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
    mockChromaClient.query.mockResolvedValue([]);

    // Act
    const results = await service.queryKnowledgeBase(testProfileId, query);

    // Assert
    expect(results).toEqual([]);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should respect topK parameter', async () => {
    // Arrange
    const query = 'test query';
    const customTopK = 3;
    const queryEmbedding = createMockEmbedding();
    const mockResults = createMockQueryResults('doc-123', 'test.pdf').slice(0, customTopK);

    mockDocumentProcessor.generateEmbeddings.mockResolvedValue([queryEmbedding]);
    mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
    mockChromaClient.query.mockResolvedValue(
      mockResults.map(r => ({
        id: r.chunkId,
        document: r.content,
        metadata: {
          documentId: r.documentId,
          profileId: testProfileId,
          filename: r.filename,
          chunkIndex: r.chunkIndex
        },
        distance: 1 - r.similarity
      }))
    );

    // Act
    const results = await service.queryKnowledgeBase(testProfileId, query, customTopK);

    // Assert
    expect(mockChromaClient.query).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.stringContaining('test-collection') }),
      queryEmbedding,
      customTopK,
      undefined
    );
    expect(results.length).toBeLessThanOrEqual(customTopK);
  });

  it('should handle ChromaDB query errors gracefully', async () => {
    // Arrange
    const query = 'test query';
    const queryEmbedding = createMockEmbedding();

    mockDocumentProcessor.generateEmbeddings.mockResolvedValue([queryEmbedding]);
    mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
    mockChromaClient.query.mockRejectedValue(new Error('ChromaDB connection failed'));

    // Act
    // Should gracefully return empty results (graceful degradation per design)
    const results = await service.queryKnowledgeBase(testProfileId, query);

    // Assert
    expect(results).toEqual([]); // Graceful degradation
  });

  it('should convert ChromaDB distance to similarity score', async () => {
    // Arrange
    const query = 'test query';
    const queryEmbedding = createMockEmbedding();
    const mockChromaResults = [
      {
        id: 'doc-1_chunk_0',
        document: 'Test content',
        metadata: {
          documentId: 'doc-1',
          profileId: testProfileId,
          filename: 'test.pdf',
          chunkIndex: 0
        },
        distance: 0.20 // Lower distance = higher similarity
      }
    ];

    mockDocumentProcessor.generateEmbeddings.mockResolvedValue([queryEmbedding]);
    mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
    mockChromaClient.query.mockResolvedValue(mockChromaResults);

    // Act
    const results = await service.queryKnowledgeBase(testProfileId, query);

    // Assert
    expect(results[0].similarity).toBeDefined();
    // Similarity should be inverse of distance (1 - distance for cosine)
    expect(results[0].similarity).toBeCloseTo(1 - 0.20, 2);
  });
});

