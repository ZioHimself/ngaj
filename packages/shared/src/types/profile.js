import { ObjectId } from 'mongodb';
/**
 * Type guard to check if an object is a valid Profile
 */
export function isProfile(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const p = obj;
    return (p._id instanceof ObjectId &&
        typeof p.name === 'string' &&
        typeof p.voice === 'object' &&
        typeof p.discovery === 'object' &&
        p.createdAt instanceof Date &&
        p.updatedAt instanceof Date &&
        typeof p.isActive === 'boolean');
}
//# sourceMappingURL=profile.js.map