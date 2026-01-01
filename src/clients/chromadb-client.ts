/**
 * ChromaDB Client - HTTP client wrapper for ChromaDB vector database
 * 
 * Provides CRUD operations for vector collections and semantic search.
 * Uses HTTP client for communication with ChromaDB server.
 * 
 * @see {@link ../../docs/architecture/decisions/004-chromadb-vectors.md}
 */

export interface ChromaCollection {
  name: string;
  id: string;
  metadata?: Record<string, unknown>;
}

export interface ChromaQueryResult {
  id: string;
  document: string;
  metadata: Record<string, unknown>;
  distance: number;
}

interface ChromaAddRequest {
  ids: string[];
  documents: string[];
  embeddings: number[][];
  metadatas?: Record<string, unknown>[];
}

interface ChromaQueryRequest {
  query_embeddings: number[][];
  n_results: number;
  where?: Record<string, unknown>;
}

interface ChromaQueryResponse {
  ids: string[][];
  documents: string[][];
  metadatas: Record<string, unknown>[][];
  distances: number[][];
}

/**
 * ChromaDB HTTP client
 */
export class ChromaDBClient {
  private baseUrl: string;

  constructor(
    private httpClient: {
      get: (url: string) => Promise<{ data: unknown }>;
      post: (url: string, data: unknown) => Promise<{ data: unknown }>;
      delete: (url: string, data?: unknown) => Promise<{ data: unknown }>;
    },
    private config: { host: string; port: number; timeoutMs: number }
  ) {
    this.baseUrl = `http://${config.host}:${config.port}/api/v1`;
  }

  /**
   * Get or create a collection for a profile's knowledge base
   * 
   * @param profileId - Profile identifier
   * @returns Collection object
   */
  async getOrCreateCollection(profileId: string): Promise<ChromaCollection> {
    try {
      const collectionName = `profile_${profileId}_kb`;
      
      // Try to get existing collection
      try {
        const response = await this.withTimeout(
          this.httpClient.get(`${this.baseUrl}/collections/${collectionName}`)
        );
        return response.data as ChromaCollection;
      } catch (error) {
        // Check if it's a timeout error - don't try to create
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('timeout')) {
          throw error;
        }
        
        // Collection doesn't exist, create it
        const createResponse = await this.withTimeout(
          this.httpClient.post(`${this.baseUrl}/collections`, {
            name: collectionName,
            metadata: { profileId }
          })
        );
        return createResponse.data as ChromaCollection;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Preserve timeout errors
      if (errorMessage.includes('timeout')) {
        throw error;
      }
      throw new Error(`ChromaDB connection failed: ${errorMessage}`);
    }
  }

  /**
   * Wrap a promise with timeout
   */
  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), this.config.timeoutMs)
      )
    ]);
  }

  /**
   * Add chunks with embeddings to a collection
   * 
   * @param collection - Target collection
   * @param chunks - Array of chunks with embeddings and metadata
   */
  async addChunks(
    collection: ChromaCollection,
    chunks: Array<{
      id: string;
      document: string;
      embedding: number[];
      metadata: Record<string, unknown>;
    }>
  ): Promise<void> {
    if (chunks.length === 0) {
      return;
    }

    try {
      // ChromaDB API supports batching up to 5000 items
      const batchSize = 5000;
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        const request: ChromaAddRequest = {
          ids: batch.map(c => c.id),
          documents: batch.map(c => c.document),
          embeddings: batch.map(c => c.embedding),
          metadatas: batch.map(c => c.metadata)
        };

        await this.httpClient.post(
          `${this.baseUrl}/collections/${collection.id}/add`,
          request
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to add chunks: ${errorMessage}`);
    }
  }

  /**
   * Query collection for similar chunks
   * 
   * @param collection - Collection to query
   * @param queryEmbedding - Query embedding vector
   * @param topK - Number of results to return
   * @param filter - Optional metadata filter
   * @returns Array of query results
   */
  async query(
    collection: ChromaCollection,
    queryEmbedding: number[],
    topK: number,
    filter?: Record<string, unknown>
  ): Promise<ChromaQueryResult[]> {
    try {
      const request: ChromaQueryRequest = {
        query_embeddings: [queryEmbedding],
        n_results: topK
      };

      if (filter) {
        request.where = filter;
      }

      const response = await this.httpClient.post(
        `${this.baseUrl}/collections/${collection.id}/query`,
        request
      );

      const data = response.data as ChromaQueryResponse;

      // ChromaDB returns results in batched format, flatten for single query
      if (!data.ids || data.ids.length === 0 || !data.ids[0]) {
        return [];
      }

      const results: ChromaQueryResult[] = [];
      const ids = data.ids[0];
      const documents = data.documents[0];
      const metadatas = data.metadatas[0];
      const distances = data.distances[0];

      for (let i = 0; i < ids.length; i++) {
        results.push({
          id: ids[i],
          document: documents[i],
          metadata: metadatas[i],
          distance: distances[i]
        });
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Gracefully handle query errors by returning empty array
      if (errorMessage.includes('Connection') || errorMessage.includes('ECONNREFUSED')) {
        console.error('[ChromaDB] Connection error during query:', errorMessage);
        return [];
      }
      
      throw new Error(`ChromaDB query failed: ${errorMessage}`);
    }
  }

  /**
   * Delete chunks from collection by IDs
   * 
   * @param collection - Target collection
   * @param chunkIds - Array of chunk IDs to delete
   */
  async deleteChunks(
    collection: ChromaCollection,
    chunkIds: string[]
  ): Promise<void> {
    if (chunkIds.length === 0) {
      return;
    }

    try {
      await this.httpClient.post(
        `${this.baseUrl}/collections/${collection.id}/delete`,
        {
          ids: chunkIds
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`ChromaDB deletion failed: ${errorMessage}`);
    }
  }
}
