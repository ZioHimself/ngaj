/**
 * File System Validation Tests (Red Phase)
 *
 * Tests for verifying file system structure after installation.
 * Validates app bundle, start scripts, and shortcuts are created correctly.
 *
 * @see ADR-011: Installation and Setup Architecture (Section 7)
 * @see 012-application-launcher-handoff.md (Section 4)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { macOSPaths, windowsPaths, infoPlistExpected } from '@tests/fixtures/launcher-fixtures';
import {
  validateMacOSAppBundle,
  validateMacOSStartScript,
  validateWindowsShortcut,
  validateWindowsStartScript,
  parseInfoPlist,
  ValidationResult,
} from '@ngaj/setup/utils/file-system-validator.js';

describe('File System Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // macOS App Bundle Validation (Section 4.1)
  // ==========================================================================

  describe('validateMacOSAppBundle()', () => {
    describe('App Bundle Structure', () => {
      it('should verify ngaj-launcher exists in MacOS directory', async () => {
        const mockFileExists = vi.fn().mockImplementation((path: string) => {
          return path === '/Applications/ngaj.app/Contents/MacOS/ngaj';
        });

        const result = await validateMacOSAppBundle({
          fileExists: mockFileExists,
          isExecutable: vi.fn().mockResolvedValue(true),
          readFile: vi.fn().mockResolvedValue(''),
        });

        expect(mockFileExists).toHaveBeenCalledWith(macOSPaths.launcher);
        expect(result.launcherExists).toBe(true);
      });

      it('should verify ngaj-launcher has execute permission', async () => {
        const mockIsExecutable = vi.fn().mockResolvedValue(true);

        const result = await validateMacOSAppBundle({
          fileExists: vi.fn().mockResolvedValue(true),
          isExecutable: mockIsExecutable,
          readFile: vi.fn().mockResolvedValue(''),
        });

        expect(mockIsExecutable).toHaveBeenCalledWith(macOSPaths.launcher);
        expect(result.launcherExecutable).toBe(true);
      });

      it('should verify Info.plist exists and is valid XML', async () => {
        const validPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>ngaj</string>
</dict>
</plist>`;

        const mockReadFile = vi.fn().mockResolvedValue(validPlist);

        const result = await validateMacOSAppBundle({
          fileExists: vi.fn().mockResolvedValue(true),
          isExecutable: vi.fn().mockResolvedValue(true),
          readFile: mockReadFile,
        });

        expect(mockReadFile).toHaveBeenCalledWith(macOSPaths.infoPlist);
        expect(result.infoPlistValid).toBe(true);
      });

      it('should verify Info.plist has correct CFBundleName', async () => {
        const validPlist = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>ngaj</string>
</dict>
</plist>`;

        const result = await validateMacOSAppBundle({
          fileExists: vi.fn().mockResolvedValue(true),
          isExecutable: vi.fn().mockResolvedValue(true),
          readFile: vi.fn().mockResolvedValue(validPlist),
        });

        expect(result.bundleName).toBe(infoPlistExpected.CFBundleName);
      });

      it('should verify icon.icns exists', async () => {
        const mockFileExists = vi.fn().mockImplementation((path: string) => {
          return path.includes('icon.icns');
        });

        const result = await validateMacOSAppBundle({
          fileExists: mockFileExists,
          isExecutable: vi.fn().mockResolvedValue(true),
          readFile: vi.fn().mockResolvedValue(''),
        });

        expect(mockFileExists).toHaveBeenCalledWith(macOSPaths.iconFile);
      });
    });

    describe('Validation Failures', () => {
      it('should fail if ngaj-launcher does not exist', async () => {
        const result = await validateMacOSAppBundle({
          fileExists: vi.fn().mockResolvedValue(false),
          isExecutable: vi.fn().mockResolvedValue(false),
          readFile: vi.fn().mockResolvedValue(''),
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('ngaj launcher not found');
      });

      it('should fail if ngaj-launcher is not executable', async () => {
        const result = await validateMacOSAppBundle({
          fileExists: vi.fn().mockResolvedValue(true),
          isExecutable: vi.fn().mockResolvedValue(false),
          readFile: vi.fn().mockResolvedValue(''),
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('ngaj launcher not executable');
      });

      it('should fail if Info.plist is invalid XML', async () => {
        const result = await validateMacOSAppBundle({
          fileExists: vi.fn().mockResolvedValue(true),
          isExecutable: vi.fn().mockResolvedValue(true),
          readFile: vi.fn().mockResolvedValue('not valid xml'),
        });

        expect(result.valid).toBe(false);
        expect(result.infoPlistValid).toBe(false);
      });
    });
  });

  // ==========================================================================
  // macOS Start Script Validation (Section 4.2)
  // ==========================================================================

  describe('validateMacOSStartScript()', () => {
    it('should verify start script exists at ~/.ngaj/scripts/ngaj-start.sh', async () => {
      const mockFileExists = vi.fn().mockResolvedValue(true);

      const result = await validateMacOSStartScript({
        fileExists: mockFileExists,
        isExecutable: vi.fn().mockResolvedValue(true),
        readFile: vi.fn().mockResolvedValue(''),
        homeDir: '/Users/test',
      });

      expect(mockFileExists).toHaveBeenCalledWith('/Users/test/.ngaj/scripts/ngaj-start.sh');
    });

    it('should verify start script has execute permission', async () => {
      const mockIsExecutable = vi.fn().mockResolvedValue(true);

      const result = await validateMacOSStartScript({
        fileExists: vi.fn().mockResolvedValue(true),
        isExecutable: mockIsExecutable,
        readFile: vi.fn().mockResolvedValue(''),
        homeDir: '/Users/test',
      });

      expect(result.executable).toBe(true);
    });

    it('should verify script contains detect_lan_ip function', async () => {
      const scriptContent = `#!/bin/bash
detect_lan_ip() {
  for iface in en0 en1; do
    ip=$(ipconfig getifaddr "$iface" 2>/dev/null)
    if [ -n "$ip" ]; then
      echo "$ip"
      return
    fi
  done
}`;

      const result = await validateMacOSStartScript({
        fileExists: vi.fn().mockResolvedValue(true),
        isExecutable: vi.fn().mockResolvedValue(true),
        readFile: vi.fn().mockResolvedValue(scriptContent),
        homeDir: '/Users/test',
      });

      expect(result.hasDetectLanIP).toBe(true);
    });

    it('should verify script contains cleanup function', async () => {
      const scriptContent = `#!/bin/bash
cleanup() {
  echo "Stopping ngaj..."
  docker compose down
}
trap cleanup INT TERM`;

      const result = await validateMacOSStartScript({
        fileExists: vi.fn().mockResolvedValue(true),
        isExecutable: vi.fn().mockResolvedValue(true),
        readFile: vi.fn().mockResolvedValue(scriptContent),
        homeDir: '/Users/test',
      });

      expect(result.hasCleanup).toBe(true);
    });
  });

  // ==========================================================================
  // Windows Shortcut Validation (Section 4.3)
  // ==========================================================================

  describe('validateWindowsShortcut()', () => {
    it('should verify shortcut exists in Start Menu Programs', async () => {
      const mockFileExists = vi.fn().mockResolvedValue(true);

      const result = await validateWindowsShortcut({
        fileExists: mockFileExists,
        readShortcut: vi.fn().mockResolvedValue({
          target: 'powershell.exe',
          arguments: '-File ngaj-start.ps1',
          icon: 'ngaj.ico',
        }),
        appDataPath: 'C:\\Users\\Test\\AppData\\Roaming',
      });

      expect(mockFileExists).toHaveBeenCalledWith(
        'C:\\Users\\Test\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\ngaj.lnk'
      );
    });

    it('should verify shortcut targets powershell.exe', async () => {
      const result = await validateWindowsShortcut({
        fileExists: vi.fn().mockResolvedValue(true),
        readShortcut: vi.fn().mockResolvedValue({
          target: 'powershell.exe',
          arguments: '-ExecutionPolicy Bypass -File ngaj-start.ps1',
          icon: 'ngaj.ico',
        }),
        appDataPath: 'C:\\Users\\Test\\AppData\\Roaming',
      });

      expect(result.targetCorrect).toBe(true);
    });

    it('should verify shortcut has correct arguments', async () => {
      const result = await validateWindowsShortcut({
        fileExists: vi.fn().mockResolvedValue(true),
        readShortcut: vi.fn().mockResolvedValue({
          target: 'powershell.exe',
          arguments: '-ExecutionPolicy Bypass -File "ngaj-start.ps1"',
          icon: 'ngaj.ico',
        }),
        appDataPath: 'C:\\Users\\Test\\AppData\\Roaming',
      });

      expect(result.argumentsCorrect).toBe(true);
    });

    it('should verify shortcut points to valid .ico file', async () => {
      const mockFileExists = vi.fn().mockImplementation((path: string) => {
        return true; // Both shortcut and ico file exist
      });

      const result = await validateWindowsShortcut({
        fileExists: mockFileExists,
        readShortcut: vi.fn().mockResolvedValue({
          target: 'powershell.exe',
          arguments: '-File ngaj-start.ps1',
          icon: 'C:\\Program Files\\ngaj\\resources\\ngaj.ico',
        }),
        appDataPath: 'C:\\Users\\Test\\AppData\\Roaming',
      });

      expect(result.iconValid).toBe(true);
    });
  });

  // ==========================================================================
  // Windows Start Script Validation (Section 4.2)
  // ==========================================================================

  describe('validateWindowsStartScript()', () => {
    it('should verify start script exists', async () => {
      const mockFileExists = vi.fn().mockResolvedValue(true);

      const result = await validateWindowsStartScript({
        fileExists: mockFileExists,
        readFile: vi.fn().mockResolvedValue(''),
        localAppDataPath: 'C:\\Users\\Test\\AppData\\Local',
      });

      expect(mockFileExists).toHaveBeenCalledWith(
        'C:\\Users\\Test\\AppData\\Local\\ngaj\\scripts\\ngaj-start.ps1'
      );
    });

    it('should verify PowerShell syntax is valid', async () => {
      const validPowerShell = `$ErrorActionPreference = "Stop"
Write-Host "Starting ngaj..."
docker compose up -d`;

      const result = await validateWindowsStartScript({
        fileExists: vi.fn().mockResolvedValue(true),
        readFile: vi.fn().mockResolvedValue(validPowerShell),
        localAppDataPath: 'C:\\Users\\Test\\AppData\\Local',
        validatePowerShell: vi.fn().mockResolvedValue({ valid: true }),
      });

      expect(result.syntaxValid).toBe(true);
    });

    it('should fail if PowerShell syntax is invalid', async () => {
      const result = await validateWindowsStartScript({
        fileExists: vi.fn().mockResolvedValue(true),
        readFile: vi.fn().mockResolvedValue('invalid { powershell'),
        localAppDataPath: 'C:\\Users\\Test\\AppData\\Local',
        validatePowerShell: vi.fn().mockResolvedValue({ valid: false, error: 'Syntax error' }),
      });

      expect(result.syntaxValid).toBe(false);
    });
  });

  // ==========================================================================
  // Info.plist Parsing Tests
  // ==========================================================================

  describe('parseInfoPlist()', () => {
    it('should parse CFBundleExecutable', () => {
      const plist = `<?xml version="1.0"?>
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>ngaj</string>
</dict>
</plist>`;

      const result = parseInfoPlist(plist);

      expect(result.CFBundleExecutable).toBe(infoPlistExpected.CFBundleExecutable);
    });

    it('should parse CFBundleName', () => {
      const plist = `<?xml version="1.0"?>
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>ngaj</string>
</dict>
</plist>`;

      const result = parseInfoPlist(plist);

      expect(result.CFBundleName).toBe(infoPlistExpected.CFBundleName);
    });

    it('should parse CFBundleIdentifier', () => {
      const plist = `<?xml version="1.0"?>
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.ngaj.app</string>
</dict>
</plist>`;

      const result = parseInfoPlist(plist);

      expect(result.CFBundleIdentifier).toBe(infoPlistExpected.CFBundleIdentifier);
    });

    it('should parse boolean values (NSHighResolutionCapable)', () => {
      const plist = `<?xml version="1.0"?>
<plist version="1.0">
<dict>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>`;

      const result = parseInfoPlist(plist);

      expect(result.NSHighResolutionCapable).toBe(true);
    });

    it('should return empty object for invalid XML', () => {
      const result = parseInfoPlist('not valid xml');

      expect(result).toEqual({});
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle missing app bundle directory', async () => {
      const result = await validateMacOSAppBundle({
        fileExists: vi.fn().mockResolvedValue(false),
        isExecutable: vi.fn().mockResolvedValue(false),
        readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
      });

      expect(result.valid).toBe(false);
    });

    it('should handle permission denied errors', async () => {
      const result = await validateMacOSAppBundle({
        fileExists: vi.fn().mockResolvedValue(true),
        isExecutable: vi.fn().mockRejectedValue(new Error('EACCES')),
        readFile: vi.fn().mockResolvedValue(''),
      });

      expect(result.valid).toBe(false);
    });

    it('should handle paths with spaces', async () => {
      const mockFileExists = vi.fn().mockResolvedValue(true);

      await validateWindowsStartScript({
        fileExists: mockFileExists,
        readFile: vi.fn().mockResolvedValue(''),
        localAppDataPath: 'C:\\Users\\Test User\\AppData\\Local',
      });

      expect(mockFileExists).toHaveBeenCalledWith(
        'C:\\Users\\Test User\\AppData\\Local\\ngaj\\scripts\\ngaj-start.ps1'
      );
    });
  });
});
