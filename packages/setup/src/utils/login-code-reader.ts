/**
 * Login Code Reader Utilities
 *
 * Utilities for reading the LOGIN_SECRET from .env file during application startup.
 * The login code is displayed in the terminal for user authentication.
 *
 * @see ADR-011: Installation and Setup Architecture (Section 7.2)
 * @see ADR-014: Simple Token Auth
 * @see 012-application-launcher-handoff.md (Section 1.5)
 */

/**
 * Result from reading login code
 */
export interface LoginCodeResult {
  /** Whether the read operation was successful */
  success: boolean;
  /** The login code if found, empty string otherwise */
  loginCode: string;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Options for readLoginCode function
 */
export interface ReadLoginCodeOptions {
  /** Path to the .env file */
  envPath: string;
  /** Mock function for reading file contents */
  readFile: (path: string) => Promise<string>;
}

/**
 * Parsed environment variables from .env file
 */
export type EnvVariables = Record<string, string>;

/**
 * Read the LOGIN_SECRET from the .env file
 *
 * Gracefully handles:
 * - Missing .env file (returns empty string)
 * - Missing LOGIN_SECRET key (returns empty string)
 * - Malformed .env content (returns empty string)
 * - File permission errors (returns empty string)
 *
 * @param options - Options including file path and read function
 * @returns Result with login code and success status
 */
export async function readLoginCode(options: ReadLoginCodeOptions): Promise<LoginCodeResult> {
  const { envPath, readFile } = options;

  try {
    const content = await readFile(envPath);
    const envVars = parseEnvFile(content);
    const loginCode = envVars.LOGIN_SECRET ?? '';

    return {
      success: true,
      loginCode,
    };
  } catch (error) {
    // Handle file not found or permission errors gracefully
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isNotFound = errorMessage.includes('ENOENT') || errorMessage.includes('not found');
    const isPermissionError = errorMessage.includes('EACCES') || errorMessage.includes('permission');

    return {
      success: false,
      loginCode: '',
      error: isNotFound
        ? 'File not found'
        : isPermissionError
          ? 'Permission denied'
          : errorMessage,
    };
  }
}

/**
 * Parse .env file content into key-value pairs
 *
 * Handles:
 * - Standard KEY=value format
 * - Comment lines (starting with #)
 * - Empty lines
 * - Values with equals signs
 * - Quoted values
 * - Windows and Unix line endings
 *
 * @param content - Raw .env file content
 * @returns Parsed environment variables
 */
export function parseEnvFile(content: string): EnvVariables {
  const result: EnvVariables = {};

  if (!content || typeof content !== 'string') {
    return result;
  }

  // Normalize line endings (handle Windows CRLF)
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) {
      continue;
    }

    // Skip comment lines
    if (line.trim().startsWith('#')) {
      continue;
    }

    // Find the first equals sign
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      // Invalid line format, skip
      continue;
    }

    const key = line.substring(0, equalsIndex).trim();
    let value = line.substring(equalsIndex + 1).trim();

    // Skip if key is empty
    if (!key) {
      continue;
    }

    // Handle quoted values (both single and double quotes)
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}
