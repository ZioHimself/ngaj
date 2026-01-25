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
 * Expected patterns for macOS bash scripts (ngaj-setup.sh)
 * These patterns match the interactive setup wizard script.
 */
export const MACOS_PATTERNS = {
  // Checks for Docker using 'command -v docker' or similar
  checksDocker: /command\s+-v\s+docker|docker\s+info/,
  // Uses NGAJ_HOME directory (created by postinstall, used by setup)
  createsDataDirs: /NGAJ_HOME="\$\{HOME\}\/\.ngaj"/,
  // Waits for Docker daemon using while loop with docker info
  waitsForDocker: /while\s+!\s+docker\s+info|until\s+docker\s+info/,
  // Pulls the setup container
  pullsSetupContainer: /docker\s+pull\s+ziohimself\/ngaj-setup/,
  // Runs the setup wizard container
  runsSetupWizard: /docker\s+run[\s\S]*ziohimself\/ngaj-setup/,
  // Checks if .env file exists after setup
  checksEnvFile: /-f\s+"\$\{NGAJ_HOME\}\/\.env"/,
  // Starts production services with docker compose
  startsServices: /docker\s+compose\s+up/,
  // Waits for health check endpoint
  waitsForHealth: /curl.*localhost:3000\/health/,
  // Opens browser to the dashboard (open command with URL)
  opensBrowser: /open\s+"http:\/\//,
} as const;

/**
 * Expected patterns for Windows PowerShell scripts (ngaj-setup.ps1)
 * These patterns match the interactive setup wizard script.
 */
export const WINDOWS_PATTERNS = {
  // Checks for Docker using Get-Command
  checksDocker: /Get-Command\s+docker/,
  // Uses NgajHome directory (created by postinstall, used by setup)
  createsDataDirs: /\$NgajHome\s*=\s*"\$env:LOCALAPPDATA\\ngaj"/,
  // Waits for Docker daemon using while loop
  waitsForDocker: /while\s+\(-not\s+\(docker\s+info/,
  // Pulls the setup container
  pullsSetupContainer: /docker\s+pull\s+ziohimself\/ngaj-setup/,
  // Runs the setup wizard container
  runsSetupWizard: /docker\s+run[\s\S]*ziohimself\/ngaj-setup/,
  // Checks if .env file exists using Test-Path
  checksEnvFile: /Test-Path.*\\\.env/,
  // Starts production services with docker compose
  startsServices: /docker\s+compose\s+up/,
  // Waits for health check using Invoke-WebRequest
  waitsForHealth: /Invoke-WebRequest.*localhost:3000\/health/,
  // Opens browser using Start-Process with URL
  opensBrowser: /Start-Process\s+"http:\/\//,
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
