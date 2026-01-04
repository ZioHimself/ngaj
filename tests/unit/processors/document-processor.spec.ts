import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DocumentProcessor } from '@/backend/processors/document-processor';
import {
  mockExtractedText,
  createMockEmbedding
} from '../../fixtures/knowledge-base-fixtures';
import { ExtractionError, EmbeddingError } from '@/shared/types/knowledge-base';

describe('DocumentProcessor', () => {
  let processor: DocumentProcessor;
  let mockPdfParse: ReturnType<typeof vi.fn>; 
  let mockFs: Record<string, ReturnType<typeof vi.fn>>;
  let mockClaudeClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    // Mock pdf-parse
    mockPdfParse = vi.fn();

    // Mock filesystem
    mockFs = {
      readFile: vi.fn()
    };

    // Mock Claude API client
    mockClaudeClient = {
      generateEmbeddings: vi.fn()
    };

    processor = new DocumentProcessor(mockPdfParse, mockFs, mockClaudeClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('extractText()', () => {
    it('should extract text from PDF file', async () => {
      // Arrange
      const filePath = '/tmp/test.pdf';
      const mimeType = 'application/pdf';
      const mockBuffer = Buffer.from('PDF content');
      const mockPdfData = { text: 'Extracted PDF text' };

      mockFs.readFile.mockResolvedValue(mockBuffer);
      mockPdfParse.mockResolvedValue(mockPdfData);

      // Act
      const result = await processor.extractText(filePath, mimeType);

      // Assert
      expect(result).toBe('Extracted PDF text');
      expect(mockFs.readFile).toHaveBeenCalledWith(filePath);
      expect(mockPdfParse).toHaveBeenCalledWith(mockBuffer);
    });

    it('should extract text from Markdown file', async () => {
      // Arrange
      const filePath = '/tmp/test.md';
      const mimeType = 'text/markdown';
      const mockContent = '# Title\n\nContent here';

      mockFs.readFile.mockResolvedValue(Buffer.from(mockContent));

      // Act
      const result = await processor.extractText(filePath, mimeType);

      // Assert
      expect(result).toBe(mockContent);
      expect(mockFs.readFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });

    it('should extract text from TXT file', async () => {
      // Arrange
      const filePath = '/tmp/test.txt';
      const mimeType = 'text/plain';
      const mockContent = 'Plain text content';

      mockFs.readFile.mockResolvedValue(Buffer.from(mockContent));

      // Act
      const result = await processor.extractText(filePath, mimeType);

      // Assert
      expect(result).toBe(mockContent);
      expect(mockFs.readFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });

    it('should throw ExtractionError for corrupt PDF', async () => {
      // Arrange
      const filePath = '/tmp/corrupt.pdf';
      const mimeType = 'application/pdf';
      const mockBuffer = Buffer.from('Not a PDF');

      mockFs.readFile.mockResolvedValue(mockBuffer);
      mockPdfParse.mockRejectedValue(new Error('Failed to parse PDF'));

      // Act & Assert
      await expect(processor.extractText(filePath, mimeType)).rejects.toThrow(ExtractionError);
      await expect(processor.extractText(filePath, mimeType)).rejects.toThrow(
        'Failed to extract text'
      );
    });

    it('should throw ExtractionError for password-protected PDF', async () => {
      // Arrange
      const filePath = '/tmp/protected.pdf';
      const mimeType = 'application/pdf';
      const mockBuffer = Buffer.from('Protected PDF');

      mockFs.readFile.mockResolvedValue(mockBuffer);
      mockPdfParse.mockRejectedValue(new Error('Password protected'));

      // Act & Assert
      await expect(processor.extractText(filePath, mimeType)).rejects.toThrow(ExtractionError);
    });

    it('should throw ExtractionError when file not found', async () => {
      // Arrange
      const filePath = '/tmp/nonexistent.pdf';
      const mimeType = 'application/pdf';

      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

      // Act & Assert
      await expect(processor.extractText(filePath, mimeType)).rejects.toThrow(ExtractionError);
    });
  });

  describe('chunkText()', () => {
    it('should respect paragraph boundaries', async () => {
      // Arrange
      const text = mockExtractedText.multipleParagraphs;
      const options = { maxTokens: 500, overlapTokens: 50 };

      // Act
      const result = await processor.chunkText(text, options);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(Array.isArray(result)).toBe(true);
      result.forEach(chunk => {
        expect(chunk).toHaveProperty('text');
        expect(chunk).toHaveProperty('startOffset');
        expect(chunk).toHaveProperty('endOffset');
      });
    });

    it('should handle single paragraph document', async () => {
      // Arrange
      const text = mockExtractedText.shortParagraph;
      const options = { maxTokens: 500, overlapTokens: 50 };

      // Act
      const result = await processor.chunkText(text, options);

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].text).toBe(text);
      expect(result[0].startOffset).toBe(0);
      expect(result[0].endOffset).toBe(text.length);
    });

    it('should split long paragraph at token limit', async () => {
      // Arrange
      const text = mockExtractedText.longParagraph;
      const options = { maxTokens: 100, overlapTokens: 10 };

      // Act
      const result = await processor.chunkText(text, options);

      // Assert
      expect(result.length).toBeGreaterThan(1);
      result.forEach(chunk => {
        // Each chunk should be reasonably sized (not the entire long paragraph)
        expect(chunk.text.length).toBeLessThan(text.length);
      });
    });

    it('should create overlap between chunks', async () => {
      // Arrange
      const text = mockExtractedText.longParagraph;
      const options = { maxTokens: 100, overlapTokens: 20 };

      // Act
      const result = await processor.chunkText(text, options);

      // Assert
      if (result.length > 1) {
        // Check that end of one chunk overlaps with start of next
        const firstChunkEnd = result[0].endOffset;
        const secondChunkStart = result[1].startOffset;
        expect(secondChunkStart).toBeLessThan(firstChunkEnd);
      }
    });

    it('should return empty array for empty text', async () => {
      // Arrange
      const text = mockExtractedText.empty;
      const options = { maxTokens: 500, overlapTokens: 50 };

      // Act
      const result = await processor.chunkText(text, options);

      // Assert
      expect(result).toEqual([]);
    });

    it('should include startOffset and endOffset metadata', async () => {
      // Arrange
      const text = mockExtractedText.multipleParagraphs;
      const options = { maxTokens: 500, overlapTokens: 50 };

      // Act
      const result = await processor.chunkText(text, options);

      // Assert
      result.forEach((chunk) => {
        expect(chunk.startOffset).toBeDefined();
        expect(chunk.endOffset).toBeDefined();
        expect(chunk.startOffset).toBeGreaterThanOrEqual(0);
        expect(chunk.endOffset).toBeLessThanOrEqual(text.length);
        expect(chunk.endOffset).toBeGreaterThan(chunk.startOffset);
        
        // Text should match the slice
        expect(text.slice(chunk.startOffset, chunk.endOffset)).toContain(chunk.text.substring(0, 10));
      });
    });

    it('should handle code blocks in markdown', async () => {
      // Arrange
      const text = mockExtractedText.withCodeBlocks;
      const options = { maxTokens: 500, overlapTokens: 50 };

      // Act
      const result = await processor.chunkText(text, options);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      // Code blocks should be preserved in chunks
      const hasCodeBlock = result.some(chunk => chunk.text.includes('```'));
      expect(hasCodeBlock).toBe(true);
    });

    it('should handle non-English text', async () => {
      // Arrange
      const text = mockExtractedText.nonEnglish;
      const options = { maxTokens: 500, overlapTokens: 50 };

      // Act
      const result = await processor.chunkText(text, options);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].text).toContain('これは');
    });
  });

  describe('generateEmbeddings()', () => {
    it('should return embeddings for chunks', async () => {
      // Arrange
      const chunks = ['First chunk', 'Second chunk'];
      const mockEmbeddings = [createMockEmbedding(), createMockEmbedding()];

      mockClaudeClient.generateEmbeddings.mockResolvedValue(mockEmbeddings);

      // Act
      const result = await processor.generateEmbeddings(chunks);

      // Assert
      expect(result).toEqual(mockEmbeddings);
      expect(result.length).toBe(chunks.length);
      expect(mockClaudeClient.generateEmbeddings).toHaveBeenCalledWith(chunks);
    });

    it('should handle batch of chunks', async () => {
      // Arrange
      const chunks = Array.from({ length: 10 }, (_, i) => `Chunk ${i + 1}`);
      const mockEmbeddings = Array.from({ length: 10 }, () => createMockEmbedding());

      mockClaudeClient.generateEmbeddings.mockResolvedValue(mockEmbeddings);

      // Act
      const result = await processor.generateEmbeddings(chunks);

      // Assert
      expect(result.length).toBe(10);
      expect(mockClaudeClient.generateEmbeddings).toHaveBeenCalledOnce();
    });

    it('should throw EmbeddingError on Claude API rate limit', async () => {
      // Arrange
      const chunks = ['Test chunk'];

      mockClaudeClient.generateEmbeddings.mockRejectedValue(
        new Error('Rate limit exceeded (429)')
      );

      // Act & Assert
      await expect(processor.generateEmbeddings(chunks)).rejects.toThrow(EmbeddingError);
      await expect(processor.generateEmbeddings(chunks)).rejects.toThrow(
        'Failed to generate embeddings'
      );
    });

    it('should retry with exponential backoff on rate limit', async () => {
      // Arrange
      const chunks = ['Test chunk'];
      const mockEmbedding = [createMockEmbedding()];

      // Fail twice, then succeed
      mockClaudeClient.generateEmbeddings
        .mockRejectedValueOnce(new Error('Rate limit exceeded (429)'))
        .mockRejectedValueOnce(new Error('Rate limit exceeded (429)'))
        .mockResolvedValueOnce(mockEmbedding);

      // Act
      const result = await processor.generateEmbeddings(chunks);

      // Assert
      expect(result).toEqual(mockEmbedding);
      expect(mockClaudeClient.generateEmbeddings).toHaveBeenCalledTimes(3);
    });

    it('should handle empty chunks array', async () => {
      // Arrange
      const chunks: string[] = [];

      mockClaudeClient.generateEmbeddings.mockResolvedValue([]);

      // Act
      const result = await processor.generateEmbeddings(chunks);

      // Assert
      expect(result).toEqual([]);
    });

    it('should validate embedding dimensions', async () => {
      // Arrange
      const chunks = ['Test chunk'];
      const mockEmbeddings = [createMockEmbedding()];

      mockClaudeClient.generateEmbeddings.mockResolvedValue(mockEmbeddings);

      // Act
      const result = await processor.generateEmbeddings(chunks);

      // Assert
      expect(result[0].length).toBeGreaterThan(0);
      expect(typeof result[0][0]).toBe('number');
    });
  });
});

