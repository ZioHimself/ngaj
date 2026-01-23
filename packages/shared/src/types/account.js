import { ObjectId } from 'mongodb';
/**
 * Type guard to check if an object is a valid Account
 */
export function isAccount(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const a = obj;
    return (a._id instanceof ObjectId &&
        a.profileId instanceof ObjectId &&
        typeof a.platform === 'string' &&
        ['bluesky', 'linkedin', 'reddit'].includes(a.platform) &&
        typeof a.handle === 'string' &&
        typeof a.discovery === 'object' &&
        typeof a.status === 'string' &&
        ['active', 'paused', 'error'].includes(a.status) &&
        a.createdAt instanceof Date &&
        a.updatedAt instanceof Date);
}
//# sourceMappingURL=account.js.map