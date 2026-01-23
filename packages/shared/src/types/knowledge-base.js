/**
 * Knowledge Base Type Definitions
 *
 * These types support the Knowledge Base feature which enables users to upload
 * reference materials (PDFs, Markdown, TXT files) that ground AI-generated responses.
 *
 * @see {@link ../../../docs/architecture/decisions/007-knowledge-base-implementation.md} - Design rationale
 * @see {@link ../../../.agents/artifacts/designer/designs/knowledge-base-design.md} - Complete technical specification
 */
/**
 * Knowledge Base error types
 */
export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
export class StorageLimitError extends Error {
    constructor(message) {
        super(message);
        this.name = 'StorageLimitError';
    }
}
export class ProcessingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ProcessingError';
    }
}
export class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TimeoutError';
    }
}
export class ExtractionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ExtractionError';
    }
}
export class EmbeddingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EmbeddingError';
    }
}
export class DeletionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DeletionError';
    }
}
export class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}
//# sourceMappingURL=knowledge-base.js.map