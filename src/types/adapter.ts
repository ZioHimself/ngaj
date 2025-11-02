import { Post } from './post';

/**
 * Configuration for social media adapters
 */
export interface AdapterConfig {
  /** API credentials */
  credentials: {
    identifier: string;  // username/email
    password: string;    // or API key
  };
  
  /** Rate limiting configuration */
  rateLimit?: {
    maxRequestsPerMinute: number;
  };
  
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Search options for finding posts
 */
export interface SearchOptions {
  /** Search query string */
  query: string;
  
  /** Maximum number of results */
  limit?: number;
  
  /** Sort order */
  sort?: 'latest' | 'popular' | 'relevant';
  
  /** Language filter */
  language?: string;
  
  /** Date range */
  since?: Date;
  until?: Date;
}

/**
 * Base interface for all social media adapters
 */
export interface SocialAdapter {
  /** Adapter name */
  readonly name: string;
  
  /** Authenticate with the platform */
  authenticate(): Promise<void>;
  
  /** Check if authenticated */
  isAuthenticated(): boolean;
  
  /** Search for posts */
  searchPosts(options: SearchOptions): Promise<Post[]>;
  
  /** Disconnect/cleanup */
  disconnect(): Promise<void>;
}