/**
 * Script Validator Tests
 * 
 * Tests for OS-specific installation script validation.
 * Validates the setup scripts (ngaj-setup.sh/ps1) which contain the
 * interactive setup wizard logic including Docker checks, service start,
 * health checks, and browser open.
 * 
 * Note: postinstall scripts are minimal launchers that delegate to setup scripts.
 * 
 * @see ADR-011: Installation and Setup Architecture
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  validateMacOSScript,
  validateWindowsScript,
  MACOS_PATTERNS,
  WINDOWS_PATTERNS,
  type ScriptRequirements,
} from '@ngaj/setup/utils/script-validator.js';

// Read actual script files - use process.cwd() which is workspace root in vitest
// We validate the setup scripts which contain the full setup logic
const SCRIPTS_DIR = resolve(process.cwd(), 'installer/scripts');
const macosScript = readFileSync(resolve(SCRIPTS_DIR, 'ngaj-setup.sh'), 'utf-8');
const windowsScript = readFileSync(resolve(SCRIPTS_DIR, 'ngaj-setup.ps1'), 'utf-8');

describe('Script Validator', () => {
  describe('validateMacOSScript', () => {
    it('should validate that script checks for Docker', () => {
      const result = validateMacOSScript(macosScript);
      expect(result.requirements.checksDocker).toBe(true);
    });

    it('should validate that script creates data directories', () => {
      const result = validateMacOSScript(macosScript);
      expect(result.requirements.createsDataDirs).toBe(true);
    });

    it('should validate that script waits for Docker daemon', () => {
      const result = validateMacOSScript(macosScript);
      expect(result.requirements.waitsForDocker).toBe(true);
    });

    it('should validate that script pulls setup container', () => {
      const result = validateMacOSScript(macosScript);
      expect(result.requirements.pullsSetupContainer).toBe(true);
    });

    it('should validate that script runs setup wizard', () => {
      const result = validateMacOSScript(macosScript);
      expect(result.requirements.runsSetupWizard).toBe(true);
    });

    it('should validate that script checks for .env file', () => {
      const result = validateMacOSScript(macosScript);
      expect(result.requirements.checksEnvFile).toBe(true);
    });

    it('should validate that script starts production services', () => {
      const result = validateMacOSScript(macosScript);
      expect(result.requirements.startsServices).toBe(true);
    });

    it('should validate that script waits for health check', () => {
      const result = validateMacOSScript(macosScript);
      expect(result.requirements.waitsForHealth).toBe(true);
    });

    it('should validate that script opens browser', () => {
      const result = validateMacOSScript(macosScript);
      expect(result.requirements.opensBrowser).toBe(true);
    });

    it('should return valid: true when all requirements met', () => {
      const result = validateMacOSScript(macosScript);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should return missing requirements for incomplete script', () => {
      const incompleteScript = `#!/bin/bash
echo "Hello"
`;
      const result = validateMacOSScript(incompleteScript);
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });

  describe('validateWindowsScript', () => {
    it('should validate that script checks for Docker', () => {
      const result = validateWindowsScript(windowsScript);
      expect(result.requirements.checksDocker).toBe(true);
    });

    it('should validate that script creates data directories', () => {
      const result = validateWindowsScript(windowsScript);
      expect(result.requirements.createsDataDirs).toBe(true);
    });

    it('should validate that script waits for Docker daemon', () => {
      const result = validateWindowsScript(windowsScript);
      expect(result.requirements.waitsForDocker).toBe(true);
    });

    it('should validate that script pulls setup container', () => {
      const result = validateWindowsScript(windowsScript);
      expect(result.requirements.pullsSetupContainer).toBe(true);
    });

    it('should validate that script runs setup wizard', () => {
      const result = validateWindowsScript(windowsScript);
      expect(result.requirements.runsSetupWizard).toBe(true);
    });

    it('should validate that script checks for .env file', () => {
      const result = validateWindowsScript(windowsScript);
      expect(result.requirements.checksEnvFile).toBe(true);
    });

    it('should validate that script starts production services', () => {
      const result = validateWindowsScript(windowsScript);
      expect(result.requirements.startsServices).toBe(true);
    });

    it('should validate that script waits for health check', () => {
      const result = validateWindowsScript(windowsScript);
      expect(result.requirements.waitsForHealth).toBe(true);
    });

    it('should validate that script opens browser', () => {
      const result = validateWindowsScript(windowsScript);
      expect(result.requirements.opensBrowser).toBe(true);
    });

    it('should return valid: true when all requirements met', () => {
      const result = validateWindowsScript(windowsScript);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should return missing requirements for incomplete script', () => {
      const incompleteScript = `# PowerShell
Write-Host "Hello"
`;
      const result = validateWindowsScript(incompleteScript);
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });

  describe('MACOS_PATTERNS', () => {
    it('should have pattern for Docker check', () => {
      expect(MACOS_PATTERNS.checksDocker).toBeInstanceOf(RegExp);
      expect(macosScript).toMatch(MACOS_PATTERNS.checksDocker);
    });

    it('should have pattern for directory creation', () => {
      expect(MACOS_PATTERNS.createsDataDirs).toBeInstanceOf(RegExp);
      expect(macosScript).toMatch(MACOS_PATTERNS.createsDataDirs);
    });

    it('should have pattern for Docker daemon wait', () => {
      expect(MACOS_PATTERNS.waitsForDocker).toBeInstanceOf(RegExp);
      expect(macosScript).toMatch(MACOS_PATTERNS.waitsForDocker);
    });

    it('should have pattern for setup container pull', () => {
      expect(MACOS_PATTERNS.pullsSetupContainer).toBeInstanceOf(RegExp);
      expect(macosScript).toMatch(MACOS_PATTERNS.pullsSetupContainer);
    });

    it('should have pattern for setup wizard run', () => {
      expect(MACOS_PATTERNS.runsSetupWizard).toBeInstanceOf(RegExp);
      expect(macosScript).toMatch(MACOS_PATTERNS.runsSetupWizard);
    });

    it('should have pattern for .env file check', () => {
      expect(MACOS_PATTERNS.checksEnvFile).toBeInstanceOf(RegExp);
      expect(macosScript).toMatch(MACOS_PATTERNS.checksEnvFile);
    });

    it('should have pattern for service start', () => {
      expect(MACOS_PATTERNS.startsServices).toBeInstanceOf(RegExp);
      expect(macosScript).toMatch(MACOS_PATTERNS.startsServices);
    });

    it('should have pattern for health check', () => {
      expect(MACOS_PATTERNS.waitsForHealth).toBeInstanceOf(RegExp);
      expect(macosScript).toMatch(MACOS_PATTERNS.waitsForHealth);
    });

    it('should have pattern for browser open', () => {
      expect(MACOS_PATTERNS.opensBrowser).toBeInstanceOf(RegExp);
      expect(macosScript).toMatch(MACOS_PATTERNS.opensBrowser);
    });
  });

  describe('WINDOWS_PATTERNS', () => {
    it('should have pattern for Docker check', () => {
      expect(WINDOWS_PATTERNS.checksDocker).toBeInstanceOf(RegExp);
      expect(windowsScript).toMatch(WINDOWS_PATTERNS.checksDocker);
    });

    it('should have pattern for directory creation', () => {
      expect(WINDOWS_PATTERNS.createsDataDirs).toBeInstanceOf(RegExp);
      expect(windowsScript).toMatch(WINDOWS_PATTERNS.createsDataDirs);
    });

    it('should have pattern for Docker daemon wait', () => {
      expect(WINDOWS_PATTERNS.waitsForDocker).toBeInstanceOf(RegExp);
      expect(windowsScript).toMatch(WINDOWS_PATTERNS.waitsForDocker);
    });

    it('should have pattern for setup container pull', () => {
      expect(WINDOWS_PATTERNS.pullsSetupContainer).toBeInstanceOf(RegExp);
      expect(windowsScript).toMatch(WINDOWS_PATTERNS.pullsSetupContainer);
    });

    it('should have pattern for setup wizard run', () => {
      expect(WINDOWS_PATTERNS.runsSetupWizard).toBeInstanceOf(RegExp);
      expect(windowsScript).toMatch(WINDOWS_PATTERNS.runsSetupWizard);
    });

    it('should have pattern for .env file check', () => {
      expect(WINDOWS_PATTERNS.checksEnvFile).toBeInstanceOf(RegExp);
      expect(windowsScript).toMatch(WINDOWS_PATTERNS.checksEnvFile);
    });

    it('should have pattern for service start', () => {
      expect(WINDOWS_PATTERNS.startsServices).toBeInstanceOf(RegExp);
      expect(windowsScript).toMatch(WINDOWS_PATTERNS.startsServices);
    });

    it('should have pattern for health check', () => {
      expect(WINDOWS_PATTERNS.waitsForHealth).toBeInstanceOf(RegExp);
      expect(windowsScript).toMatch(WINDOWS_PATTERNS.waitsForHealth);
    });

    it('should have pattern for browser open', () => {
      expect(WINDOWS_PATTERNS.opensBrowser).toBeInstanceOf(RegExp);
      expect(windowsScript).toMatch(WINDOWS_PATTERNS.opensBrowser);
    });
  });

  describe('cross-platform consistency', () => {
    it('should have matching requirement sets for both platforms', () => {
      const macosKeys = Object.keys(MACOS_PATTERNS).sort();
      const windowsKeys = Object.keys(WINDOWS_PATTERNS).sort();
      expect(macosKeys).toEqual(windowsKeys);
    });

    it('should validate both scripts pass all requirements', () => {
      const macosResult = validateMacOSScript(macosScript);
      const windowsResult = validateWindowsScript(windowsScript);

      expect(macosResult.valid).toBe(true);
      expect(windowsResult.valid).toBe(true);
    });
  });
});
