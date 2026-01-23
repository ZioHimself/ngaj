import { ObjectId } from 'mongodb';
/**
 * Type guard to check if an object is a valid Response
 */
export function isResponse(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const r = obj;
    return (r._id instanceof ObjectId &&
        r.opportunityId instanceof ObjectId &&
        r.accountId instanceof ObjectId &&
        typeof r.text === 'string' &&
        typeof r.status === 'string' &&
        ['draft', 'posted', 'dismissed'].includes(r.status) &&
        r.generatedAt instanceof Date &&
        (r.postedAt === undefined || r.postedAt instanceof Date) &&
        (r.dismissedAt === undefined || r.dismissedAt instanceof Date) &&
        typeof r.metadata === 'object' &&
        typeof r.version === 'number' &&
        r.updatedAt instanceof Date &&
        (r.platformPostId === undefined || typeof r.platformPostId === 'string') &&
        (r.platformPostUrl === undefined || typeof r.platformPostUrl === 'string'));
}
/**
 * Type guard to check if an object is a valid OpportunityAnalysis
 */
export function isOpportunityAnalysis(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const a = obj;
    return (typeof a.mainTopic === 'string' &&
        Array.isArray(a.keywords) &&
        a.keywords.every((k) => typeof k === 'string') &&
        typeof a.domain === 'string' &&
        typeof a.question === 'string');
}
//# sourceMappingURL=response.js.map