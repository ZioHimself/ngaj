import type {
  KnowledgeDocument,
  FileUpload,
  TextChunk,
  KnowledgeQueryResult,
  KnowledgeDocumentProcessingMetadata
} from '@/shared/types/knowledge-base';

/**
 * Factory function to create a valid KnowledgeDocument for testing
 */
export const createMockDocument = (
  overrides?: Partial<KnowledgeDocument>
): KnowledgeDocument => ({
  id: 'doc-abc-123',
  profileId: 'profile-xyz-789',
  filename: 'test-document.pdf',
  fileSizeBytes: 1024 * 100, // 100KB
  mimeType: 'application/pdf',
  filePath: '/tmp/knowledge/profile-xyz-789/doc-abc-123/original.pdf',
  uploadedAt: new Date('2026-01-01T12:00:00Z'),
  chunkCount: 5,
  characterCount: 2500,
  chromaCollection: 'profile_profile-xyz-789_kb',
  processingMetadata: {
    extractionTimeMs: 100,
    chunkingTimeMs: 50,
    embeddingTimeMs: 200,
    totalTimeMs: 350
  },
  ...overrides
});

/**
 * Factory function to create a valid FileUpload for testing
 */
export const createMockFileUpload = (
  overrides?: Partial<FileUpload>
): FileUpload => ({
  buffer: Buffer.from('Mock PDF content'),
  filename: 'test-document.pdf',
  mimeType: 'application/pdf',
  ...overrides
});

/**
 * Factory function to create a TextChunk with offsets
 */
export const createMockTextChunk = (
  overrides?: Partial<TextChunk>
): TextChunk => ({
  text: 'This is a sample text chunk for testing purposes.',
  startOffset: 0,
  endOffset: 50,
  ...overrides
});

/**
 * Factory function to create a KnowledgeQueryResult
 */
export const createMockQueryResult = (
  overrides?: Partial<KnowledgeQueryResult>
): KnowledgeQueryResult => ({
  chunkId: 'doc-abc-123_chunk_0',
  documentId: 'doc-abc-123',
  filename: 'test-document.pdf',
  chunkIndex: 0,
  content: 'This is a sample text chunk for testing purposes.',
  similarity: 0.85,
  ...overrides
});

/**
 * Factory function to create processing metadata
 */
export const createMockProcessingMetadata = (
  overrides?: Partial<KnowledgeDocumentProcessingMetadata>
): KnowledgeDocumentProcessingMetadata => ({
  extractionTimeMs: 100,
  chunkingTimeMs: 50,
  embeddingTimeMs: 200,
  totalTimeMs: 350,
  ...overrides
});

/**
 * Pre-configured document fixtures for common test scenarios
 */
export const createDocumentFixtures = (profileId: string) => ({
  /**
   * Standard PDF document
   */
  pdfDocument: createMockDocument({
    id: 'doc-pdf-001',
    profileId,
    filename: 'research-paper.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1024 * 500, // 500KB
    characterCount: 12000,
    chunkCount: 24
  }),

  /**
   * Markdown document
   */
  markdownDocument: createMockDocument({
    id: 'doc-md-001',
    profileId,
    filename: 'notes.md',
    mimeType: 'text/markdown',
    fileSizeBytes: 1024 * 50, // 50KB
    characterCount: 3000,
    chunkCount: 6
  }),

  /**
   * Plain text document
   */
  txtDocument: createMockDocument({
    id: 'doc-txt-001',
    profileId,
    filename: 'meeting-notes.txt',
    mimeType: 'text/plain',
    fileSizeBytes: 1024 * 10, // 10KB
    characterCount: 800,
    chunkCount: 2
  }),

  /**
   * Large document near size limit
   */
  largeDocument: createMockDocument({
    id: 'doc-large-001',
    profileId,
    filename: 'large-manual.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1024 * 1024 * 9, // 9MB
    characterCount: 50000,
    chunkCount: 100
  }),

  /**
   * Small document with single paragraph
   */
  smallDocument: createMockDocument({
    id: 'doc-small-001',
    profileId,
    filename: 'short-note.txt',
    mimeType: 'text/plain',
    fileSizeBytes: 256, // 256 bytes
    characterCount: 200,
    chunkCount: 1
  }),

  /**
   * Document uploaded recently
   */
  recentDocument: createMockDocument({
    id: 'doc-recent-001',
    profileId,
    filename: 'recent-upload.pdf',
    uploadedAt: new Date() // Now
  })
});

/**
 * Invalid file uploads for validation testing
 */
export const createInvalidUploads = () => ({
  /**
   * Oversized file (exceeds 10MB limit)
   */
  oversizedFile: createMockFileUpload({
    filename: 'huge-document.pdf',
    buffer: Buffer.alloc(1024 * 1024 * 11), // 11MB
    mimeType: 'application/pdf'
  }),

  /**
   * Invalid MIME type
   */
  invalidMimeType: createMockFileUpload({
    filename: 'document.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }),

  /**
   * Empty file
   */
  emptyFile: createMockFileUpload({
    filename: 'empty.txt',
    buffer: Buffer.from(''),
    mimeType: 'text/plain'
  }),

  /**
   * Corrupt PDF (invalid content)
   */
  corruptPdf: createMockFileUpload({
    filename: 'corrupt.pdf',
    buffer: Buffer.from('Not a valid PDF content'),
    mimeType: 'application/pdf'
  }),

  /**
   * Missing filename
   */
  missingFilename: {
    buffer: Buffer.from('Content'),
    filename: '',
    mimeType: 'text/plain'
  } as FileUpload
});

/**
 * Mock text content for extraction testing
 */
export const mockExtractedText = {
  /**
   * Short paragraph
   */
  shortParagraph: 'This is a short paragraph for testing purposes. It contains a single sentence.',

  /**
   * Multiple paragraphs
   */
  multipleParagraphs: `This is the first paragraph with some content about knowledge management.

This is the second paragraph discussing document processing and chunking strategies.

This is the third paragraph covering semantic search and embeddings.`,

  /**
   * Long paragraph (exceeds chunk size)
   */
  longParagraph: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100),

  /**
   * Empty text
   */
  empty: '',

  /**
   * Code blocks in markdown
   */
  withCodeBlocks: `# Technical Documentation

Here's a code example:

\`\`\`typescript
function example() {
  return "test";
}
\`\`\`

This is the explanation after the code.`,

  /**
   * Non-English text
   */
  nonEnglish: 'これは日本語のテキストです。테스트 텍스트입니다. Ceci est un texte en français.'
};

/**
 * Mock text chunks for chunking tests
 */
export const createMockChunks = (_documentId: string) => [
  createMockTextChunk({
    text: 'First chunk of text content.',
    startOffset: 0,
    endOffset: 28
  }),
  createMockTextChunk({
    text: 'Second chunk with overlap from first.',
    startOffset: 20,
    endOffset: 57
  }),
  createMockTextChunk({
    text: 'Third and final chunk.',
    startOffset: 50,
    endOffset: 72
  })
];

/**
 * Mock embeddings (768-dimensional vectors)
 */
export const createMockEmbedding = (): number[] => {
  return Array.from({ length: 768 }, () => Math.random());
};

/**
 * Mock query results for search tests
 */
export const createMockQueryResults = (documentId: string, filename: string): KnowledgeQueryResult[] => [
  createMockQueryResult({
    chunkId: `${documentId}_chunk_0`,
    documentId,
    filename,
    chunkIndex: 0,
    content: 'Highly relevant content matching the query.',
    similarity: 0.92
  }),
  createMockQueryResult({
    chunkId: `${documentId}_chunk_3`,
    documentId,
    filename,
    chunkIndex: 3,
    content: 'Somewhat relevant content with partial match.',
    similarity: 0.78
  }),
  createMockQueryResult({
    chunkId: `${documentId}_chunk_1`,
    documentId,
    filename,
    chunkIndex: 1,
    content: 'Less relevant but still returned in top K.',
    similarity: 0.65
  })
];

/**
 * Helper to create multiple documents for bulk operations
 */
export const createMockDocuments = (
  profileId: string,
  count: number
): KnowledgeDocument[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockDocument({
      id: `doc-${i + 1}`,
      profileId,
      filename: `document-${i + 1}.pdf`,
      uploadedAt: new Date(Date.now() - i * 1000 * 60 * 60) // Stagger upload times
    })
  );
};

/**
 * Helper to calculate total storage for documents
 */
export const calculateTotalStorage = (documents: KnowledgeDocument[]): number => {
  return documents.reduce((total, doc) => total + doc.fileSizeBytes, 0);
};

/**
 * File type fixtures
 */
export const fileTypes = {
  supported: ['application/pdf', 'text/markdown', 'text/plain'],
  unsupported: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'image/jpeg',
    'video/mp4'
  ]
};

/**
 * Storage limit scenarios
 */
export const storageLimitScenarios = {
  /**
   * Under limit (70MB used, 100MB limit)
   */
  underLimit: {
    currentUsageBytes: 1024 * 1024 * 70, // 70MB
    maxStorageBytes: 1024 * 1024 * 100, // 100MB
    canUpload: true
  },

  /**
   * At limit (100MB used, 100MB limit)
   */
  atLimit: {
    currentUsageBytes: 1024 * 1024 * 100, // 100MB
    maxStorageBytes: 1024 * 1024 * 100, // 100MB
    canUpload: false
  },

  /**
   * Exceeded limit (110MB used, 100MB limit)
   */
  exceededLimit: {
    currentUsageBytes: 1024 * 1024 * 110, // 110MB
    maxStorageBytes: 1024 * 1024 * 100, // 100MB
    canUpload: false
  },

  /**
   * Near limit (95MB used, 100MB limit, trying to upload 6MB)
   */
  nearLimitWithLargeFile: {
    currentUsageBytes: 1024 * 1024 * 95, // 95MB
    maxStorageBytes: 1024 * 1024 * 100, // 100MB
    fileSize: 1024 * 1024 * 6, // 6MB
    canUpload: false
  }
};

