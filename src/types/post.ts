/**
 * Represents a social media post from any platform
 */
export interface Post {
    /** Unique identifier for the post */
    id: string;
    
    /** Platform where the post originated */
    platform: 'bluesky' | 'twitter' | 'reddit' | 'linkedin';
    
    /** Platform-specific post ID */
    platformPostId: string;
    
    /** Post content/text */
    content: string;
    
    /** Post author information */
    author: Author;
    
    /** Engagement metrics */
    metrics: PostMetrics;
    
    /** When the post was created */
    createdAt: Date;
    
    /** URL to the post */
    url?: string;
    
    /** If this is a reply, the parent post ID */
    inReplyTo?: string;
    
    /** If part of a thread, the thread ID */
    threadId?: string;
  }
  
  export interface Author {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    followers?: number;
    verified?: boolean;
  }
  
  export interface PostMetrics {
    likes: number;
    replies: number;
    reposts: number;
    views?: number;
  }