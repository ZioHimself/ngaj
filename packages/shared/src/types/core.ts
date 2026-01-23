/**
 * Core Type Utilities for ngaj
 * 
 * Provides generic ID types and type guard factories that allow
 * the same type definitions to work in both frontend (string IDs)
 * and backend (ObjectId) contexts.
 * 
 * @module types/core
 */

/**
 * Generic entity ID type.
 * 
 * - Frontend: defaults to `string` (JSON-serialized IDs)
 * - Backend: instantiate with `ObjectId` for MongoDB operations
 * 
 * @example
 * // Frontend usage - just use string default
 * const profile: Profile = { _id: "abc123", ... };
 * 
 * // Backend usage - explicitly use ObjectId
 * type ProfileDocument = Profile<ObjectId>;
 */
export type EntityId<T = string> = T;

/**
 * Type for ID validator functions.
 * Used by type guard factories to validate IDs in environment-specific way.
 */
export type IdValidator<TId> = (value: unknown) => value is TId;

/**
 * Default string ID validator for frontend/API usage.
 * Validates that a value is a non-empty string.
 */
export const isStringId: IdValidator<string> = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

/**
 * Factory function type for creating type guards.
 * Takes an ID validator and returns a type guard for the entity.
 */
export type TypeGuardFactory<TEntity, TId> = (
  isValidId: IdValidator<TId>
) => (obj: unknown) => obj is TEntity;

/**
 * Helper to check if a value is a valid Date object.
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Helper to check if a value is a plain object.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
