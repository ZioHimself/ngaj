/**
 * Terminal Output Utilities
 *
 * Utilities for formatting terminal output during application startup.
 * Handles display of network URLs, login codes, and status messages.
 *
 * @see ADR-011: Installation and Setup Architecture (Sections 6 and 7)
 * @see 010-network-access-display-handoff.md (Section 2.4)
 * @see 012-application-launcher-handoff.md
 */

import type { LoginCodeResult } from './login-code-reader.js';

/**
 * Options for formatting network access display
 */
export interface FormatNetworkAccessOptions {
  /** Detected LAN IP address, empty string if not available */
  lanIP: string;
  /** Port number for the backend service */
  port: number;
}

/**
 * Options for formatting full status display
 */
export interface FormatStatusDisplayOptions {
  /** Detected LAN IP address, empty string if not available */
  lanIP: string;
  /** Login code from .env, empty string if not available */
  loginCode: string;
  /** Port number for the backend service */
  port: number;
}

/**
 * Options for creating terminal output
 */
export interface CreateTerminalOutputOptions {
  /** Function to get LAN IP */
  getLanIP: () => Promise<string>;
  /** Function to read login code */
  readLoginCode: () => Promise<LoginCodeResult>;
  /** Port number for the backend service */
  port: number;
}

/**
 * Format the network access display section
 *
 * Shows:
 * - ✓ Backend running
 * - Local access: http://localhost:PORT
 * - Network access: http://IP:PORT (if IP available)
 * - Mobile hint (if IP available)
 *
 * @param options - Options including LAN IP and port
 * @returns Formatted output string
 */
export function formatNetworkAccessDisplay(_options: FormatNetworkAccessOptions): string {
  throw new Error('Not implemented');
}

/**
 * Format the login code display section
 *
 * Shows:
 * - Login code: CODE
 * - Browser hint
 *
 * @param loginCode - The login code to display
 * @returns Formatted output string, empty string if no code
 */
export function formatLoginCodeDisplay(_loginCode: string): string {
  throw new Error('Not implemented');
}

/**
 * Format the full status display with network and login code
 *
 * Combines network access display with login code display.
 * Ensures proper spacing between sections.
 *
 * @param options - Options including LAN IP, login code, and port
 * @returns Formatted output string
 */
export function formatStatusDisplay(_options: FormatStatusDisplayOptions): string {
  throw new Error('Not implemented');
}

/**
 * Create complete terminal output by fetching all required data
 *
 * Orchestrates:
 * 1. LAN IP detection
 * 2. Login code reading
 * 3. Output formatting
 *
 * @param options - Options including data fetching functions
 * @returns Complete formatted terminal output
 */
export async function createTerminalOutput(_options: CreateTerminalOutputOptions): Promise<string> {
  throw new Error('Not implemented');
}
