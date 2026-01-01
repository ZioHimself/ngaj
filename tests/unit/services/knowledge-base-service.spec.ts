import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { KnowledgeBaseService } from '@/services/knowledge-base-service';
import {
  createMockDocument,
  createMockFileUpload,
  createInvalidUploads,
  createDocumentFixtures,
  createMockDocuments,
  storageLimitScenarios
} from '../../fixtures/knowledge-base-fixtures';
import type { ProcessingOptions } from '@/shared/types/knowledge-base';
import {
  ValidationError,
  StorageLimitError,
  ProcessingError,
  EmbeddingError,
  TimeoutError,
  NotFoundError
} from '@/shared/types/knowledge-base';

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;
  let mockDb: { collection: ReturnType<typeof vi.fn> };
  let mockDocumentsCollection: Record<string, ReturnType<typeof vi.fn>>;
  let mockDocumentProcessor: Record<string, ReturnType<typeof vi.fn>>;
  let mockChromaClient: Record<string, ReturnType<typeof vi.fn>>;
  let mockFs: Record<string, ReturnType<typeof vi.fn>>;
  const testProfileId = 'profile-test-123';

  beforeEach(() => {
    // Mock MongoDB collection
    mockDocumentsCollection = {
      insertOne: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      deleteOne: vi.fn(),
      aggregate: vi.fn()
    };

    mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'knowledge_documents') return mockDocumentsCollection;
        return mockDocumentsCollection;
      })
    };

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

    // Mock filesystem operations
    mockFs = {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      rm: vi.fn(),
      stat: vi.fn()
    };

    service = new KnowledgeBaseService(
      mockDb,
      mockDocumentProcessor,
      mockChromaClient,
      mockFs
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadDocument()', () => {
    it('should upload PDF document successfully', async () => {
      // Arrange
      const file = createMockFileUpload({
        filename: 'test.pdf',
        mimeType: 'application/pdf'
      });
      const mockText = 'Extracted text from PDF';
      const mockChunks = [
        { text: 'Chunk 1', startOffset: 0, endOffset: 7 },
        { text: 'Chunk 2', startOffset: 8, endOffset: 15 }
      ];
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6]
      ];

      mockDocumentProcessor.extractText.mockResolvedValue(mockText);
      mockDocumentProcessor.chunkText.mockResolvedValue(mockChunks);
      mockDocumentProcessor.generateEmbeddings.mockResolvedValue(mockEmbeddings);
      mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
      mockChromaClient.addChunks.mockResolvedValue(undefined);
      mockDocumentsCollection.insertOne.mockResolvedValue({
        insertedId: 'doc-123',
        acknowledged: true
      });
      mockDocumentsCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ totalSize: 0 }])
      });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      const result = await service.uploadDocument(testProfileId, file);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.profileId).toBe(testProfileId);
      expect(result.filename).toBe('test.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.chunkCount).toBe(2);
      expect(result.characterCount).toBe(mockText.length);
      expect(mockDocumentProcessor.extractText).toHaveBeenCalled();
      expect(mockDocumentProcessor.chunkText).toHaveBeenCalled();
      expect(mockDocumentProcessor.generateEmbeddings).toHaveBeenCalled();
      expect(mockChromaClient.addChunks).toHaveBeenCalled();
      expect(mockDocumentsCollection.insertOne).toHaveBeenCalled();
    });

    it('should upload Markdown document successfully', async () => {
      // Arrange
      const file = createMockFileUpload({
        filename: 'notes.md',
        mimeType: 'text/markdown'
      });
      const mockText = '# Title\n\nContent here';
      const mockChunks = [{ text: mockText, startOffset: 0, endOffset: mockText.length }];
      const mockEmbeddings = [[0.1, 0.2]];

      mockDocumentProcessor.extractText.mockResolvedValue(mockText);
      mockDocumentProcessor.chunkText.mockResolvedValue(mockChunks);
      mockDocumentProcessor.generateEmbeddings.mockResolvedValue(mockEmbeddings);
      mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
      mockChromaClient.addChunks.mockResolvedValue(undefined);
      mockDocumentsCollection.insertOne.mockResolvedValue({
        insertedId: 'doc-456',
        acknowledged: true
      });
      mockDocumentsCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ totalSize: 0 }])
      });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      const result = await service.uploadDocument(testProfileId, file);

      // Assert
      expect(result.filename).toBe('notes.md');
      expect(result.mimeType).toBe('text/markdown');
    });

    it('should upload TXT document successfully', async () => {
      // Arrange
      const file = createMockFileUpload({
        filename: 'notes.txt',
        mimeType: 'text/plain'
      });
      const mockText = 'Plain text content';
      const mockChunks = [{ text: mockText, startOffset: 0, endOffset: mockText.length }];
      const mockEmbeddings = [[0.1, 0.2]];

      mockDocumentProcessor.extractText.mockResolvedValue(mockText);
      mockDocumentProcessor.chunkText.mockResolvedValue(mockChunks);
      mockDocumentProcessor.generateEmbeddings.mockResolvedValue(mockEmbeddings);
      mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
      mockChromaClient.addChunks.mockResolvedValue(undefined);
      mockDocumentsCollection.insertOne.mockResolvedValue({
        insertedId: 'doc-789',
        acknowledged: true
      });
      mockDocumentsCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ totalSize: 0 }])
      });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      const result = await service.uploadDocument(testProfileId, file);

      // Assert
      expect(result.filename).toBe('notes.txt');
      expect(result.mimeType).toBe('text/plain');
    });

    it('should throw ValidationError for invalid file type', async () => {
      // Arrange
      const invalidUploads = createInvalidUploads();
      const file = invalidUploads.invalidMimeType;

      // Act & Assert
      await expect(service.uploadDocument(testProfileId, file)).rejects.toThrow(ValidationError);
      await expect(service.uploadDocument(testProfileId, file)).rejects.toThrow(
        'Unsupported file type'
      );
    });

    it('should throw ValidationError for file too large', async () => {
      // Arrange
      const invalidUploads = createInvalidUploads();
      const file = invalidUploads.oversizedFile;

      // Act & Assert
      await expect(service.uploadDocument(testProfileId, file)).rejects.toThrow(ValidationError);
      await expect(service.uploadDocument(testProfileId, file)).rejects.toThrow(
        'File too large'
      );
    });

    it('should throw ValidationError for missing profileId', async () => {
      // Arrange
      const file = createMockFileUpload();

      // Act & Assert
      await expect(service.uploadDocument('', file)).rejects.toThrow(ValidationError);
      await expect(service.uploadDocument('', file)).rejects.toThrow('profileId is required');
    });

    it('should throw StorageLimitError when total storage exceeded', async () => {
      // Arrange
      const file = createMockFileUpload();
      const scenario = storageLimitScenarios.exceededLimit;

      mockDocumentsCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ totalSize: scenario.currentUsageBytes }])
      });

      // Act & Assert
      await expect(service.uploadDocument(testProfileId, file)).rejects.toThrow(StorageLimitError);
      await expect(service.uploadDocument(testProfileId, file)).rejects.toThrow(
        'Storage limit exceeded'
      );
    });

    it('should throw ProcessingError when text extraction fails', async () => {
      // Arrange
      const file = createMockFileUpload();
      mockDocumentsCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ totalSize: 0 }])
      });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockDocumentProcessor.extractText.mockRejectedValue(new Error('Failed to extract text'));

      // Act & Assert
      await expect(service.uploadDocument(testProfileId, file)).rejects.toThrow(ProcessingError);
    });

    it('should throw EmbeddingError when Claude API fails', async () => {
      // Arrange
      const file = createMockFileUpload();
      const mockText = 'Sample text';
      const mockChunks = [{ text: mockText, startOffset: 0, endOffset: 11 }];

      mockDocumentsCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ totalSize: 0 }])
      });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockDocumentProcessor.extractText.mockResolvedValue(mockText);
      mockDocumentProcessor.chunkText.mockResolvedValue(mockChunks);
      mockDocumentProcessor.generateEmbeddings.mockRejectedValue(
        new EmbeddingError('Claude API rate limit exceeded')
      );

      // Act & Assert
      await expect(service.uploadDocument(testProfileId, file)).rejects.toThrow(EmbeddingError);
    });

    it('should throw TimeoutError when processing exceeds timeout', async () => {
      // Arrange
      // Create service with short timeout
      const shortTimeoutService = new KnowledgeBaseService(
        mockDb,
        mockDocumentProcessor,
        mockChromaClient,
        mockFs,
        { processingTimeoutMs: 1000 } // 1 second timeout
      );
      
      const file = createMockFileUpload();
      const options: ProcessingOptions = { chunkSize: 500 };

      mockDocumentsCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ totalSize: 0 }])
      });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockDocumentProcessor.extractText.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)) // Simulate 10s delay
      );

      // Act & Assert
      await expect(shortTimeoutService.uploadDocument(testProfileId, file, options)).rejects.toThrow(
        TimeoutError
      );
    }, 10000); // Test timeout 10s to allow service timeout to trigger

    it('should rollback filesystem changes on ChromaDB failure', async () => {
      // Arrange
      const file = createMockFileUpload();
      const mockText = 'Sample text';
      const mockChunks = [{ text: mockText, startOffset: 0, endOffset: 11 }];
      const mockEmbeddings = [[0.1, 0.2]];

      mockDocumentsCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ totalSize: 0 }])
      });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockDocumentProcessor.extractText.mockResolvedValue(mockText);
      mockDocumentProcessor.chunkText.mockResolvedValue(mockChunks);
      mockDocumentProcessor.generateEmbeddings.mockResolvedValue(mockEmbeddings);
      mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
      mockChromaClient.addChunks.mockRejectedValue(new Error('ChromaDB connection failed'));

      // Act & Assert
      await expect(service.uploadDocument(testProfileId, file)).rejects.toThrow();
      expect(mockFs.rm).toHaveBeenCalled(); // Should clean up filesystem
    });

    it('should rollback ChromaDB changes on MongoDB failure', async () => {
      // Arrange
      const file = createMockFileUpload();
      const mockText = 'Sample text';
      const mockChunks = [{ text: mockText, startOffset: 0, endOffset: 11 }];
      const mockEmbeddings = [[0.1, 0.2]];

      mockDocumentsCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ totalSize: 0 }])
      });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockDocumentProcessor.extractText.mockResolvedValue(mockText);
      mockDocumentProcessor.chunkText.mockResolvedValue(mockChunks);
      mockDocumentProcessor.generateEmbeddings.mockResolvedValue(mockEmbeddings);
      mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
      mockChromaClient.addChunks.mockResolvedValue(undefined);
      mockDocumentsCollection.insertOne.mockRejectedValue(new Error('MongoDB insert failed'));

      // Act & Assert
      await expect(service.uploadDocument(testProfileId, file)).rejects.toThrow();
      expect(mockChromaClient.deleteChunks).toHaveBeenCalled(); // Should rollback ChromaDB
      expect(mockFs.rm).toHaveBeenCalled(); // Should clean up filesystem
    });

    it('should include processing metadata in result', async () => {
      // Arrange
      const file = createMockFileUpload();
      const mockText = 'Sample text';
      const mockChunks = [{ text: mockText, startOffset: 0, endOffset: 11 }];
      const mockEmbeddings = [[0.1, 0.2]];

      mockDocumentProcessor.extractText.mockResolvedValue(mockText);
      mockDocumentProcessor.chunkText.mockResolvedValue(mockChunks);
      mockDocumentProcessor.generateEmbeddings.mockResolvedValue(mockEmbeddings);
      mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
      mockChromaClient.addChunks.mockResolvedValue(undefined);
      mockDocumentsCollection.insertOne.mockResolvedValue({
        insertedId: 'doc-123',
        acknowledged: true
      });
      mockDocumentsCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ totalSize: 0 }])
      });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      const result = await service.uploadDocument(testProfileId, file);

      // Assert
      expect(result.processingMetadata).toBeDefined();
      expect(result.processingMetadata.extractionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.processingMetadata.chunkingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.processingMetadata.embeddingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.processingMetadata.totalTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('listDocuments()', () => {
    it('should return documents for profileId', async () => {
      // Arrange
      const fixtures = createDocumentFixtures(testProfileId);
      const mockDocuments = [fixtures.pdfDocument, fixtures.markdownDocument];
      
      mockDocumentsCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockDocuments)
      });

      // Act
      const result = await service.listDocuments(testProfileId);

      // Assert
      expect(result).toEqual(mockDocuments);
      expect(mockDocumentsCollection.find).toHaveBeenCalledWith({ profileId: testProfileId });
    });

    it('should return empty array when no documents exist', async () => {
      // Arrange
      mockDocumentsCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([])
      });

      // Act
      const result = await service.listDocuments(testProfileId);

      // Assert
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should sort by uploadedAt descending (newest first)', async () => {
      // Arrange
      const mockDocs = createMockDocuments(testProfileId, 3);
      
      mockDocumentsCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockDocs)
      });

      // Act
      await service.listDocuments(testProfileId);

      // Assert
      expect(mockDocumentsCollection.find().sort).toHaveBeenCalledWith({ uploadedAt: -1 });
    });

    it('should throw ValidationError for invalid profileId format', async () => {
      // Arrange
      const invalidProfileId = '';

      // Act & Assert
      await expect(service.listDocuments(invalidProfileId)).rejects.toThrow(ValidationError);
      await expect(service.listDocuments(invalidProfileId)).rejects.toThrow('profileId is required');
    });
  });

  describe('deleteDocument()', () => {
    it('should hard delete document from all systems', async () => {
      // Arrange
      const documentId = 'doc-test-123';
      const mockDoc = createMockDocument({ id: documentId, profileId: testProfileId });
      
      mockDocumentsCollection.findOne.mockResolvedValue(mockDoc);
      mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
      mockChromaClient.deleteChunks.mockResolvedValue(undefined);
      mockFs.rm.mockResolvedValue(undefined);
      mockDocumentsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      // Act
      await service.deleteDocument(documentId);

      // Assert
      expect(mockChromaClient.deleteChunks).toHaveBeenCalled();
      expect(mockFs.rm).toHaveBeenCalled();
      expect(mockDocumentsCollection.deleteOne).toHaveBeenCalledWith({ id: documentId });
    });

    it('should throw NotFoundError when document does not exist', async () => {
      // Arrange
      const documentId = 'non-existent-doc';
      mockDocumentsCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteDocument(documentId)).rejects.toThrow(NotFoundError);
      await expect(service.deleteDocument(documentId)).rejects.toThrow('Document not found');
    });

    it('should log error but succeed if ChromaDB deletion fails', async () => {
      // Arrange
      const documentId = 'doc-test-123';
      const mockDoc = createMockDocument({ id: documentId, profileId: testProfileId });
      
      mockDocumentsCollection.findOne.mockResolvedValue(mockDoc);
      mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
      mockChromaClient.deleteChunks.mockRejectedValue(new Error('ChromaDB unavailable'));
      mockFs.rm.mockResolvedValue(undefined);
      mockDocumentsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      // Act
      await service.deleteDocument(documentId);

      // Assert
      expect(mockDocumentsCollection.deleteOne).toHaveBeenCalled(); // Should still delete from MongoDB
    });
  });

  describe('queryKnowledgeBase()', () => {
    it('should return top K chunks', async () => {
      // Arrange
      const query = 'test query';
      const topK = 5;
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockResults = [
        {
          id: 'doc-1_chunk_0',
          document: 'Relevant content',
          metadata: {
            documentId: 'doc-1',
            filename: 'test.pdf',
            chunkIndex: 0,
            profileId: testProfileId
          },
          distance: 0.15
        }
      ];

      mockDocumentProcessor.generateEmbeddings.mockResolvedValue([mockEmbedding]);
      mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
      mockChromaClient.query.mockResolvedValue(mockResults);

      // Act
      const result = await service.queryKnowledgeBase(testProfileId, query, topK);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockChromaClient.query).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'test-collection' }),
        mockEmbedding,
        topK,
        undefined
      );
    });

    it('should return empty array when collection is empty', async () => {
      // Arrange
      const query = 'test query';
      const mockEmbedding = [0.1, 0.2, 0.3];

      mockDocumentProcessor.generateEmbeddings.mockResolvedValue([mockEmbedding]);
      mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
      mockChromaClient.query.mockResolvedValue([]);

      // Act
      const result = await service.queryKnowledgeBase(testProfileId, query);

      // Assert
      expect(result).toEqual([]);
    });

    it('should respect custom topK parameter', async () => {
      // Arrange
      const query = 'test query';
      const customTopK = 10;
      const mockEmbedding = [0.1, 0.2, 0.3];

      mockDocumentProcessor.generateEmbeddings.mockResolvedValue([mockEmbedding]);
      mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
      mockChromaClient.query.mockResolvedValue([]);

      // Act
      await service.queryKnowledgeBase(testProfileId, query, customTopK);

      // Assert
      expect(mockChromaClient.query).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'test-collection' }),
        mockEmbedding,
        customTopK,
        undefined
      );
    });

    it('should return chunks with similarity scores', async () => {
      // Arrange
      const query = 'test query';
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockResults = [
        {
          id: 'doc-1_chunk_0',
          document: 'Relevant content',
          metadata: {
            documentId: 'doc-1',
            filename: 'test.pdf',
            chunkIndex: 0,
            profileId: testProfileId
          },
          distance: 0.15 // ChromaDB returns distance, should convert to similarity
        }
      ];

      mockDocumentProcessor.generateEmbeddings.mockResolvedValue([mockEmbedding]);
      mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
      mockChromaClient.query.mockResolvedValue(mockResults);

      // Act
      const result = await service.queryKnowledgeBase(testProfileId, query);

      // Assert
      expect(result[0]).toHaveProperty('similarity');
      expect(result[0].similarity).toBeGreaterThanOrEqual(0);
      expect(result[0].similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('getStorageUsed()', () => {
    it('should return total bytes for profile', async () => {
      // Arrange
      const totalBytes = 1024 * 1024 * 50; // 50MB
      
      mockDocumentsCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ totalSize: totalBytes }])
      });

      // Act
      const result = await service.getStorageUsed(testProfileId);

      // Assert
      expect(result).toBe(totalBytes);
      expect(mockDocumentsCollection.aggregate).toHaveBeenCalled();
    });

    it('should return 0 when no documents exist', async () => {
      // Arrange
      mockDocumentsCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ totalSize: 0 }])
      });

      // Act
      const result = await service.getStorageUsed(testProfileId);

      // Assert
      expect(result).toBe(0);
    });
  });
});

