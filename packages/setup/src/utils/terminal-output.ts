/**
 * Terminal Output Utilities
 *
 * Utilities for formatting terminal output during application startup.
 * Handles display of network URLs, login codes, and status messages.
 *
 * @see ADR-011: Installation and Setup Architecture (Sections 6 and 7)
 * @see ADR-021: Installation Clipboard Experience
 * @see 010-network-access-display-handoff.md (Section 2.4)
 * @see 012-application-launcher-handoff.md
 */

import type { LoginCodeResult } from './login-code-reader.js';

/**
 * Options for formatting login code with visual emphasis
 */
export interface FormatLoginCodeEmphasisOptions {
  /** The login code to display */
  loginCode: string;
  /** Whether the clipboard copy operation succeeded */
  clipboardSuccess: boolean;
}

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
export function formatNetworkAccessDisplay(options: FormatNetworkAccessOptions): string {
  const { lanIP, port } = options;
  const lines: string[] = [];

  // Header
  lines.push('✓ Backend running');
  lines.push('');

  // Local access URL (always shown)
  lines.push(`  Local access:   http://localhost:${port}`);

  // Network access URL (only if IP available)
  if (lanIP) {
    lines.push(`  Network access: http://${lanIP}:${port}`);
    lines.push('  (Use this URL from your mobile device on the same WiFi)');
  }

  return lines.join('\n');
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
export function formatLoginCodeDisplay(loginCode: string): string {
  // Handle empty or whitespace-only login codes
  if (!loginCode || !loginCode.trim()) {
    return '';
  }

  const lines: string[] = [];
  lines.push(`  Login code: ${loginCode}`);
  lines.push('  (Enter this code when prompted in your browser)');

  return lines.join('\n');
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
export function formatStatusDisplay(options: FormatStatusDisplayOptions): string {
  const { lanIP, loginCode, port } = options;

  // Get network access display
  const networkDisplay = formatNetworkAccessDisplay({ lanIP, port });

  // Get login code display
  const loginCodeDisplay = formatLoginCodeDisplay(loginCode);

  // Combine with proper spacing
  if (loginCodeDisplay) {
    return `${networkDisplay}\n\n${loginCodeDisplay}`;
  }

  return networkDisplay;
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
export async function createTerminalOutput(options: CreateTerminalOutputOptions): Promise<string> {
  const { getLanIP, readLoginCode, port } = options;

  // Fetch data in parallel for efficiency
  const [lanIP, loginCodeResult] = await Promise.all([getLanIP(), readLoginCode()]);

  // Extract login code from result
  const loginCode = loginCodeResult.success ? loginCodeResult.loginCode : '';

  // Format and return
  return formatStatusDisplay({ lanIP, loginCode, port });
}

/**
 * Emphasis line character for visual emphasis box
 */
const EMPHASIS_LINE = '═══════════════════════════════════════';

/**
 * Format login code with visual emphasis box
 *
 * Displays:
 * ```
 * ═══════════════════════════════════════
 *   LOGIN CODE:  A1B2-C3D4-E5F6-G7H8
 * ═══════════════════════════════════════
 *   ✓ Copied to clipboard
 * ```
 *
 * @param options - Options including login code and clipboard status
 * @returns Formatted output string, empty string if login code is empty/whitespace
 *
 * @see ADR-021: Installation Clipboard Experience
 */
export function formatLoginCodeWithEmphasis(options: FormatLoginCodeEmphasisOptions): string {
  const { loginCode, clipboardSuccess } = options;

  // Handle empty or whitespace-only login codes
  if (!loginCode || !loginCode.trim()) {
    return '';
  }

  const lines: string[] = [];

  // Top emphasis line
  lines.push(EMPHASIS_LINE);

  // Login code with label
  lines.push(`  LOGIN CODE:  ${loginCode}`);

  // Bottom emphasis line
  lines.push(EMPHASIS_LINE);

  // Clipboard success message (only if clipboard succeeded)
  if (clipboardSuccess) {
    lines.push('  ✓ Copied to clipboard');
  }

  return lines.join('\n');
}
