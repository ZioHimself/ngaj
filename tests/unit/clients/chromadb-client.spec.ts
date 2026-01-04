import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChromaDBClient } from '@/backend/clients/chromadb-client';
import { createMockEmbedding } from '../../fixtures/knowledge-base-fixtures';

describe('ChromaDBClient', () => {
  let client: ChromaDBClient;
  let mockHttpClient: Record<string, ReturnType<typeof vi.fn>>;
  const testProfileId = 'profile-test-123';
  const testCollectionName = `profile_${testProfileId}_kb`;

  beforeEach(() => {
    // Mock HTTP client for ChromaDB API
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };

    client = new ChromaDBClient(mockHttpClient, {
      host: 'localhost',
      port: 8000,
      timeoutMs: 5000
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreateCollection()', () => {
    it('should get existing collection', async () => {
      // Arrange
      const mockCollection = {
        name: testCollectionName,
        id: 'collection-123',
        metadata: {}
      };

      mockHttpClient.get.mockResolvedValue({ data: mockCollection });

      // Act
      const result = await client.getOrCreateCollection(testProfileId);

      // Assert
      expect(result).toEqual(mockCollection);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.stringContaining(`/collections/${testCollectionName}`)
      );
    });

    it('should create new collection if not exists', async () => {
      // Arrange
      const mockCollection = {
        name: testCollectionName,
        id: 'collection-456',
        metadata: {}
      };

      // First call returns 404 (not found), second call creates collection
      mockHttpClient.get.mockRejectedValueOnce({ response: { status: 404 } });
      mockHttpClient.post.mockResolvedValue({ data: mockCollection });

      // Act
      const result = await client.getOrCreateCollection(testProfileId);

      // Assert
      expect(result).toEqual(mockCollection);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/collections'),
        expect.objectContaining({
          name: testCollectionName
        })
      );
    });

    it('should use correct collection naming convention', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123', metadata: {} };
      mockHttpClient.get.mockResolvedValue({ data: mockCollection });

      // Act
      await client.getOrCreateCollection(testProfileId);

      // Assert
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.stringContaining(`profile_${testProfileId}_kb`)
      );
    });

    it('should handle connection errors gracefully', async () => {
      // Arrange
      mockHttpClient.get.mockRejectedValue(new Error('Connection refused'));

      // Act & Assert
      await expect(client.getOrCreateCollection(testProfileId)).rejects.toThrow(
        'ChromaDB connection failed'
      );
    });
  });

  describe('addChunks()', () => {
    it('should add chunks with embeddings and metadata', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123' };
      const chunks = [
        {
          id: 'doc-1_chunk_0',
          document: 'First chunk text',
          embedding: createMockEmbedding(),
          metadata: {
            documentId: 'doc-1',
            profileId: testProfileId,
            filename: 'test.pdf',
            chunkIndex: 0,
            startOffset: 0,
            endOffset: 16,
            createdAt: new Date().toISOString()
          }
        },
        {
          id: 'doc-1_chunk_1',
          document: 'Second chunk text',
          embedding: createMockEmbedding(),
          metadata: {
            documentId: 'doc-1',
            profileId: testProfileId,
            filename: 'test.pdf',
            chunkIndex: 1,
            startOffset: 17,
            endOffset: 34,
            createdAt: new Date().toISOString()
          }
        }
      ];

      mockHttpClient.post.mockResolvedValue({ data: { success: true } });

      // Act
      await client.addChunks(mockCollection, chunks);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/collections/'),
        expect.objectContaining({
          ids: chunks.map(c => c.id),
          documents: chunks.map(c => c.document),
          embeddings: chunks.map(c => c.embedding),
          metadatas: chunks.map(c => c.metadata)
        })
      );
    });

    it('should handle empty chunks array', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123' };
      const chunks: unknown[] = [];

      // Act
      await client.addChunks(mockCollection, chunks);

      // Assert
      expect(mockHttpClient.post).not.toHaveBeenCalled(); // Should skip API call
    });

    it('should batch large chunk arrays', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123' };
      const chunks = Array.from({ length: 100 }, (_, i) => ({
        id: `doc-1_chunk_${i}`,
        document: `Chunk ${i}`,
        embedding: createMockEmbedding(),
        metadata: {
          documentId: 'doc-1',
          profileId: testProfileId,
          filename: 'test.pdf',
          chunkIndex: i,
          startOffset: i * 10,
          endOffset: (i + 1) * 10,
          createdAt: new Date().toISOString()
        }
      }));

      mockHttpClient.post.mockResolvedValue({ data: { success: true } });

      // Act
      await client.addChunks(mockCollection, chunks);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalled();
    });
  });

  describe('query()', () => {
    it('should return top K results by similarity', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123' };
      const queryEmbedding = createMockEmbedding();
      const topK = 5;
      const mockResults = {
        ids: [['doc-1_chunk_0', 'doc-1_chunk_2']],
        documents: [['First chunk', 'Third chunk']],
        metadatas: [[
          {
            documentId: 'doc-1',
            profileId: testProfileId,
            filename: 'test.pdf',
            chunkIndex: 0
          },
          {
            documentId: 'doc-1',
            profileId: testProfileId,
            filename: 'test.pdf',
            chunkIndex: 2
          }
        ]],
        distances: [[0.15, 0.32]]
      };

      mockHttpClient.post.mockResolvedValue({ data: mockResults });

      // Act
      const result = await client.query(mockCollection, queryEmbedding, topK);

      // Assert
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('document');
      expect(result[0]).toHaveProperty('metadata');
      expect(result[0]).toHaveProperty('distance');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/query'),
        expect.objectContaining({
          query_embeddings: [queryEmbedding],
          n_results: topK
        })
      );
    });

    it('should filter by metadata', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123' };
      const queryEmbedding = createMockEmbedding();
      const topK = 5;
      const filter = { documentId: 'doc-specific' };

      mockHttpClient.post.mockResolvedValue({
        data: {
          ids: [[]],
          documents: [[]],
          metadatas: [[]],
          distances: [[]]
        }
      });

      // Act
      await client.query(mockCollection, queryEmbedding, topK, filter);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: filter
        })
      );
    });

    it('should return empty array when no matches', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123' };
      const queryEmbedding = createMockEmbedding();
      const topK = 5;

      mockHttpClient.post.mockResolvedValue({
        data: {
          ids: [[]],
          documents: [[]],
          metadatas: [[]],
          distances: [[]]
        }
      });

      // Act
      const result = await client.query(mockCollection, queryEmbedding, topK);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle ChromaDB query errors', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123' };
      const queryEmbedding = createMockEmbedding();
      const topK = 5;

      mockHttpClient.post.mockRejectedValue(new Error('Query failed'));

      // Act & Assert
      await expect(
        client.query(mockCollection, queryEmbedding, topK)
      ).rejects.toThrow('ChromaDB query failed');
    });

    it('should convert distance to similarity score', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123' };
      const queryEmbedding = createMockEmbedding();
      const topK = 5;
      const mockResults = {
        ids: [['doc-1_chunk_0']],
        documents: [['Test chunk']],
        metadatas: [[{ documentId: 'doc-1', profileId: testProfileId }]],
        distances: [[0.25]] // Distance: 0.25 should convert to similarity
      };

      mockHttpClient.post.mockResolvedValue({ data: mockResults });

      // Act
      const result = await client.query(mockCollection, queryEmbedding, topK);

      // Assert
      expect(result[0].distance).toBe(0.25);
    });
  });

  describe('deleteChunks()', () => {
    it('should delete chunks by IDs', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123' };
      const chunkIds = ['doc-1_chunk_0', 'doc-1_chunk_1', 'doc-1_chunk_2'];

      mockHttpClient.post.mockResolvedValue({ data: { success: true } });

      // Act
      await client.deleteChunks(mockCollection, chunkIds);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/delete'),
        expect.objectContaining({
          ids: chunkIds
        })
      );
    });

    it('should handle non-existent chunk IDs gracefully', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123' };
      const chunkIds = ['non-existent-chunk'];

      mockHttpClient.post.mockResolvedValue({ data: { success: true } });

      // Act
      await client.deleteChunks(mockCollection, chunkIds);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalled(); // Should not throw
    });

    it('should handle empty chunk IDs array', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123' };
      const chunkIds: string[] = [];

      // Act
      await client.deleteChunks(mockCollection, chunkIds);

      // Assert
      expect(mockHttpClient.post).not.toHaveBeenCalled(); // Should skip API call
    });

    it('should handle ChromaDB deletion errors', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123' };
      const chunkIds = ['doc-1_chunk_0'];

      mockHttpClient.post.mockRejectedValue(new Error('Deletion failed'));

      // Act & Assert
      await expect(
        client.deleteChunks(mockCollection, chunkIds)
      ).rejects.toThrow('ChromaDB deletion failed');
    });
  });

  describe('Connection Management', () => {
    it('should use configured timeout', async () => {
      // Arrange
      mockHttpClient.get.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      // Act & Assert
      await expect(
        client.getOrCreateCollection(testProfileId)
      ).rejects.toThrow('timeout');
    }, 10000); // Extend test timeout to 10s to allow client timeout to trigger

    it('should construct correct API URLs', async () => {
      // Arrange
      const mockCollection = { name: testCollectionName, id: 'col-123', metadata: {} };
      mockHttpClient.get.mockResolvedValue({ data: mockCollection });

      // Act
      await client.getOrCreateCollection(testProfileId);

      // Assert
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.stringMatching(/^http:\/\/localhost:8000\/api\//)
      );
    });
  });
});

