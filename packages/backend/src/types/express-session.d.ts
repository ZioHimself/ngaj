/**
 * Express Session Type Augmentation
 *
 * Adds authentication flag to session data.
 * @see ADR-014: Simple Token Authentication
 */

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    /** Whether the user has authenticated with the login code */
    authenticated?: boolean;
  }
}
