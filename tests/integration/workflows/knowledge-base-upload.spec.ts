import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { KnowledgeBaseService } from '@/services/knowledge-base-service';
import {
  createMockFileUpload,
  createMockEmbedding,
  mockExtractedText
} from '../../fixtures/knowledge-base-fixtures';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('Knowledge Base Upload Workflow (Integration)', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let service: KnowledgeBaseService;
  let mockDocumentProcessor: Record<string, ReturnType<typeof vi.fn>>;
  let mockChromaClient: Record<string, ReturnType<typeof vi.fn>>;
  let tempDir: string;
  const testProfileId = 'profile-integration-test';

  beforeEach(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db('ngaj-test');

    // Create temp directory for file storage
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ngaj-kb-test-'));

    // Mock DocumentProcessor
    mockDocumentProcessor = {
      extractText: vi.fn(),
      chunkText: vi.fn(),
      generateEmbeddings: vi.fn()
    };

    // Mock ChromaDBClient (no in-memory alternative available)
    mockChromaClient = {
      getOrCreateCollection: vi.fn(),
      addChunks: vi.fn(),
      query: vi.fn(),
      deleteChunks: vi.fn()
    };

    // Use real filesystem operations
    const realFs = {
      mkdir: fs.mkdir,
      writeFile: fs.writeFile,
      rm: fs.rm,
      stat: fs.stat,
      readFile: fs.readFile
    };

    service = new KnowledgeBaseService(
      { collection: (name: string) => db.collection(name) },
      mockDocumentProcessor,
      mockChromaClient,
      realFs
    );
  });

  afterEach(async () => {
    // Cleanup
    await mongoClient.close();
    await mongoServer.stop();
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('should upload document end-to-end (PDF → MongoDB + ChromaDB + Filesystem)', async () => {
    // Arrange
    const file = createMockFileUpload({
      filename: 'integration-test.pdf',
      mimeType: 'application/pdf'
    });
    const mockText = mockExtractedText.multipleParagraphs;
    const mockChunks = [
      { text: 'Chunk 1', startOffset: 0, endOffset: 7 },
      { text: 'Chunk 2', startOffset: 8, endOffset: 15 }
    ];
    const mockEmbeddings = [createMockEmbedding(), createMockEmbedding()];

    mockDocumentProcessor.extractText.mockResolvedValue(mockText);
    mockDocumentProcessor.chunkText.mockResolvedValue(mockChunks);
    mockDocumentProcessor.generateEmbeddings.mockResolvedValue(mockEmbeddings);
    mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
    mockChromaClient.addChunks.mockResolvedValue(undefined);

    // Act
    const result = await service.uploadDocument(testProfileId, file);

    // Assert
    // 1. Document saved to MongoDB
    const mongoDoc = await db.collection('knowledge_documents').findOne({ id: result.id });
    expect(mongoDoc).toBeDefined();
    expect(mongoDoc?.profileId).toBe(testProfileId);
    expect(mongoDoc?.filename).toBe('integration-test.pdf');

    // 2. Chunks added to ChromaDB
    expect(mockChromaClient.addChunks).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringContaining(result.id),
          document: expect.any(String),
          embedding: expect.any(Array)
        })
      ])
    );

    // 3. File saved to filesystem
    const filePath = result.filePath;
    const fileExists = await fs.stat(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
  });

  it('should rollback all changes on embedding failure', async () => {
    // Arrange
    const file = createMockFileUpload();
    const mockText = 'Sample text';
    const mockChunks = [{ text: mockText, startOffset: 0, endOffset: 11 }];

    mockDocumentProcessor.extractText.mockResolvedValue(mockText);
    mockDocumentProcessor.chunkText.mockResolvedValue(mockChunks);
    mockDocumentProcessor.generateEmbeddings.mockRejectedValue(
      new Error('Claude API failure')
    );

    // Act & Assert
    await expect(service.uploadDocument(testProfileId, file)).rejects.toThrow();

    // Verify rollback
    const mongoCount = await db.collection('knowledge_documents').countDocuments({});
    expect(mongoCount).toBe(0); // No document in MongoDB

    const filesInTemp = await fs.readdir(tempDir).catch(() => []);
    expect(filesInTemp.length).toBe(0); // No files in temp directory
  });

  it.skip('should rollback filesystem and ChromaDB on MongoDB failure', async () => {
    // Arrange
    const file = createMockFileUpload();
    const mockText = 'Sample text';
    const mockChunks = [{ text: mockText, startOffset: 0, endOffset: 11 }];
    const mockEmbeddings = [createMockEmbedding()];

    mockDocumentProcessor.extractText.mockResolvedValue(mockText);
    mockDocumentProcessor.chunkText.mockResolvedValue(mockChunks);
    mockDocumentProcessor.generateEmbeddings.mockResolvedValue(mockEmbeddings);
    mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
    mockChromaClient.addChunks.mockResolvedValue(undefined);

    // Force MongoDB failure by dropping the collection mid-operation
    vi.spyOn(db.collection('knowledge_documents'), 'insertOne').mockRejectedValueOnce(
      new Error('MongoDB insert failed')
    );

    // Act & Assert
    await expect(service.uploadDocument(testProfileId, file)).rejects.toThrow();

    // Verify rollback
    expect(mockChromaClient.deleteChunks).toHaveBeenCalled(); // ChromaDB cleanup
    const filesInTemp = await fs.readdir(tempDir).catch(() => []);
    expect(filesInTemp.length).toBe(0); // Filesystem cleanup
  });

  it('should rollback filesystem on ChromaDB failure', async () => {
    // Arrange
    const file = createMockFileUpload();
    const mockText = 'Sample text';
    const mockChunks = [{ text: mockText, startOffset: 0, endOffset: 11 }];
    const mockEmbeddings = [createMockEmbedding()];

    mockDocumentProcessor.extractText.mockResolvedValue(mockText);
    mockDocumentProcessor.chunkText.mockResolvedValue(mockChunks);
    mockDocumentProcessor.generateEmbeddings.mockResolvedValue(mockEmbeddings);
    mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
    mockChromaClient.addChunks.mockRejectedValue(new Error('ChromaDB connection failed'));

    // Act & Assert
    await expect(service.uploadDocument(testProfileId, file)).rejects.toThrow();

    // Verify rollback
    const mongoCount = await db.collection('knowledge_documents').countDocuments({});
    expect(mongoCount).toBe(0);
    const filesInTemp = await fs.readdir(tempDir).catch(() => []);
    expect(filesInTemp.length).toBe(0);
  });

  it('should enforce storage limit across multiple uploads', async () => {
    // Arrange - Use service with lower storage limit for testing
    const testService = new KnowledgeBaseService(
      { collection: (name: string) => db.collection(name) },
      mockDocumentProcessor,
      mockChromaClient,
      { mkdir: fs.mkdir, writeFile: fs.writeFile, rm: fs.rm, stat: fs.stat, readFile: fs.readFile },
      { maxStorageBytes: 15 * 1024 * 1024 } // 15MB total limit
    );
    
    const firstFile = createMockFileUpload({
      filename: 'first.pdf',
      buffer: Buffer.alloc(1024 * 1024 * 8) // 8MB
    });
    const secondFile = createMockFileUpload({
      filename: 'second.pdf',
      buffer: Buffer.alloc(1024 * 1024 * 8) // 8MB (8 + 8 = 16MB > 15MB limit)
    });

    const mockText = 'Sample text';
    const mockChunks = [{ text: mockText, startOffset: 0, endOffset: 11 }];
    const mockEmbeddings = [createMockEmbedding()];

    mockDocumentProcessor.extractText.mockResolvedValue(mockText);
    mockDocumentProcessor.chunkText.mockResolvedValue(mockChunks);
    mockDocumentProcessor.generateEmbeddings.mockResolvedValue(mockEmbeddings);
    mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
    mockChromaClient.addChunks.mockResolvedValue(undefined);

    // Act
    // Upload first file successfully
    await testService.uploadDocument(testProfileId, firstFile);

    // Try to upload second file (should exceed 15MB limit)
    await expect(
      testService.uploadDocument(testProfileId, secondFile)
    ).rejects.toThrow('Storage limit exceeded');

    // Assert
    const mongoCount = await db.collection('knowledge_documents').countDocuments({
      profileId: testProfileId
    });
    expect(mongoCount).toBe(1); // Only first upload succeeded
  });

  it('should track processing metadata accurately', async () => {
    // Arrange
    const file = createMockFileUpload();
    const mockText = 'Sample text';
    const mockChunks = [{ text: mockText, startOffset: 0, endOffset: 11 }];
    const mockEmbeddings = [createMockEmbedding()];

    // Add delays to measure timing
    mockDocumentProcessor.extractText.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return mockText;
    });
    mockDocumentProcessor.chunkText.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      return mockChunks;
    });
    mockDocumentProcessor.generateEmbeddings.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 15));
      return mockEmbeddings;
    });
    mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
    mockChromaClient.addChunks.mockResolvedValue(undefined);

    // Act
    const result = await service.uploadDocument(testProfileId, file);

    // Assert
    expect(result.processingMetadata).toBeDefined();
    expect(result.processingMetadata.extractionTimeMs).toBeGreaterThan(0);
    expect(result.processingMetadata.chunkingTimeMs).toBeGreaterThan(0);
    expect(result.processingMetadata.embeddingTimeMs).toBeGreaterThan(0);
    expect(result.processingMetadata.totalTimeMs).toBeGreaterThanOrEqual(
      result.processingMetadata.extractionTimeMs +
      result.processingMetadata.chunkingTimeMs +
      result.processingMetadata.embeddingTimeMs
    );
  });

  it('should handle concurrent uploads to same profile (isolation)', async () => {
    // Arrange
    const file1 = createMockFileUpload({ filename: 'doc1.pdf' });
    const file2 = createMockFileUpload({ filename: 'doc2.pdf' });

    const mockText = 'Sample text';
    const mockChunks = [{ text: mockText, startOffset: 0, endOffset: 11 }];
    const mockEmbeddings = [createMockEmbedding()];

    mockDocumentProcessor.extractText.mockResolvedValue(mockText);
    mockDocumentProcessor.chunkText.mockResolvedValue(mockChunks);
    mockDocumentProcessor.generateEmbeddings.mockResolvedValue(mockEmbeddings);
    mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
    mockChromaClient.addChunks.mockResolvedValue(undefined);

    // Act
    const [result1, result2] = await Promise.all([
      service.uploadDocument(testProfileId, file1),
      service.uploadDocument(testProfileId, file2)
    ]);

    // Assert
    expect(result1.id).not.toBe(result2.id); // Different document IDs
    const mongoCount = await db.collection('knowledge_documents').countDocuments({
      profileId: testProfileId
    });
    expect(mongoCount).toBe(2); // Both uploads succeeded
  });
});

