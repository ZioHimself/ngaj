import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { KnowledgeBaseService } from '@ngaj/backend/services/knowledge-base-service';
import { createMockDocument } from '../../fixtures/knowledge-base-fixtures';
import { NotFoundError } from '@ngaj/shared';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('Knowledge Base Delete Workflow (Integration)', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let service: KnowledgeBaseService;
  let mockDocumentProcessor: Record<string, ReturnType<typeof vi.fn>>;
  let mockChromaClient: Record<string, ReturnType<typeof vi.fn>>;
  let tempDir: string;
  const testProfileId = 'profile-delete-test';

  beforeEach(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db('ngaj-test');

    // Create temp directory for file storage
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ngaj-kb-delete-test-'));

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

    mockChromaClient.getOrCreateCollection.mockResolvedValue({ name: 'test-collection' });
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoServer.stop();
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('should hard delete document from MongoDB, ChromaDB, and filesystem', async () => {
    // Arrange
    const mockDoc = createMockDocument({
      id: 'doc-delete-test',
      profileId: testProfileId,
      filePath: path.join(tempDir, 'doc-delete-test', 'original.pdf'),
      chunkCount: 3
    });

    // Insert into MongoDB
    await db.collection('knowledge_documents').insertOne(mockDoc);

    // Create file on filesystem
    const docDir = path.join(tempDir, 'doc-delete-test');
    await fs.mkdir(docDir, { recursive: true });
    await fs.writeFile(mockDoc.filePath, 'Test file content');

    mockChromaClient.deleteChunks.mockResolvedValue(undefined);

    // Act
    await service.deleteDocument(mockDoc.id);

    // Assert
    // 1. Removed from MongoDB
    const mongoDoc = await db.collection('knowledge_documents').findOne({ id: mockDoc.id });
    expect(mongoDoc).toBeNull();

    // 2. Chunks deleted from ChromaDB
    expect(mockChromaClient.deleteChunks).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.stringContaining(`${mockDoc.id}_chunk_`)
      ])
    );

    // 3. Files removed from filesystem
    const fileExists = await fs.stat(docDir).then(() => true).catch(() => false);
    expect(fileExists).toBe(false);
  });

  it('should throw NotFoundError when document does not exist', async () => {
    // Arrange
    const nonExistentId = 'non-existent-doc-id';

    // Act & Assert
    await expect(service.deleteDocument(nonExistentId)).rejects.toThrow(NotFoundError);
    await expect(service.deleteDocument(nonExistentId)).rejects.toThrow('Document not found');
  });

  it('should log error but succeed if ChromaDB deletion fails', async () => {
    // Arrange
    const mockDoc = createMockDocument({
      id: 'doc-chromadb-fail',
      profileId: testProfileId,
      filePath: path.join(tempDir, 'doc-chromadb-fail', 'original.pdf')
    });

    await db.collection('knowledge_documents').insertOne(mockDoc);

    const docDir = path.join(tempDir, 'doc-chromadb-fail');
    await fs.mkdir(docDir, { recursive: true });
    await fs.writeFile(mockDoc.filePath, 'Test file content');

    // ChromaDB deletion fails
    mockChromaClient.deleteChunks.mockRejectedValue(new Error('ChromaDB unavailable'));

    // Act
    await service.deleteDocument(mockDoc.id);

    // Assert
    // Should still delete from MongoDB and filesystem
    const mongoDoc = await db.collection('knowledge_documents').findOne({ id: mockDoc.id });
    expect(mongoDoc).toBeNull();

    const fileExists = await fs.stat(docDir).then(() => true).catch(() => false);
    expect(fileExists).toBe(false);
  });

  it('should keep other documents intact when deleting one', async () => {
    // Arrange
    const doc1 = createMockDocument({
      id: 'doc-1',
      profileId: testProfileId,
      filename: 'doc1.pdf',
      filePath: path.join(tempDir, 'doc-1', 'original.pdf')
    });
    const doc2 = createMockDocument({
      id: 'doc-2',
      profileId: testProfileId,
      filename: 'doc2.pdf',
      filePath: path.join(tempDir, 'doc-2', 'original.pdf')
    });

    // Insert both documents
    await db.collection('knowledge_documents').insertMany([doc1, doc2]);

    // Create files for both
    await fs.mkdir(path.dirname(doc1.filePath), { recursive: true });
    await fs.writeFile(doc1.filePath, 'Doc 1 content');
    await fs.mkdir(path.dirname(doc2.filePath), { recursive: true });
    await fs.writeFile(doc2.filePath, 'Doc 2 content');

    mockChromaClient.deleteChunks.mockResolvedValue(undefined);

    // Act
    await service.deleteDocument(doc1.id);

    // Assert
    // doc1 should be deleted
    const mongoDoc1 = await db.collection('knowledge_documents').findOne({ id: doc1.id });
    expect(mongoDoc1).toBeNull();
    const file1Exists = await fs.stat(path.dirname(doc1.filePath)).then(() => true).catch(() => false);
    expect(file1Exists).toBe(false);

    // doc2 should still exist
    const mongoDoc2 = await db.collection('knowledge_documents').findOne({ id: doc2.id });
    expect(mongoDoc2).toBeDefined();
    const file2Exists = await fs.stat(doc2.filePath).then(() => true).catch(() => false);
    expect(file2Exists).toBe(true);
  });

  it('should delete all chunks for document from ChromaDB', async () => {
    // Arrange
    const mockDoc = createMockDocument({
      id: 'doc-multi-chunk',
      profileId: testProfileId,
      filePath: path.join(tempDir, 'doc-multi-chunk', 'original.pdf'),
      chunkCount: 5
    });

    await db.collection('knowledge_documents').insertOne(mockDoc);

    const docDir = path.dirname(mockDoc.filePath);
    await fs.mkdir(docDir, { recursive: true });
    await fs.writeFile(mockDoc.filePath, 'Test content');

    mockChromaClient.deleteChunks.mockResolvedValue(undefined);

    // Act
    await service.deleteDocument(mockDoc.id);

    // Assert
    // Should generate chunk IDs for all 5 chunks
    expect(mockChromaClient.deleteChunks).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        `${mockDoc.id}_chunk_0`,
        `${mockDoc.id}_chunk_1`,
        `${mockDoc.id}_chunk_2`,
        `${mockDoc.id}_chunk_3`,
        `${mockDoc.id}_chunk_4`
      ])
    );
  });

  it('should handle filesystem deletion failure gracefully', async () => {
    // Arrange
    const mockDoc = createMockDocument({
      id: 'doc-fs-fail',
      profileId: testProfileId,
      filePath: '/nonexistent/path/doc.pdf' // Non-existent path
    });

    await db.collection('knowledge_documents').insertOne(mockDoc);
    mockChromaClient.deleteChunks.mockResolvedValue(undefined);

    // Act
    // Should not throw, but log error and continue
    await service.deleteDocument(mockDoc.id);

    // Assert
    // Document still deleted from MongoDB
    const mongoDoc = await db.collection('knowledge_documents').findOne({ id: mockDoc.id });
    expect(mongoDoc).toBeNull();
  });
});

