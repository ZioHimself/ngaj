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

/**
 * Validate script content against a set of patterns
 * 
 * @param scriptContent - Content of the script to validate
 * @param patterns - Pattern object to match against
 * @returns Validation result
 */
function validateScript(
  scriptContent: string,
  patterns: Record<keyof ScriptRequirements, RegExp>
): ScriptValidationResult {
  const requirements: ScriptRequirements = {
    checksDocker: false,
    createsDataDirs: false,
    waitsForDocker: false,
    pullsSetupContainer: false,
    runsSetupWizard: false,
    checksEnvFile: false,
    startsServices: false,
    waitsForHealth: false,
    opensBrowser: false,
  };

  const missing: (keyof ScriptRequirements)[] = [];
  const errors: string[] = [];

  // Check each pattern
  for (const key of Object.keys(patterns) as (keyof ScriptRequirements)[]) {
    const pattern = patterns[key];
    const matches = pattern.test(scriptContent);
    requirements[key] = matches;
    
    if (!matches) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    requirements,
    missing,
    errors,
  };
}

/**
 * Validate a macOS post-install script (bash)
 * 
 * @param scriptContent - Content of the bash script
 * @returns Validation result
 */
export function validateMacOSScript(scriptContent: string): ScriptValidationResult {
  return validateScript(scriptContent, MACOS_PATTERNS);
}

/**
 * Validate a Windows post-install script (PowerShell)
 * 
 * @param scriptContent - Content of the PowerShell script
 * @returns Validation result
 */
export function validateWindowsScript(scriptContent: string): ScriptValidationResult {
  return validateScript(scriptContent, WINDOWS_PATTERNS);
}
