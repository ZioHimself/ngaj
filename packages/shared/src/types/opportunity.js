import { ObjectId } from 'mongodb';
/**
 * Type guard to check if an object is a valid Opportunity
 */
export function isOpportunity(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const o = obj;
    return (o._id instanceof ObjectId &&
        o.accountId instanceof ObjectId &&
        typeof o.platform === 'string' &&
        ['bluesky', 'linkedin', 'reddit'].includes(o.platform) &&
        typeof o.postId === 'string' &&
        typeof o.postUrl === 'string' &&
        typeof o.content === 'object' &&
        o.authorId instanceof ObjectId &&
        typeof o.engagement === 'object' &&
        typeof o.scoring === 'object' &&
        typeof o.discoveryType === 'string' &&
        ['replies', 'search'].includes(o.discoveryType) &&
        typeof o.status === 'string' &&
        ['pending', 'responded', 'dismissed', 'expired'].includes(o.status) &&
        o.discoveredAt instanceof Date &&
        o.expiresAt instanceof Date &&
        o.updatedAt instanceof Date);
}
/**
 * Type guard to check if an object is a valid Author
 */
export function isAuthor(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const a = obj;
    return (a._id instanceof ObjectId &&
        typeof a.platform === 'string' &&
        ['bluesky', 'linkedin', 'reddit'].includes(a.platform) &&
        typeof a.platformUserId === 'string' &&
        typeof a.handle === 'string' &&
        typeof a.displayName === 'string' &&
        (a.bio === undefined || typeof a.bio === 'string') &&
        typeof a.followerCount === 'number' &&
        a.lastUpdatedAt instanceof Date);
}
//# sourceMappingURL=opportunity.js.map