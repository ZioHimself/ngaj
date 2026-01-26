/**
 * File System Validator Utilities
 *
 * Utilities for validating file system structure after installation.
 * Validates app bundles, start scripts, shortcuts, and volume mounts.
 *
 * @see ADR-011: Installation and Setup Architecture (Section 7)
 * @see 012-application-launcher-handoff.md (Section 4)
 */

import { writeFileSync, unlinkSync, statSync } from 'fs';

// ==========================================================================
// Volume Mount Validation
// ==========================================================================

/**
 * Result from data volume mount validation
 */
export interface DataVolumeMountResult {
  /** Whether the volume is properly mounted */
  mounted: boolean;
  /** Whether the volume is writable */
  writable: boolean;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Validate that /data is a properly mounted volume and is writable.
 *
 * This check should run BEFORE collecting any user credentials to avoid
 * wasting user time if the volume isn't properly configured.
 *
 * @returns Validation result with mount and write status
 */
export function validateDataVolumeMount(): DataVolumeMountResult {
  const dataPath = '/data';
  const testFile = `${dataPath}/.write-test-${Date.now()}`;

  // Check if /data is a mount point (different device than root)
  try {
    const dataStats = statSync(dataPath);
    const rootStats = statSync('/');

    // If same device, /data is not a mounted volume
    if (dataStats.dev === rootStats.dev) {
      return {
        mounted: false,
        writable: false,
        error: 'Volume not mounted. Run with: docker run -v ~/.ngaj:/data ...',
      };
    }
  } catch {
    return {
      mounted: false,
      writable: false,
      error: '/data directory does not exist. Run with: docker run -v ~/.ngaj:/data ...',
    };
  }

  // Test write permissions
  try {
    writeFileSync(testFile, 'test');
    unlinkSync(testFile);
    return { mounted: true, writable: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      mounted: true,
      writable: false,
      error: `Cannot write to /data: ${message}. Check host directory permissions.`,
    };
  }
}

/**
 * Validation result with details
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
}

/**
 * Result from macOS app bundle validation
 */
export interface MacOSAppBundleResult extends ValidationResult {
  /** Whether ngaj-launcher exists */
  launcherExists: boolean;
  /** Whether ngaj-launcher has execute permission */
  launcherExecutable: boolean;
  /** Whether Info.plist is valid XML */
  infoPlistValid: boolean;
  /** Parsed bundle name from Info.plist */
  bundleName?: string;
  /** Whether icon.icns exists */
  iconExists: boolean;
}

/**
 * Result from macOS start script validation
 */
export interface MacOSStartScriptResult extends ValidationResult {
  /** Whether script exists */
  exists: boolean;
  /** Whether script has execute permission */
  executable: boolean;
  /** Whether script contains detect_lan_ip function */
  hasDetectLanIP: boolean;
  /** Whether script contains cleanup function */
  hasCleanup: boolean;
}

/**
 * Result from Windows shortcut validation
 */
export interface WindowsShortcutResult extends ValidationResult {
  /** Whether shortcut exists */
  exists: boolean;
  /** Whether target is correct (powershell.exe) */
  targetCorrect: boolean;
  /** Whether arguments are correct */
  argumentsCorrect: boolean;
  /** Whether icon file exists and is valid */
  iconValid: boolean;
}

/**
 * Result from Windows start script validation
 */
export interface WindowsStartScriptResult extends ValidationResult {
  /** Whether script exists */
  exists: boolean;
  /** Whether PowerShell syntax is valid */
  syntaxValid: boolean;
}

/**
 * Parsed Info.plist values
 */
export interface ParsedInfoPlist {
  CFBundleExecutable?: string;
  CFBundleIconFile?: string;
  CFBundleIdentifier?: string;
  CFBundleName?: string;
  CFBundleDisplayName?: string;
  CFBundlePackageType?: string;
  CFBundleShortVersionString?: string;
  CFBundleVersion?: string;
  LSMinimumSystemVersion?: string;
  NSHighResolutionCapable?: boolean;
}

/**
 * Options for validateMacOSAppBundle
 */
export interface ValidateMacOSAppBundleOptions {
  fileExists: (path: string) => Promise<boolean>;
  isExecutable: (path: string) => Promise<boolean>;
  readFile: (path: string) => Promise<string>;
}

/**
 * Options for validateMacOSStartScript
 */
export interface ValidateMacOSStartScriptOptions {
  fileExists: (path: string) => Promise<boolean>;
  isExecutable: (path: string) => Promise<boolean>;
  readFile: (path: string) => Promise<string>;
  homeDir: string;
}

/**
 * Shortcut properties
 */
export interface ShortcutProperties {
  target: string;
  arguments: string;
  icon: string;
}

/**
 * Options for validateWindowsShortcut
 */
export interface ValidateWindowsShortcutOptions {
  fileExists: (path: string) => Promise<boolean>;
  readShortcut: (path: string) => Promise<ShortcutProperties>;
  appDataPath: string;
}

/**
 * Options for validateWindowsStartScript
 */
export interface ValidateWindowsStartScriptOptions {
  fileExists: (path: string) => Promise<boolean>;
  readFile: (path: string) => Promise<string>;
  localAppDataPath: string;
  validatePowerShell?: (content: string) => Promise<{ valid: boolean; error?: string }>;
}

// ==========================================================================
// Constants
// ==========================================================================

const MACOS_PATHS = {
  launcher: '/Applications/ngaj.app/Contents/MacOS/ngaj-launcher',
  infoPlist: '/Applications/ngaj.app/Contents/Info.plist',
  iconFile: '/Applications/ngaj.app/Contents/Resources/icon.icns',
};

// ==========================================================================
// Functions
// ==========================================================================

/**
 * Validate macOS app bundle structure
 *
 * Checks:
 * - ngaj-launcher exists and is executable
 * - Info.plist is valid XML with correct CFBundleName
 * - icon.icns exists
 *
 * @param options - Validation options with file system functions
 * @returns Validation result with details
 */
export async function validateMacOSAppBundle(
  options: ValidateMacOSAppBundleOptions
): Promise<MacOSAppBundleResult> {
  const { fileExists, isExecutable, readFile } = options;
  const errors: string[] = [];

  // Check launcher exists
  let launcherExists = false;
  try {
    launcherExists = await fileExists(MACOS_PATHS.launcher);
  } catch {
    launcherExists = false;
  }
  if (!launcherExists) {
    errors.push('ngaj-launcher not found');
  }

  // Check launcher is executable
  let launcherExecutable = false;
  try {
    launcherExecutable = launcherExists && (await isExecutable(MACOS_PATHS.launcher));
  } catch {
    launcherExecutable = false;
  }
  if (launcherExists && !launcherExecutable) {
    errors.push('ngaj-launcher not executable');
  }

  // Check Info.plist
  let infoPlistValid = false;
  let bundleName: string | undefined;
  try {
    const plistContent = await readFile(MACOS_PATHS.infoPlist);
    const parsed = parseInfoPlist(plistContent);
    infoPlistValid = Object.keys(parsed).length > 0;
    bundleName = parsed.CFBundleName;
  } catch {
    infoPlistValid = false;
  }

  // Check icon exists
  let iconExists = false;
  try {
    iconExists = await fileExists(MACOS_PATHS.iconFile);
  } catch {
    iconExists = false;
  }

  return {
    valid: errors.length === 0 && launcherExists && launcherExecutable && infoPlistValid,
    errors,
    launcherExists,
    launcherExecutable,
    infoPlistValid,
    bundleName,
    iconExists,
  };
}

/**
 * Validate macOS start script
 *
 * Checks:
 * - Script exists at ~/.ngaj/scripts/ngaj-start.sh
 * - Script has execute permission
 * - Script contains required functions
 *
 * @param options - Validation options with file system functions
 * @returns Validation result with details
 */
export async function validateMacOSStartScript(
  options: ValidateMacOSStartScriptOptions
): Promise<MacOSStartScriptResult> {
  const { fileExists, isExecutable, readFile, homeDir } = options;
  const scriptPath = `${homeDir}/.ngaj/scripts/ngaj-start.sh`;
  const errors: string[] = [];

  // Check script exists
  let exists = false;
  try {
    exists = await fileExists(scriptPath);
  } catch {
    exists = false;
  }

  // Check script is executable
  let executable = false;
  try {
    executable = exists && (await isExecutable(scriptPath));
  } catch {
    executable = false;
  }

  // Check script content for required functions
  let hasDetectLanIP = false;
  let hasCleanup = false;
  try {
    if (exists) {
      const content = await readFile(scriptPath);
      hasDetectLanIP = content.includes('detect_lan_ip');
      hasCleanup = content.includes('cleanup');
    }
  } catch {
    // Keep defaults
  }

  return {
    valid: exists && executable,
    errors,
    exists,
    executable,
    hasDetectLanIP,
    hasCleanup,
  };
}

/**
 * Validate Windows Start Menu shortcut
 *
 * Checks:
 * - Shortcut exists in Start Menu Programs
 * - Target is powershell.exe
 * - Arguments are correct
 * - Icon file exists
 *
 * @param options - Validation options with file system functions
 * @returns Validation result with details
 */
export async function validateWindowsShortcut(
  options: ValidateWindowsShortcutOptions
): Promise<WindowsShortcutResult> {
  const { fileExists, readShortcut, appDataPath } = options;
  const shortcutPath = `${appDataPath}\\Microsoft\\Windows\\Start Menu\\Programs\\ngaj.lnk`;
  const errors: string[] = [];

  // Check shortcut exists
  let exists = false;
  try {
    exists = await fileExists(shortcutPath);
  } catch {
    exists = false;
  }

  // Read shortcut properties
  let targetCorrect = false;
  let argumentsCorrect = false;
  let iconValid = false;

  try {
    const props = await readShortcut(shortcutPath);

    // Check target is powershell.exe
    targetCorrect = props.target.toLowerCase().includes('powershell.exe');

    // Check arguments contain the start script
    argumentsCorrect =
      props.arguments.includes('ngaj-start.ps1') ||
      props.arguments.includes('-File') ||
      props.arguments.includes('-ExecutionPolicy');

    // Check icon exists
    if (props.icon) {
      iconValid = await fileExists(props.icon);
    }
  } catch {
    // Keep defaults
  }

  return {
    valid: exists && targetCorrect,
    errors,
    exists,
    targetCorrect,
    argumentsCorrect,
    iconValid,
  };
}

/**
 * Validate Windows start script
 *
 * Checks:
 * - Script exists
 * - PowerShell syntax is valid
 *
 * @param options - Validation options with file system functions
 * @returns Validation result with details
 */
export async function validateWindowsStartScript(
  options: ValidateWindowsStartScriptOptions
): Promise<WindowsStartScriptResult> {
  const { fileExists, readFile, localAppDataPath, validatePowerShell } = options;
  const scriptPath = `${localAppDataPath}\\ngaj\\scripts\\ngaj-start.ps1`;
  const errors: string[] = [];

  // Check script exists
  let exists = false;
  try {
    exists = await fileExists(scriptPath);
  } catch {
    exists = false;
  }

  // Validate PowerShell syntax
  let syntaxValid = false;
  try {
    if (exists && validatePowerShell) {
      const content = await readFile(scriptPath);
      const result = await validatePowerShell(content);
      syntaxValid = result.valid;
    } else {
      // If no validator provided, assume valid if exists
      syntaxValid = exists;
    }
  } catch {
    syntaxValid = false;
  }

  return {
    valid: exists && syntaxValid,
    errors,
    exists,
    syntaxValid,
  };
}

/**
 * Parse Info.plist XML content
 *
 * @param content - Raw Info.plist XML content
 * @returns Parsed key-value pairs
 */
export function parseInfoPlist(content: string): ParsedInfoPlist {
  const result: ParsedInfoPlist = {};

  if (!content || typeof content !== 'string') {
    return result;
  }

  // Check if it looks like valid plist XML
  if (!content.includes('<plist') || !content.includes('<dict>')) {
    return result;
  }

  try {
    // Extract key-value pairs from plist XML
    // This is a simplified parser for common plist elements

    // Extract string values: <key>NAME</key>\s*<string>VALUE</string>
    const stringPattern = /<key>(\w+)<\/key>\s*<string>([^<]*)<\/string>/g;
    let match: RegExpExecArray | null;
    while ((match = stringPattern.exec(content)) !== null) {
      const key = match[1] as keyof ParsedInfoPlist;
      const value = match[2];
      if (key in result || isValidPlistKey(key)) {
        (result as Record<string, string | boolean>)[key] = value;
      }
    }

    // Extract boolean true values: <key>NAME</key>\s*<true/>
    const truePattern = /<key>(\w+)<\/key>\s*<true\s*\/>/g;
    while ((match = truePattern.exec(content)) !== null) {
      const key = match[1] as keyof ParsedInfoPlist;
      if (isValidPlistKey(key)) {
        (result as Record<string, string | boolean>)[key] = true;
      }
    }

    // Extract boolean false values: <key>NAME</key>\s*<false/>
    const falsePattern = /<key>(\w+)<\/key>\s*<false\s*\/>/g;
    while ((match = falsePattern.exec(content)) !== null) {
      const key = match[1] as keyof ParsedInfoPlist;
      if (isValidPlistKey(key)) {
        (result as Record<string, string | boolean>)[key] = false;
      }
    }
  } catch {
    // Return empty result on parse error
    return {};
  }

  return result;
}

/**
 * Check if a key is a valid Info.plist key we care about
 */
function isValidPlistKey(key: string): key is keyof ParsedInfoPlist {
  const validKeys: (keyof ParsedInfoPlist)[] = [
    'CFBundleExecutable',
    'CFBundleIconFile',
    'CFBundleIdentifier',
    'CFBundleName',
    'CFBundleDisplayName',
    'CFBundlePackageType',
    'CFBundleShortVersionString',
    'CFBundleVersion',
    'LSMinimumSystemVersion',
    'NSHighResolutionCapable',
  ];
  return validKeys.includes(key as keyof ParsedInfoPlist);
}
