/**
 * Knowledge Base Service - Document upload, query, and management
 * 
 * Orchestrates the complete knowledge base pipeline:
 * - Upload: Validate → Extract → Chunk → Embed → Store (atomic)
 * - Query: Generate query embedding → Semantic search → Return results
 * - Delete: Remove from MongoDB, ChromaDB, and filesystem (atomic)
 * 
 * @see {@link ../../docs/architecture/decisions/007-knowledge-base-implementation.md}
 */

import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import type {
  KnowledgeDocument,
  FileUpload,
  ProcessingOptions,
  KnowledgeQueryResult,
  TextChunk,
  KnowledgeDocumentProcessingMetadata
} from '@/shared/types/knowledge-base';
import {
  ValidationError,
  StorageLimitError,
  ProcessingError,
  EmbeddingError,
  TimeoutError,
  NotFoundError
} from '@/shared/types/knowledge-base';
import type { ChromaCollection } from '@/clients/chromadb-client';

/**
 * Configuration for Knowledge Base Service
 */
interface KnowledgeBaseConfig {
  maxFileSizeBytes: number;
  maxStorageBytes: number;
  storagePath: string;
  processingTimeoutMs: number;
  chunkSizeTokens: number;
  chunkOverlapTokens: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: KnowledgeBaseConfig = {
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  maxStorageBytes: 100 * 1024 * 1024, // 100MB
  storagePath: '/tmp/knowledge',
  processingTimeoutMs: 60000, // 60s
  chunkSizeTokens: 500,
  chunkOverlapTokens: 50
};

/**
 * Knowledge Base Service
 */
export class KnowledgeBaseService {
  private config: KnowledgeBaseConfig;

  constructor(
    private db: {
      collection: (name: string) => {
        insertOne: (doc: unknown) => Promise<{ insertedId: string; acknowledged: boolean }>;
        findOne: (query: unknown) => Promise<unknown | null>;
        find: (query: unknown) => {
          sort: (order: unknown) => { toArray: () => Promise<unknown[]> };
        };
        deleteOne: (query: unknown) => Promise<{ deletedCount: number }>;
        aggregate: (pipeline: unknown[]) => { toArray: () => Promise<unknown[]> };
      };
    },
    private documentProcessor: {
      extractText: (filePath: string, mimeType: string) => Promise<string>;
      chunkText: (text: string, options: { maxTokens: number; overlapTokens: number }) => Promise<TextChunk[]>;
      generateEmbeddings: (chunks: string[]) => Promise<number[][]>;
    },
    private chromaClient: {
      getOrCreateCollection: (profileId: string) => Promise<ChromaCollection>;
      addChunks: (collection: ChromaCollection, chunks: Array<{
        id: string;
        document: string;
        embedding: number[];
        metadata: Record<string, unknown>;
      }>) => Promise<void>;
      query: (collection: ChromaCollection, queryEmbedding: number[], topK: number, filter?: Record<string, unknown>) => Promise<Array<{
        id: string;
        document: string;
        metadata: Record<string, unknown>;
        distance: number;
      }>>;
      deleteChunks: (collection: ChromaCollection, chunkIds: string[]) => Promise<void>;
    },
    private fs: {
      mkdir: (path: string, options?: { recursive: boolean }) => Promise<void>;
      writeFile: (path: string, data: Buffer) => Promise<void>;
      rm: (path: string, options?: { recursive: boolean; force: boolean }) => Promise<void>;
      stat: (path: string) => Promise<{ size: number }>;
    },
    config?: Partial<KnowledgeBaseConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Upload and process a document
   * 
   * @param profileId - Profile identifier
   * @param file - File upload data
   * @param options - Processing options
   * @returns Knowledge document with metadata
   */
  async uploadDocument(
    profileId: string,
    file: FileUpload,
    options?: ProcessingOptions
  ): Promise<KnowledgeDocument> {
    // Validate inputs
    if (!profileId || typeof profileId !== 'string') {
      throw new ValidationError('profileId is required and must be a string');
    }

    // Validate file type
    const allowedMimeTypes = ['application/pdf', 'text/markdown', 'text/plain'];
    if (!allowedMimeTypes.includes(file.mimeType)) {
      throw new ValidationError('Unsupported file type. Allowed: PDF, Markdown, TXT');
    }

    // Validate file size
    if (file.buffer.length > this.config.maxFileSizeBytes) {
      throw new ValidationError(`File too large. Maximum: ${this.config.maxFileSizeBytes / (1024 * 1024)}MB`);
    }

    // Check storage limit
    const currentUsage = await this.getStorageUsed(profileId);
    if (currentUsage + file.buffer.length > this.config.maxStorageBytes) {
      throw new StorageLimitError('Storage limit exceeded. Delete old documents to upload new ones');
    }

    // Process with timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new TimeoutError('Processing timeout exceeded. Try a smaller document')), this.config.processingTimeoutMs)
    );

    try {
      return await Promise.race([
        this.processDocument(profileId, file, options),
        timeoutPromise
      ]);
    } catch (error) {
      // Preserve specific error types
      if (error instanceof TimeoutError || error instanceof ValidationError || 
          error instanceof StorageLimitError || error instanceof EmbeddingError) {
        throw error;
      }
      
      // ProcessingError can be thrown directly or wrapped
      if (error instanceof ProcessingError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ProcessingError(`Document upload failed: ${errorMessage}`);
    }
  }

  /**
   * Internal method to process document (with rollback on failure)
   */
  private async processDocument(
    profileId: string,
    file: FileUpload,
    options?: ProcessingOptions
  ): Promise<KnowledgeDocument> {
    const documentId = uuidv4();
    const startTime = Date.now();
    
    // Calculate file extension
    const ext = this.getFileExtension(file.mimeType, file.filename);
    const documentDir = path.join(this.config.storagePath, profileId, documentId);
    const filePath = path.join(documentDir, `original${ext}`);

    let filesystemCreated = false;
    let mongoCreated = false;
    let chromaCreated = false;
    const chunkIds: string[] = [];

    try {
      // Step 1: Save file to filesystem
      await this.fs.mkdir(documentDir, { recursive: true });
      await this.fs.writeFile(filePath, file.buffer);
      filesystemCreated = true;

      // Step 2: Extract text
      const extractStart = Date.now();
      const text = await this.documentProcessor.extractText(filePath, file.mimeType);
      const extractionTimeMs = Date.now() - extractStart;

      // Step 3: Chunk text
      const chunkStart = Date.now();
      const chunks = await this.documentProcessor.chunkText(text, {
        maxTokens: options?.chunkSize || this.config.chunkSizeTokens,
        overlapTokens: options?.chunkOverlap || this.config.chunkOverlapTokens
      });
      const chunkingTimeMs = Date.now() - chunkStart;

      // Step 4: Generate embeddings
      const embeddingStart = Date.now();
      const embeddings = await this.documentProcessor.generateEmbeddings(
        chunks.map(c => c.text)
      );
      const embeddingTimeMs = Date.now() - embeddingStart;

      // Step 5: Store in ChromaDB
      const collection = await this.chromaClient.getOrCreateCollection(profileId);
      const chromaChunks = chunks.map((chunk, index) => {
        const chunkId = `${documentId}_chunk_${index}`;
        chunkIds.push(chunkId);
        return {
          id: chunkId,
          document: chunk.text,
          embedding: embeddings[index],
          metadata: {
            documentId,
            profileId,
            filename: file.filename,
            chunkIndex: index,
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
            createdAt: new Date().toISOString()
          }
        };
      });

      await this.chromaClient.addChunks(collection, chromaChunks);
      chromaCreated = true;

      // Step 6: Store metadata in MongoDB
      const knowledgeDocument: Omit<KnowledgeDocument, 'id'> & { _id: string; id: string } = {
        _id: documentId,
        id: documentId, // Store both _id and id for easier querying
        profileId,
        filename: file.filename,
        fileSizeBytes: file.buffer.length,
        mimeType: file.mimeType as 'application/pdf' | 'text/markdown' | 'text/plain',
        filePath,
        uploadedAt: new Date(),
        chunkCount: chunks.length,
        characterCount: text.length,
        chromaCollection: `profile_${profileId}_kb`,
        processingMetadata: {
          extractionTimeMs,
          chunkingTimeMs,
          embeddingTimeMs,
          totalTimeMs: Date.now() - startTime
        }
      };

      const collection_mongo = this.db.collection('knowledge_documents');
      await collection_mongo.insertOne(knowledgeDocument);
      mongoCreated = true;

      // Return the document with id
      return {
        ...knowledgeDocument,
        id: documentId
      } as unknown as KnowledgeDocument;

    } catch (error) {
      // Rollback on failure
      console.error('[KnowledgeBaseService] Upload failed, rolling back:', error);

      try {
        if (chromaCreated && chunkIds.length > 0) {
          const collection = await this.chromaClient.getOrCreateCollection(profileId);
          await this.chromaClient.deleteChunks(collection, chunkIds);
        }
      } catch (rollbackError) {
        console.error('[KnowledgeBaseService] Failed to rollback ChromaDB:', rollbackError);
      }

      try {
        if (mongoCreated) {
          const collection_mongo = this.db.collection('knowledge_documents');
          await collection_mongo.deleteOne({ _id: documentId });
        }
      } catch (rollbackError) {
        console.error('[KnowledgeBaseService] Failed to rollback MongoDB:', rollbackError);
      }

      try {
        if (filesystemCreated) {
          await this.fs.rm(documentDir, { recursive: true, force: true });
        }
      } catch (rollbackError) {
        console.error('[KnowledgeBaseService] Failed to rollback filesystem:', rollbackError);
      }

      // Re-throw original error
      throw error;
    }
  }

  /**
   * List all documents for a profile
   * 
   * @param profileId - Profile identifier
   * @returns Array of knowledge documents
   */
  async listDocuments(profileId: string): Promise<KnowledgeDocument[]> {
    if (!profileId || typeof profileId !== 'string') {
      throw new ValidationError('profileId is required and must be a string');
    }

    const collection = this.db.collection('knowledge_documents');
    const docs = await collection
      .find({ profileId })
      .sort({ uploadedAt: -1 })
      .toArray();

    return docs.map(doc => this.mapMongoDocToKnowledgeDoc(doc as Record<string, unknown>));
  }

  /**
   * Delete a document from all systems
   * 
   * @param documentId - Document identifier
   */
  async deleteDocument(documentId: string): Promise<void> {
    const collection = this.db.collection('knowledge_documents');
    const doc = await collection.findOne({ id: documentId });

    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    const knowledgeDoc = this.mapMongoDocToKnowledgeDoc(doc as Record<string, unknown>);

    // Delete from MongoDB
    await collection.deleteOne({ id: documentId });

    // Delete from ChromaDB (best-effort)
    try {
      const chromaCollection = await this.chromaClient.getOrCreateCollection(knowledgeDoc.profileId);
      const chunkIds = Array.from({ length: knowledgeDoc.chunkCount }, (_, i) => 
        `${documentId}_chunk_${i}`
      );
      await this.chromaClient.deleteChunks(chromaCollection, chunkIds);
    } catch (error) {
      console.error('[KnowledgeBaseService] Failed to delete from ChromaDB:', error);
    }

    // Delete from filesystem (best-effort)
    try {
      const documentDir = path.dirname(knowledgeDoc.filePath);
      await this.fs.rm(documentDir, { recursive: true, force: true });
    } catch (error) {
      console.error('[KnowledgeBaseService] Failed to delete from filesystem:', error);
    }
  }

  /**
   * Query knowledge base with semantic search
   * 
   * @param profileId - Profile identifier
   * @param query - Query string
   * @param topK - Number of results to return (default: 5)
   * @returns Array of query results
   */
  async queryKnowledgeBase(
    profileId: string,
    query: string,
    topK = 5
  ): Promise<KnowledgeQueryResult[]> {
    try {
      // Generate query embedding
      const embeddings = await this.documentProcessor.generateEmbeddings([query]);
      const queryEmbedding = embeddings[0];

      // Query ChromaDB
      const collection = await this.chromaClient.getOrCreateCollection(profileId);
      const results = await this.chromaClient.query(collection, queryEmbedding, topK, undefined);

      // Convert to KnowledgeQueryResult
      return results.map(result => ({
        chunkId: result.id,
        documentId: (result.metadata.documentId as string) || '',
        filename: (result.metadata.filename as string) || '',
        chunkIndex: (result.metadata.chunkIndex as number) || 0,
        content: result.document,
        similarity: 1 - result.distance // Convert distance to similarity
      }));
    } catch (error) {
      // Gracefully degrade - return empty array on query errors
      console.error('[KnowledgeBaseService] Query failed:', error);
      return [];
    }
  }

  /**
   * Get total storage used by a profile
   * 
   * @param profileId - Profile identifier
   * @returns Total bytes used
   */
  async getStorageUsed(profileId: string): Promise<number> {
    const collection = this.db.collection('knowledge_documents');
    const result = await collection.aggregate([
      { $match: { profileId } },
      { $group: { _id: null, totalSize: { $sum: '$fileSizeBytes' } } }
    ]).toArray();

    if (result.length === 0 || !result[0]) {
      return 0;
    }

    return (result[0] as { totalSize: number }).totalSize || 0;
  }

  /**
   * Get file extension from MIME type or filename
   */
  private getFileExtension(mimeType: string, filename: string): string {
    if (mimeType === 'application/pdf') return '.pdf';
    if (mimeType === 'text/markdown') return '.md';
    if (mimeType === 'text/plain') return '.txt';
    
    // Fallback to filename extension
    const ext = path.extname(filename);
    return ext || '.bin';
  }

  /**
   * Map MongoDB document to KnowledgeDocument
   */
  private mapMongoDocToKnowledgeDoc(doc: Record<string, unknown>): KnowledgeDocument {
    return {
      id: (doc._id || doc.id) as string,
      profileId: doc.profileId as string,
      filename: doc.filename as string,
      fileSizeBytes: doc.fileSizeBytes as number,
      mimeType: doc.mimeType as 'application/pdf' | 'text/markdown' | 'text/plain',
      filePath: doc.filePath as string,
      uploadedAt: doc.uploadedAt as Date,
      chunkCount: doc.chunkCount as number,
      characterCount: doc.characterCount as number,
      chromaCollection: doc.chromaCollection as string,
      processingMetadata: doc.processingMetadata as KnowledgeDocumentProcessingMetadata
    };
  }
}
