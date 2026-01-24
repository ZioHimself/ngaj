/**
 * Express Session Type Augmentation
 *
 * Extends express-session with custom session data.
 * @see ADR-014: Simple Token Authentication
 */

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    /** Whether the user has authenticated with the login secret */
    authenticated?: boolean;
  }
}
