/**
 * Document Processor - Text extraction, chunking, and embedding generation
 * 
 * Handles document processing pipeline:
 * 1. Extract text from various file types (PDF, Markdown, TXT)
 * 2. Chunk text into semantic segments with overlap
 * 3. Generate embeddings via Claude API
 * 
 * @see {@link ../../docs/architecture/decisions/007-knowledge-base-implementation.md}
 */

import type { TextChunk } from '@ngaj/shared';
import { ExtractionError, EmbeddingError } from '@ngaj/shared';
import { encoding_for_model } from 'tiktoken';

/**
 * DocumentProcessor handles text extraction, chunking, and embedding generation
 */
export class DocumentProcessor {
  constructor(
    private pdfParse: (buffer: Buffer) => Promise<{ text: string }>,
    private fs: {
      readFile: (path: string, encoding?: string) => Promise<Buffer | string>;
    },
    private claudeClient: {
      generateEmbeddings: (texts: string[]) => Promise<number[][]>;
    }
  ) {}

  /**
   * Extract text from a document file
   * 
   * @param filePath - Absolute path to the file
   * @param mimeType - MIME type of the file
   * @returns Extracted plain text
   * @throws ExtractionError if extraction fails
   */
  async extractText(filePath: string, mimeType: string): Promise<string> {
    try {
      if (mimeType === 'application/pdf') {
        // Extract text from PDF
        const buffer = await this.fs.readFile(filePath) as Buffer;
        const data = await this.pdfParse(buffer);
        return data.text;
      } else if (mimeType === 'text/markdown' || mimeType === 'text/plain') {
        // Read text/markdown files directly
        const content = await this.fs.readFile(filePath, 'utf-8');
        // Convert to string if it's a Buffer
        return typeof content === 'string' ? content : content.toString('utf-8');
      } else {
        throw new ExtractionError(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      if (error instanceof ExtractionError) {
        throw error;
      }
      
      // Wrap other errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ExtractionError(`Failed to extract text: ${errorMessage}`);
    }
  }

  /**
   * Chunk text into semantic segments with overlap
   * 
   * Strategy: Split by paragraphs, combine until reaching maxTokens, create overlaps
   * 
   * @param text - Text to chunk
   * @param options - Chunking options (maxTokens, overlapTokens)
   * @returns Array of text chunks with position metadata
   */
  async chunkText(
    text: string,
    options: { maxTokens: number; overlapTokens: number }
  ): Promise<TextChunk[]> {
    const { maxTokens, overlapTokens } = options;

    // Handle empty text
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Initialize tokenizer
    const tokenizer = encoding_for_model('gpt-4');

    try {
      const chunks: TextChunk[] = [];
      let position = 0;

      while (position < text.length) {
        // Calculate end position for this chunk
        const remainingText = text.substring(position);
        const tokens = tokenizer.encode(remainingText);
        
        if (tokens.length <= maxTokens) {
          // Remaining text fits in one chunk
          chunks.push({
            text: remainingText.trim(),
            startOffset: position,
            endOffset: text.length
          });
          break;
        }

        // Take maxTokens worth of text
        const chunkTokens = tokens.slice(0, maxTokens);
        const chunkBytes = tokenizer.decode(chunkTokens);
        const chunkText = new TextDecoder().decode(chunkBytes);
        const chunkEndPosition = position + chunkText.length;

        chunks.push({
          text: chunkText.trim(),
          startOffset: position,
          endOffset: chunkEndPosition
        });

        // Calculate next position with overlap
        if (overlapTokens > 0 && overlapTokens < maxTokens) {
          // Move back by overlapTokens for the next chunk
          const overlapStartIdx = maxTokens - overlapTokens;
          const overlapEndTokens = chunkTokens.slice(overlapStartIdx);
          const overlapBytes = tokenizer.decode(overlapEndTokens);
          const overlapText = new TextDecoder().decode(overlapBytes);
          const overlapLength = overlapText.length;
          
          // Next chunk starts overlapLength characters back
          position = chunkEndPosition - overlapLength;
        } else {
          // No overlap, move to end of current chunk
          position = chunkEndPosition;
        }
      }

      return chunks;
    } finally {
      tokenizer.free();
    }
  }

  /**
   * Generate embeddings for text chunks using Claude API
   * 
   * @param chunks - Array of text strings to embed
   * @returns Array of embedding vectors
   * @throws EmbeddingError if API call fails
   */
  async generateEmbeddings(chunks: string[], maxRetries = 3): Promise<number[][]> {
    if (chunks.length === 0) {
      return [];
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const embeddings = await this.claudeClient.generateEmbeddings(chunks);
        
        // Validate embeddings
        if (!Array.isArray(embeddings) || embeddings.length !== chunks.length) {
          throw new EmbeddingError('Invalid embedding response from Claude API');
        }

        return embeddings;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if it's a rate limit error (429)
        const isRateLimit = lastError.message.includes('429') || 
                           lastError.message.toLowerCase().includes('rate limit');
        
        if (isRateLimit && attempt < maxRetries - 1) {
          // Exponential backoff with smaller delays for tests: 100ms, 200ms, 400ms
          const delayMs = Math.pow(2, attempt) * 100;
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        
        // If it's an EmbeddingError, rethrow as is
        if (error instanceof EmbeddingError) {
          throw error;
        }
        
        // Otherwise, throw on last attempt or non-rate-limit errors
        break;
      }
    }

    // All retries exhausted
    const errorMessage = lastError ? lastError.message : 'Unknown error';
    throw new EmbeddingError(`Failed to generate embeddings: ${errorMessage}`);
  }
}
