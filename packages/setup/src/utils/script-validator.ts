/**
 * Script Validator Utilities
 * 
 * Validates that OS-specific installation scripts contain required
 * steps and follow expected patterns.
 * 
 * @see ADR-011: Installation and Setup Architecture
 */

/**
 * Required steps that must be present in installation scripts
 */
export interface ScriptRequirements {
  /** Script must check for Docker command */
  checksDocker: boolean;
  /** Script must create user data directories */
  createsDataDirs: boolean;
  /** Script must wait for Docker daemon */
  waitsForDocker: boolean;
  /** Script must pull setup container */
  pullsSetupContainer: boolean;
  /** Script must run setup wizard */
  runsSetupWizard: boolean;
  /** Script must check for .env file after setup */
  checksEnvFile: boolean;
  /** Script must start production services */
  startsServices: boolean;
  /** Script must wait for health check */
  waitsForHealth: boolean;
  /** Script must open browser */
  opensBrowser: boolean;
}

/**
 * Validation result for a script
 */
export interface ScriptValidationResult {
  /** Whether all requirements are met */
  valid: boolean;
  /** Requirements that were checked */
  requirements: ScriptRequirements;
  /** Missing requirements (if any) */
  missing: (keyof ScriptRequirements)[];
  /** Errors encountered during validation */
  errors: string[];
}

/**
 * Validate a macOS post-install script (bash)
 * 
 * @param scriptContent - Content of the bash script
 * @returns Validation result
 */
export function validateMacOSScript(scriptContent: string): ScriptValidationResult {
  throw new Error('Not implemented');
}

/**
 * Validate a Windows post-install script (PowerShell)
 * 
 * @param scriptContent - Content of the PowerShell script
 * @returns Validation result
 */
export function validateWindowsScript(scriptContent: string): ScriptValidationResult {
  throw new Error('Not implemented');
}

/**
 * Expected patterns for macOS bash scripts
 */
export const MACOS_PATTERNS = {
  checksDocker: /command\s+-v\s+docker/,
  createsDataDirs: /mkdir\s+-p\s+"\$\{?NGAJ_HOME\}?/,
  waitsForDocker: /until\s+docker\s+info/,
  pullsSetupContainer: /docker\s+pull\s+ngaj\/setup/,
  runsSetupWizard: /docker\s+run[\s\S]*ngaj\/setup/,
  checksEnvFile: /\[\s*!\s+-f\s+"\$\{?NGAJ_HOME\}?\/\.env"\s*\]/,
  startsServices: /docker\s+compose\s+up/,
  waitsForHealth: /curl.*localhost:3000\/health/,
  opensBrowser: /open\s+.*localhost:3000/,
} as const;

/**
 * Expected patterns for Windows PowerShell scripts
 */
export const WINDOWS_PATTERNS = {
  checksDocker: /Get-Command\s+docker/,
  createsDataDirs: /New-Item.*\$NgajHome/,
  waitsForDocker: /while.*docker\s+info/,
  pullsSetupContainer: /docker\s+pull\s+ngaj\/setup/,
  runsSetupWizard: /docker\s+run[\s\S]*ngaj\/setup/,
  checksEnvFile: /Test-Path.*\.env/,
  startsServices: /docker\s+compose\s+up/,
  waitsForHealth: /Invoke-WebRequest.*localhost:3000\/health/,
  opensBrowser: /Start-Process.*localhost:3000/,
} as const;
